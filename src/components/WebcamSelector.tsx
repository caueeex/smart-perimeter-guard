import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Play, Square, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { webcamService } from '@/services/api';
import { toast } from 'sonner';

interface WebcamDevice {
  index: number;
  name: string;
  resolution: string;
  fps: number;
  stream_url: string;
}

interface WebcamSelectorProps {
  onSelect: (webcam: WebcamDevice) => void;
  className?: string;
}

const WebcamSelector = ({ onSelect, className = '' }: WebcamSelectorProps) => {
  const [availableCameras, setAvailableCameras] = useState<WebcamDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testingCamera, setTestingCamera] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    loadAvailableCameras();
  }, []);

  const loadAvailableCameras = async () => {
    try {
      setIsLoading(true);
      const cameras = await webcamService.getAvailableCameras();
      setAvailableCameras(cameras);
    } catch (error) {
      console.error('Erro ao carregar câmeras:', error);
      toast.error('Erro ao carregar câmeras disponíveis. Verifique se o backend está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  const testCamera = async (cameraIndex: number) => {
    try {
      setTestingCamera(cameraIndex);
      const result = await webcamService.testCamera(cameraIndex);
      setTestResults(prev => ({ ...prev, [cameraIndex]: result.success }));
      toast.success(`Câmera ${cameraIndex} testada com sucesso!`);
    } catch (error) {
      console.error(`Erro ao testar câmera ${cameraIndex}:`, error);
      setTestResults(prev => ({ ...prev, [cameraIndex]: false }));
      toast.error(`Erro ao testar câmera ${cameraIndex}`);
    } finally {
      setTestingCamera(null);
    }
  };

  const handleSelectCamera = (webcam: WebcamDevice) => {
    onSelect(webcam);
    toast.success(`Câmera ${webcam.name} selecionada!`);
  };

  return (
    <Card className={`p-4 bg-background border-border ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Câmeras Disponíveis
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAvailableCameras}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Atualizar'
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando câmeras...</span>
          </div>
        ) : availableCameras.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableCameras.map((webcam) => (
              <Card
                key={webcam.index}
                className="p-3 bg-card border-border hover:shadow-glow transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{webcam.name}</span>
                      {testResults[webcam.index] === true && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          OK
                        </Badge>
                      )}
                      {testResults[webcam.index] === false && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Erro
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Resolução: {webcam.resolution}</div>
                      <div>FPS: {webcam.fps}</div>
                      <div>Índice: {webcam.index}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testCamera(webcam.index)}
                      disabled={testingCamera === webcam.index}
                    >
                      {testingCamera === webcam.index ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSelectCamera(webcam)}
                      disabled={testResults[webcam.index] === false}
                    >
                      Selecionar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h4 className="font-medium text-foreground mb-1">Nenhuma câmera encontrada</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Certifique-se de que sua câmera está conectada e não está sendo usada por outro aplicativo.
            </p>
            <Button onClick={loadAvailableCameras} variant="outline" size="sm">
              Tentar Novamente
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Dica:</strong> Teste a câmera antes de selecioná-la para garantir que está funcionando corretamente.
          Se não conseguir acessar sua câmera, verifique se ela não está sendo usada por outro aplicativo.
        </div>
      </div>
    </Card>
  );
};

export default WebcamSelector;
