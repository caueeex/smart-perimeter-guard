import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { streamService } from '@/services/api';

interface LiveStreamProps {
  streamUrl: string;
  cameraName: string;
  cameraId?: number;
  className?: string;
}

const LiveStream = ({ streamUrl, cameraName, cameraId, className = '' }: LiveStreamProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streamStarted, setStreamStarted] = useState(false);
  const [frameInterval, setFrameInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeStream = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (streamUrl.startsWith('webcam://')) {
          // Câmera web - usar getUserMedia
          const video = videoRef.current;
          if (!video) return;

          const cameraIndex = parseInt(streamUrl.split('://')[1]);
          
          // Tentar diferentes configurações de câmera
          let mediaStream;
          const constraints = [
            // Tentativa 1: deviceId específico
            { video: { deviceId: { exact: cameraIndex.toString() } } },
            // Tentativa 2: deviceId ideal
            { video: { deviceId: { ideal: cameraIndex.toString() } } },
            // Tentativa 3: apenas índice
            { video: { deviceId: cameraIndex.toString() } },
            // Tentativa 4: câmera padrão
            { video: true },
            // Tentativa 5: configuração básica
            { video: { width: 640, height: 480 } }
          ];

          for (let i = 0; i < constraints.length; i++) {
            try {
              console.log(`Tentativa ${i + 1} com constraints:`, constraints[i]);
              mediaStream = await navigator.mediaDevices.getUserMedia(constraints[i]);
              console.log(`✅ Câmera inicializada com tentativa ${i + 1}`);
              break;
            } catch (error) {
              console.log(`❌ Tentativa ${i + 1} falhou:`, error.name, error.message);
              if (i === constraints.length - 1) {
                throw error;
              }
            }
          }
          
          setStream(mediaStream);
          video.srcObject = mediaStream;
          setIsLoading(false);
          setIsPlaying(true);
        } else if (cameraId && !streamUrl.startsWith('webcam://')) {
          // Câmera IP/RTSP - usar stream service
          try {
            await streamService.startStream(cameraId, streamUrl);
            setStreamStarted(true);
            setIsLoading(false);
            setIsPlaying(true);
            
            // Iniciar polling de frames
            const interval = setInterval(async () => {
              try {
                const frameData = await streamService.getFrame(cameraId);
                const img = imgRef.current;
                if (img && frameData.frame) {
                  img.src = `data:image/jpeg;base64,${frameData.frame}`;
                }
              } catch (error) {
                console.error('Erro ao obter frame:', error);
                // Não mostrar erro para cada frame, apenas log
              }
            }, 200); // 5 FPS para reduzir carga
            
            setFrameInterval(interval);
          } catch (streamError) {
            console.error('Erro ao iniciar stream:', streamError);
            setError('Erro ao conectar com a câmera');
            setIsLoading(false);
            setIsPlaying(false);
          }
        } else {
          setError('ID da câmera não fornecido para stream RTSP');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erro ao inicializar stream:', err);
        setIsLoading(false);
        setIsPlaying(false);
        setError('Erro ao acessar câmera');
        toast.error(`Erro ao conectar com ${cameraName}`);
      }
    };

    initializeStream();

    return () => {
      // Limpar stream da webcam
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Parar stream RTSP
      if (streamStarted && cameraId) {
        streamService.stopStream(cameraId);
        setStreamStarted(false);
      }
      
      // Limpar intervalo de frames
      if (frameInterval) {
        clearInterval(frameInterval);
        setFrameInterval(null);
      }
    };
  }, [streamUrl, cameraName, cameraId]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {
        setError('Erro ao reproduzir stream');
        toast.error(`Erro ao reproduzir ${cameraName}`);
      });
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        toast.error('Erro ao entrar em tela cheia');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        toast.error('Erro ao sair da tela cheia');
      });
    }
  };

  const handleSettings = () => {
    toast.info('Configurações da câmera em desenvolvimento');
  };

  return (
    <Card className={`overflow-hidden bg-card border-border shadow-card hover:shadow-glow transition-all duration-300 ${className}`}>
      <div className="aspect-video bg-black relative group">
        {/* Video/Image Element */}
        {streamUrl.startsWith('webcam://') ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted={isMuted}
            playsInline
            autoPlay
          />
        ) : (
          <img
            ref={imgRef}
            className="w-full h-full object-cover"
            alt={`Stream ${cameraName}`}
          />
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Conectando...</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-red-400 mb-2">⚠️</div>
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-white border-white hover:bg-white hover:text-black"
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSettings}
                className="text-white hover:bg-white/20"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Camera Name Overlay */}
        <div className="absolute top-4 left-4">
          <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-1">
            <p className="text-white text-sm font-medium">{cameraName}</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-4 right-4">
          <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </div>
      </div>
    </Card>
  );
};

export default LiveStream;
