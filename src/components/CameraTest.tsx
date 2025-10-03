import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Play, Square, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const CameraTest = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
      toast.error('Erro ao carregar dispositivos de câmera');
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setIsStreaming(true);

      const constraints = selectedDevice 
        ? { video: { deviceId: { exact: selectedDevice } } }
        : { video: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        toast.success('Câmera iniciada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao iniciar câmera:', error);
      setError(error.message);
      setIsStreaming(false);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Permissão de câmera negada. Permita o acesso e tente novamente.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Nenhuma câmera encontrada.');
      } else {
        toast.error(`Erro ao acessar câmera: ${error.message}`);
      }
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
    toast.success('Câmera parada');
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Camera className="w-4 h-4" />
        Teste de Câmera Direto
      </h3>
      
      <div className="space-y-4">
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
            onClick={startCamera}
            disabled={isStreaming}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Câmera
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
                <p>Clique em "Iniciar Câmera" para testar</p>
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
        </div>

        {/* Informações */}
        <div className="text-sm text-muted-foreground">
          <p><strong>Dispositivos encontrados:</strong> {devices.length}</p>
          <p><strong>Status:</strong> {isStreaming ? 'Ativo' : 'Inativo'}</p>
          {error && <p><strong>Erro:</strong> {error}</p>}
        </div>
      </div>
    </Card>
  );
};

export default CameraTest;
