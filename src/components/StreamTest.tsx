import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, Play, Square, Video, Wifi, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { streamService, webcamService } from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const StreamTest = () => {
  const [streamUrl, setStreamUrl] = useState('webcam://0');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [streamMode, setStreamMode] = useState<'webcam' | 'rtsp'>('webcam');
  const [availableWebcams, setAvailableWebcams] = useState<any[]>([]);
  const [selectedWebcam, setSelectedWebcam] = useState<string>('0');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Carregar webcams disponíveis ao montar
  useEffect(() => {
    loadAvailableWebcams();
  }, []);

  const loadAvailableWebcams = async () => {
    try {
      // Primeiro, tentar detectar webcams diretamente do navegador
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Dispositivos de vídeo encontrados pelo navegador:', videoDevices);
      
      if (videoDevices.length > 0) {
        const webcams = videoDevices.map((device, index) => ({
          index: index,
          name: device.label || `Câmera ${index + 1}`,
          deviceId: device.deviceId
        }));
        setAvailableWebcams(webcams);
        console.log('✅ Webcams detectadas pelo navegador:', webcams);
      } else {
        // Fallback: criar lista padrão
        setAvailableWebcams([
          { index: 0, name: 'Câmera Padrão' },
          { index: 1, name: 'Câmera Secundária' }
        ]);
        console.log('⚠️ Nenhuma webcam detectada, usando lista padrão');
      }
    } catch (error) {
      console.error('Erro ao carregar webcams:', error);
      // Fallback: criar lista padrão
      setAvailableWebcams([
        { index: 0, name: 'Câmera Padrão' },
        { index: 1, name: 'Câmera Secundária' }
      ]);
    }
  };

  const handleTestWebcam = async () => {
    try {
      setIsTesting(true);
      setConnectionStatus('connecting');
      setErrorMessage('');

      // Parar stream anterior se existir
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      const cameraIndex = parseInt(selectedWebcam);
      
      // Verificar permissões primeiro
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('Permissão da câmera:', permissions.state);

      if (permissions.state === 'denied') {
        throw new Error('Permissão de câmera negada. Por favor, habilite nas configurações do navegador.');
      }

      // Listar dispositivos disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Dispositivos de vídeo encontrados:', videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('Nenhuma câmera encontrada no sistema');
      }

      // Tentar diferentes configurações de câmera
      let mediaStream: MediaStream | null = null;
      
      // Usar deviceId da webcam selecionada se disponível
      const selectedWebcamData = availableWebcams[cameraIndex];
      const deviceId = selectedWebcamData?.deviceId || videoDevices[cameraIndex]?.deviceId;
      
      const constraints = [
        // Tentativa 1: deviceId específico se disponível
        deviceId ? { video: { deviceId: { exact: deviceId } } } : null,
        // Tentativa 2: deviceId ideal
        deviceId ? { video: { deviceId: { ideal: deviceId } } } : null,
        // Tentativa 3: índice da câmera
        videoDevices[cameraIndex] ? { video: { deviceId: { ideal: videoDevices[cameraIndex].deviceId } } } : null,
        // Tentativa 4: câmera padrão
        { video: true },
        // Tentativa 5: configuração básica
        { video: { width: 640, height: 480 } }
      ].filter(Boolean);

      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(`Tentativa ${i + 1} com constraints:`, constraints[i]);
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints[i] as MediaStreamConstraints);
          console.log(`✅ Câmera inicializada com tentativa ${i + 1}`);
          break;
        } catch (error: any) {
          console.log(`❌ Tentativa ${i + 1} falhou:`, error.name, error.message);
          if (i === constraints.length - 1) {
            throw error;
          }
        }
      }

      if (!mediaStream) {
        throw new Error('Não foi possível acessar a câmera');
      }

      // Atualizar stream
      setStream(mediaStream);
      
      // Atualizar video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setIsStreaming(true);
      setConnectionStatus('connected');
      setStreamUrl(`webcam://${selectedWebcam}`);
      toast.success('Webcam conectada com sucesso!');

    } catch (error: any) {
      console.error('Erro ao testar webcam:', error);
      setConnectionStatus('error');
      const errorMsg = error.message || 'Erro ao acessar câmera';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestRTSP = async () => {
    try {
      setIsTesting(true);
      setConnectionStatus('connecting');
      setErrorMessage('');

      // Validar URL RTSP
      if (!streamUrl.startsWith('rtsp://') && !streamUrl.startsWith('http://')) {
        throw new Error('URL inválida. Use rtsp:// ou http://');
      }

      toast.info('Testando conexão RTSP...');
      
      // Tentar iniciar stream (usar ID temporário 999 para teste)
      await streamService.startStream(999, streamUrl);
      
      setIsStreaming(true);
      setConnectionStatus('connected');
      toast.success('Stream RTSP conectado com sucesso!');

    } catch (error: any) {
      console.error('Erro ao testar RTSP:', error);
      setConnectionStatus('error');
      const errorMsg = error.response?.data?.detail || error.message || 'Erro ao conectar com stream RTSP';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleStopStream = () => {
    // Parar webcam
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // Parar stream RTSP
    if (streamMode === 'rtsp') {
      streamService.stopStream(999).catch(console.error);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setConnectionStatus('idle');
    setErrorMessage('');
    toast.success('Stream parado com sucesso!');
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <Video className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Conectando...</Badge>;
      case 'connected':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Conectado</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Erro</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Desconectado</Badge>;
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Teste de Stream em Tempo Real
        </h3>
        {getStatusBadge()}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Configuração */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Stream</Label>
            <Select 
              value={streamMode} 
              onValueChange={(value: 'webcam' | 'rtsp') => {
                setStreamMode(value);
                if (value === 'webcam') {
                  setStreamUrl(`webcam://${selectedWebcam}`);
                } else {
                  setStreamUrl('rtsp://');
                }
              }}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webcam">Câmera Web (Local)</SelectItem>
                <SelectItem value="rtsp">Câmera IP (RTSP/HTTP)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {streamMode === 'webcam' ? (
            <div className="space-y-2">
              <Label>Selecione a Webcam</Label>
              <Select 
                value={selectedWebcam} 
                onValueChange={(value) => {
                  setSelectedWebcam(value);
                  setStreamUrl(`webcam://${value}`);
                }}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableWebcams.map((cam, index) => (
                    <SelectItem key={index} value={cam.index?.toString() || index.toString()}>
                      {cam.name || `Câmera ${index}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>URL do Stream RTSP/HTTP</Label>
              <Input
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="rtsp://admin:senha@192.168.1.100:554/stream1"
                className="bg-background border-border font-mono text-sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>URL Configurada</Label>
            <div className="p-3 bg-muted rounded-md font-mono text-sm text-muted-foreground break-all">
              {streamUrl || 'Nenhuma URL configurada'}
            </div>
          </div>

          <div className="flex gap-2">
            {!isStreaming ? (
              <Button
                onClick={streamMode === 'webcam' ? handleTestWebcam : handleTestRTSP}
                disabled={isTesting || !streamUrl}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {isTesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleStopStream}
                variant="outline"
                className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
              >
                <Square className="w-4 h-4 mr-2" />
                Parar Stream
              </Button>
            )}
          </div>

          {/* Status e mensagens */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                {connectionStatus === 'connecting' && 'Conectando ao stream...'}
                {connectionStatus === 'connected' && 'Stream ativo e funcionando'}
                {connectionStatus === 'error' && 'Erro na conexão'}
                {connectionStatus === 'idle' && 'Aguardando teste de conexão'}
              </span>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-500">
                  <p className="font-medium">Erro ao conectar:</p>
                  <p className="mt-1 opacity-90">{errorMessage}</p>
                </div>
              </div>
            )}

            {connectionStatus === 'connected' && (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-500">
                  <p className="font-medium">Conexão estabelecida!</p>
                  <p className="mt-1 opacity-90">Stream funcionando corretamente</p>
                </div>
              </div>
            )}
          </div>

          {/* Dicas */}
          <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/50 rounded-md">
            <p className="font-medium">💡 Dicas:</p>
            {streamMode === 'webcam' ? (
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Certifique-se de que a câmera não está sendo usada por outro aplicativo</li>
                <li>Permita o acesso à câmera quando solicitado pelo navegador</li>
                <li>Tente diferentes câmeras se a primeira não funcionar</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Formato: rtsp://usuario:senha@ip:porta/stream</li>
                <li>Exemplo: rtsp://admin:12345@192.168.1.100:554/stream1</li>
                <li>HTTP também é suportado: http://192.168.1.100:8080/video</li>
                <li>Verifique se a câmera está acessível na rede</li>
              </ul>
            )}
          </div>
        </div>

        {/* Painel de Visualização */}
        <div className="space-y-4">
          <div className="relative border border-border rounded-lg overflow-hidden bg-black aspect-video">
            {streamMode === 'webcam' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  src={`http://localhost:8000/api/v1/stream/999`}
                  alt="RTSP Stream"
                  className="w-full h-full object-contain"
                  onError={() => setConnectionStatus('error')}
                />
              </div>
            )}

            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nenhum stream ativo</p>
                  <p className="text-xs mt-1 opacity-70">Configure e teste uma conexão</p>
                </div>
              </div>
            )}

            {/* Indicador de status */}
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm ${
                isStreaming 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-gray-500/20 border border-gray-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`} />
                <span className="text-xs font-medium text-white">
                  {isStreaming ? 'AO VIVO' : 'OFF'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-muted-foreground text-xs mb-1">Modo</p>
              <p className="font-medium">{streamMode === 'webcam' ? 'Câmera Web' : 'RTSP/HTTP'}</p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-muted-foreground text-xs mb-1">Status</p>
              <p className="font-medium capitalize">{connectionStatus === 'idle' ? 'Inativo' : connectionStatus === 'connecting' ? 'Conectando' : connectionStatus === 'connected' ? 'Conectado' : 'Erro'}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StreamTest;
