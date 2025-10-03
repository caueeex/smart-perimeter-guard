import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const CameraDebug = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadDevices = async () => {
    try {
      addDebugInfo('Carregando dispositivos de mídia...');
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      addDebugInfo(`Encontrados ${videoDevices.length} dispositivos de vídeo`);
      
      if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
        addDebugInfo(`Dispositivo padrão: ${videoDevices[0].label || videoDevices[0].deviceId}`);
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
      addDebugInfo(`Erro ao carregar dispositivos: ${error}`);
      toast.error('Erro ao carregar dispositivos de câmera');
    }
  };

  const testCameraAccess = async () => {
    try {
      setError(null);
      addDebugInfo('Testando acesso à câmera...');

      // Verificar se getUserMedia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não está disponível');
      }

      addDebugInfo('getUserMedia disponível');

      // Tentar diferentes configurações
      const constraints = [
        { video: true },
        { video: { width: 640, height: 480 } },
        { video: { width: 320, height: 240 } },
        { video: { deviceId: selectedDevice } },
        { video: { deviceId: { ideal: selectedDevice } } }
      ];

      for (let i = 0; i < constraints.length; i++) {
        try {
          addDebugInfo(`Tentativa ${i + 1}: ${JSON.stringify(constraints[i])}`);
          const stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
          
          setIsStreaming(true);
          addDebugInfo(`✅ Sucesso com tentativa ${i + 1}`);
          toast.success('Câmera acessada com sucesso!');
          return;
        } catch (error: any) {
          addDebugInfo(`❌ Tentativa ${i + 1} falhou: ${error.name} - ${error.message}`);
        }
      }

      throw new Error('Todas as tentativas falharam');

    } catch (error: any) {
      console.error('Erro ao testar câmera:', error);
      setError(error.message);
      setIsStreaming(false);
      
      let errorMessage = 'Erro desconhecido';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permissão de câmera negada. Clique no ícone de câmera na barra de endereços e permita o acesso.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada. Verifique se a câmera está conectada.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera está sendo usada por outro aplicativo. Feche outros programas que usam a câmera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Configurações da câmera não são suportadas. Tentando configurações alternativas.';
      } else {
        errorMessage = error.message;
      }

      addDebugInfo(`❌ Erro final: ${errorMessage}`);
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setError(null);
    addDebugInfo('Câmera parada');
    toast.success('Câmera parada');
  };

  const clearDebugInfo = () => {
    setDebugInfo([]);
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Camera className="w-4 h-4" />
        Debug de Câmera
      </h3>
      
      <div className="space-y-4">
        {/* Informações do Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Informações do Sistema</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>User Agent:</strong> {navigator.userAgent}</p>
              <p><strong>Protocolo:</strong> {window.location.protocol}</p>
              <p><strong>Host:</strong> {window.location.host}</p>
              <p><strong>getUserMedia:</strong> {navigator.mediaDevices ? '✅ Disponível' : '❌ Não disponível'}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Dispositivos Encontrados</h4>
            <div className="text-sm text-muted-foreground">
              <p><strong>Total:</strong> {devices.length}</p>
              {devices.map((device, index) => (
                <p key={device.deviceId} className="text-xs">
                  {index + 1}. {device.label || `Dispositivo ${device.deviceId.slice(0, 8)}`}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Seleção de Dispositivo */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Dispositivo de Câmera:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full p-2 bg-background border border-border rounded-md"
            disabled={isStreaming}
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Câmera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Controles */}
        <div className="flex gap-2">
          <Button
            onClick={testCameraAccess}
            disabled={isStreaming}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Testar Câmera
          </Button>
          
          <Button
            onClick={stopCamera}
            disabled={!isStreaming}
            variant="outline"
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-2" />
            Parar Câmera
          </Button>
          
          <Button
            onClick={clearDebugInfo}
            variant="outline"
            size="sm"
          >
            Limpar Log
          </Button>
        </div>

        {/* Área de Vídeo */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {!isStreaming && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-2" />
                <p>Clique em "Testar Câmera" para diagnosticar</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          
          {isStreaming && (
            <div className="absolute top-2 right-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          )}
        </div>

        {/* Log de Debug */}
        <div className="space-y-2">
          <h4 className="font-medium">Log de Debug</h4>
          <div className="bg-black text-green-400 p-3 rounded-md text-xs font-mono max-h-40 overflow-y-auto">
            {debugInfo.length === 0 ? (
              <p className="text-gray-500">Nenhum log ainda...</p>
            ) : (
              debugInfo.map((info, index) => (
                <p key={index}>{info}</p>
              ))
            )}
          </div>
        </div>

        {/* Status */}
        <div className="text-sm text-muted-foreground">
          <p><strong>Status:</strong> {isStreaming ? '✅ Ativo' : '❌ Inativo'}</p>
          {error && <p><strong>Último Erro:</strong> {error}</p>}
        </div>
      </div>
    </Card>
  );
};

export default CameraDebug;
