import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  X, 
  Calendar, 
  Camera, 
  MapPin, 
  AlertTriangle, 
  Eye, 
  Clock,
  Download,
  Play,
  Maximize,
  Activity,
  Target,
  BarChart3
} from 'lucide-react';
import { Event } from '@/services/api';
import { toast } from 'sonner';

interface EventDetailsProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

const EventDetails = ({ event, isOpen, onClose }: EventDetailsProps) => {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "intrusion":
        return "destructive";
      case "movement":
        return "default";
      case "alert":
        return "secondary";
      default:
        return "default";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "intrusion":
        return <AlertTriangle className="w-4 h-4" />;
      case "movement":
        return <Eye className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "intrusion":
        return "INVASÃO";
      case "movement":
        return "MOVIMENTO";
      case "alert":
        return "ALERTA";
      default:
        return "EVENTO";
    }
  };

  const handleDownload = async () => {
    try {
      if (event.image_path) {
        const response = await fetch(event.image_path);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event_${event.id}_image.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Imagem baixada com sucesso!");
      } else if (event.video_path) {
        const response = await fetch(event.video_path);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event_${event.id}_video.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Vídeo baixado com sucesso!");
      } else {
        toast.error("Nenhum arquivo disponível para download");
      }
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR'),
      full: date.toLocaleString('pt-BR')
    };
  };

  const formatConfidence = (confidence: number) => {
    return Math.round(confidence * 100);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTypeIcon(event.event_type)}
              Detalhes do Evento #{event.id}
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre o evento detectado
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* Left Panel - Event Info */}
            <div className="space-y-6">
              {/* Basic Info */}
              <Card className="p-4 bg-background border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Informações Básicas
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={getTypeColor(event.event_type) as any} className="flex items-center gap-1">
                      {getTypeIcon(event.event_type)}
                      {getTypeLabel(event.event_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Data:</span>
                    <span className="text-foreground">{formatDate(event.timestamp).date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Hora:</span>
                    <span className="text-foreground">{formatDate(event.timestamp).time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Câmera:</span>
                    <span className="text-foreground">
                      {event.camera?.name || `Câmera ${event.camera_id}`}
                    </span>
                  </div>
                  {event.camera?.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Local:</span>
                      <span className="text-foreground">{event.camera.location}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Detection Info */}
              <Card className="p-4 bg-background border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Detecção
                </h3>
                <div className="space-y-3">
                  {event.confidence && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Confiança:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${formatConfidence(event.confidence)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{formatConfidence(event.confidence)}%</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Processado:</span>
                    <Badge variant={event.is_processed ? "default" : "secondary"}>
                      {event.is_processed ? "Sim" : "Não"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Notificado:</span>
                    <Badge variant={event.is_notified ? "default" : "secondary"}>
                      {event.is_notified ? "Sim" : "Não"}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Description */}
              {event.description && (
                <Card className="p-4 bg-background border-border">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Descrição
                  </h3>
                  <p className="text-muted-foreground text-sm">{event.description}</p>
                </Card>
              )}

              {/* Actions */}
              <Card className="p-4 bg-background border-border">
                <h3 className="font-semibold text-foreground mb-4">Ações</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  {event.video_path && (
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Reproduzir Vídeo
                    </Button>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Panel - Media */}
            <div className="space-y-6">
              {/* Image */}
              {event.image_path && (
                <Card className="p-4 bg-background border-border">
                  <h3 className="font-semibold text-foreground mb-4">Imagem Capturada</h3>
                  <div className="relative">
                    <img 
                      src={event.image_path} 
                      alt={`Evento ${event.id}`}
                      className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setIsImageFullscreen(true)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setIsImageFullscreen(true)}
                    >
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* Video */}
              {event.video_path && (
                <Card className="p-4 bg-background border-border">
                  <h3 className="font-semibold text-foreground mb-4">Vídeo Capturado</h3>
                  <video 
                    src={event.video_path} 
                    controls
                    className="w-full h-auto rounded-lg"
                  />
                </Card>
              )}

              {/* Detection Data */}
              {event.detected_objects && event.detected_objects.length > 0 && (
                <Card className="p-4 bg-background border-border">
                  <h3 className="font-semibold text-foreground mb-4">Objetos Detectados</h3>
                  <div className="space-y-2">
                    {event.detected_objects.map((obj: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{obj.class || `Objeto ${index + 1}`}</span>
                        <span className="text-muted-foreground">
                          {obj.confidence ? `${Math.round(obj.confidence * 100)}%` : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Dialog */}
      <Dialog open={isImageFullscreen} onOpenChange={setIsImageFullscreen}>
        <DialogContent className="bg-card border-border max-w-6xl">
          <DialogHeader>
            <DialogTitle>Imagem do Evento #{event.id}</DialogTitle>
            <DialogDescription>
              {event.camera?.name} - {formatDate(event.timestamp).full}
            </DialogDescription>
          </DialogHeader>
          {event.image_path && (
            <div className="relative">
              <img 
                src={event.image_path} 
                alt={`Evento ${event.id}`}
                className="w-full h-auto rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setIsImageFullscreen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventDetails;
