import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Play, Square } from 'lucide-react';
import { streamService } from '@/services/api';
import { toast } from 'sonner';

const StreamTest = () => {
  const [cameraId, setCameraId] = useState('1');
  const [streamUrl, setStreamUrl] = useState('webcam://0');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleStartStream = async () => {
    try {
      await streamService.startStream(parseInt(cameraId), streamUrl);
      setIsStreaming(true);
      toast.success('Stream iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao iniciar stream:', error);
      toast.error('Erro ao iniciar stream');
    }
  };

  const handleStopStream = async () => {
    try {
      await streamService.stopStream(parseInt(cameraId));
      setIsStreaming(false);
      toast.success('Stream parado com sucesso!');
    } catch (error) {
      console.error('Erro ao parar stream:', error);
      toast.error('Erro ao parar stream');
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Camera className="w-4 h-4" />
        Teste de Stream
      </h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>ID da Câmera</Label>
          <Input
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            placeholder="Ex: 1"
            className="bg-background border-border"
          />
        </div>
        
        <div className="space-y-2">
          <Label>URL do Stream</Label>
          <Input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="Ex: webcam://0 ou rtsp://..."
            className="bg-background border-border"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleStartStream}
            disabled={isStreaming}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Stream
          </Button>
          
          <Button
            onClick={handleStopStream}
            disabled={!isStreaming}
            variant="outline"
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-2" />
            Parar Stream
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p><strong>Exemplos de URLs:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>webcam://0 - Primeira câmera web</li>
            <li>webcam://1 - Segunda câmera web</li>
            <li>rtsp://192.168.1.100:554/stream1 - Câmera IP</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default StreamTest;
