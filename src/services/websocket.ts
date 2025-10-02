/**
 * Serviço WebSocket para notificações em tempo real
 */
import { toast } from 'sonner';

export interface WebSocketMessage {
  type: string;
  message?: string;
  timestamp: string;
  camera_id?: number;
  event_id?: number;
  detections?: any[];
  notification_type?: string;
}

export interface WebSocketCallbacks {
  onIntrusionAlert?: (data: WebSocketMessage) => void;
  onSystemNotification?: (data: WebSocketMessage) => void;
  onConnection?: (data: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnecting = false;

  constructor() {
    this.url = import.meta.env.VITE_WS_URL || 'ws://localhost:8001';
  }

  /**
   * Conectar ao WebSocket
   */
  connect(callbacks: WebSocketCallbacks = {}): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.callbacks = callbacks;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = (event) => {
        console.log('WebSocket conectado');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Enviar ping para manter conexão viva
        this.sendPing();
        
        if (this.callbacks.onConnection) {
          this.callbacks.onConnection({
            type: 'connection',
            message: 'Conectado ao SecureVision',
            timestamp: new Date().toISOString()
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        this.isConnecting = false;
        
        if (this.callbacks.onError) {
          this.callbacks.onError(error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket desconectado:', event.code, event.reason);
        this.isConnecting = false;
        
        if (this.callbacks.onClose) {
          this.callbacks.onClose(event);
        }

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Desconectar do WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Impedir reconexão
  }

  /**
   * Enviar mensagem
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket não está conectado');
    }
  }

  /**
   * Enviar ping
   */
  sendPing(): void {
    this.send({ type: 'ping' });
  }

  /**
   * Inscrever-se em notificações
   */
  subscribe(): void {
    this.send({ type: 'subscribe' });
  }

  /**
   * Processar mensagem recebida
   */
  private handleMessage(data: WebSocketMessage): void {
    switch (data.type) {
      case 'intrusion_alert':
        this.handleIntrusionAlert(data);
        break;
      
      case 'system_notification':
        this.handleSystemNotification(data);
        break;
      
      case 'pong':
        // Resposta ao ping - agendar próximo ping
        setTimeout(() => this.sendPing(), 30000);
        break;
      
      case 'connection':
        console.log('Confirmação de conexão:', data.message);
        break;
      
      default:
        console.log('Mensagem WebSocket não tratada:', data);
    }
  }

  /**
   * Processar alerta de invasão
   */
  private handleIntrusionAlert(data: WebSocketMessage): void {
    console.log('Alerta de invasão:', data);
    
    // Mostrar toast de alerta
    toast.error(`🚨 Invasão detectada na câmera ${data.camera_id}`, {
      description: data.message,
      duration: 10000,
      action: {
        label: 'Ver detalhes',
        onClick: () => {
          // Navegar para página de eventos
          window.location.href = '/events';
        }
      }
    });

    // Reproduzir som de alerta (opcional)
    this.playAlertSound();

    // Chamar callback se definido
    if (this.callbacks.onIntrusionAlert) {
      this.callbacks.onIntrusionAlert(data);
    }
  }

  /**
   * Processar notificação do sistema
   */
  private handleSystemNotification(data: WebSocketMessage): void {
    console.log('Notificação do sistema:', data);
    
    // Mostrar toast baseado no tipo
    const notificationType = data.notification_type || 'info';
    
    switch (notificationType) {
      case 'success':
        toast.success(data.message || 'Operação realizada com sucesso');
        break;
      case 'warning':
        toast.warning(data.message || 'Atenção necessária');
        break;
      case 'error':
        toast.error(data.message || 'Erro no sistema');
        break;
      default:
        toast.info(data.message || 'Notificação do sistema');
    }

    // Chamar callback se definido
    if (this.callbacks.onSystemNotification) {
      this.callbacks.onSystemNotification(data);
    }
  }

  /**
   * Reproduzir som de alerta
   */
  private playAlertSound(): void {
    try {
      // Criar e reproduzir som de alerta
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Não foi possível reproduzir som de alerta:', error);
    }
  }

  /**
   * Tentar reconectar
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      this.connect(this.callbacks);
    }, this.reconnectInterval);
  }

  /**
   * Verificar se está conectado
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Obter estado da conexão
   */
  getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
}

// Instância singleton
export const websocketService = new WebSocketService();

// Hook para React
export const useWebSocket = (callbacks: WebSocketCallbacks = {}) => {
  const connect = () => websocketService.connect(callbacks);
  const disconnect = () => websocketService.disconnect();
  const send = (message: any) => websocketService.send(message);
  const isConnected = () => websocketService.isConnected();
  const getConnectionState = () => websocketService.getConnectionState();

  return {
    connect,
    disconnect,
    send,
    isConnected,
    getConnectionState
  };
};

export default websocketService;

