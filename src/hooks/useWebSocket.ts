/**
 * Hook para gerenciar conexão WebSocket
 */
import { useEffect, useRef } from 'react';
import { websocketService, WebSocketCallbacks } from '@/services/websocket';

export const useWebSocket = (callbacks: WebSocketCallbacks = {}) => {
  const callbacksRef = useRef(callbacks);

  // Atualizar referência dos callbacks
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    // Conectar ao WebSocket
    websocketService.connect({
      onIntrusionAlert: (data) => {
        if (callbacksRef.current.onIntrusionAlert) {
          callbacksRef.current.onIntrusionAlert(data);
        }
      },
      onSystemNotification: (data) => {
        if (callbacksRef.current.onSystemNotification) {
          callbacksRef.current.onSystemNotification(data);
        }
      },
      onConnection: (data) => {
        if (callbacksRef.current.onConnection) {
          callbacksRef.current.onConnection(data);
        }
      },
      onError: (error) => {
        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(error);
        }
      },
      onClose: (event) => {
        if (callbacksRef.current.onClose) {
          callbacksRef.current.onClose(event);
        }
      }
    });

    // Cleanup na desmontagem
    return () => {
      websocketService.disconnect();
    };
  }, []);

  return {
    isConnected: websocketService.isConnected(),
    connectionState: websocketService.getConnectionState(),
    send: (message: any) => websocketService.send(message),
    disconnect: () => websocketService.disconnect(),
    connect: () => websocketService.connect(callbacks)
  };
};

