import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Filter, Download, AlertTriangle, Eye, Clock, Play, X, Maximize } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import EventDetails from "@/components/EventDetails";
import { eventService, Event as EventType } from "@/services/api";
import { toast } from "sonner";

const Events = () => {
  const [events, setEvents] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    eventType: 'all',
    cameraId: 'all',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadEvents();
  }, [filters]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const eventsData = await eventService.getEvents({
        event_type: filters.eventType && filters.eventType !== 'all' ? filters.eventType : undefined,
        camera_id: filters.cameraId && filters.cameraId !== 'all' ? parseInt(filters.cameraId) : undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined
      });
      setEvents(eventsData);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      toast.error("Erro ao carregar eventos");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleViewImage = (event: EventType) => {
    if (event.image_path) {
      setSelectedEvent(event);
      setIsImageDialogOpen(true);
    } else {
      toast.error("Imagem não disponível para este evento");
    }
  };

  const handleWatchVideo = (event: EventType) => {
    if (event.video_path) {
      setSelectedEvent(event);
      setIsVideoDialogOpen(true);
    } else {
      toast.error("Vídeo não disponível para este evento");
    }
  };

  const handleDownload = async (event: EventType) => {
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

  const handleViewDetails = (event: EventType) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico de Eventos</h1>
          <p className="text-muted-foreground mt-1">Registro completo de todas as detecções</p>
        </div>
        <Button variant="outline" className="border-border">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-card border-border shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar eventos..." 
              className="pl-10 bg-background border-border"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <Select value={filters.eventType} onValueChange={(value) => setFilters({...filters, eventType: value === "all" ? "" : value})}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="intrusion">Invasão</SelectItem>
              <SelectItem value="movement">Movimento</SelectItem>
              <SelectItem value="alert">Alerta</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.cameraId} onValueChange={(value) => setFilters({...filters, cameraId: value === "all" ? "" : value})}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Câmera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="1">Câmera 1</SelectItem>
              <SelectItem value="2">Câmera 2</SelectItem>
              <SelectItem value="3">Câmera 3</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-border">
            <Calendar className="w-4 h-4 mr-2" />
            Período
          </Button>
        </div>
      </Card>

      {/* Events Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden bg-card border-border shadow-card">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                <div className="aspect-video bg-muted rounded-lg animate-pulse" />
                <div className="md:col-span-3 space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event, index) => (
            <Card key={event.id} className="overflow-hidden bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                {/* Image Preview */}
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative group">
                  {event.image_path ? (
                    <img 
                      src={event.image_path} 
                      alt={`Evento ${event.id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Eye className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {event.video_path && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded">
                      VÍDEO
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button 
                      size="sm" 
                      className="bg-gradient-primary shadow-glow"
                      onClick={() => handleViewDetails(event)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>

                {/* Event Info */}
                <div className="md:col-span-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(event.event_type) as any} className="flex items-center gap-1">
                          {getTypeIcon(event.event_type)}
                          {event.event_type === "intrusion" ? "INVASÃO" : event.event_type === "movement" ? "MOVIMENTO" : "ALERTA"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {event.camera?.name || `Câmera ${event.camera_id}`}
                    </h3>
                    <p className="text-muted-foreground">
                      {event.description || "Evento detectado"}
                    </p>
                    {event.confidence && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">
                          Confiança: {Math.round(event.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-border"
                      onClick={() => handleViewImage(event)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Imagem
                    </Button>
                    {event.video_path && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-border"
                        onClick={() => handleWatchVideo(event)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Assistir Vídeo
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDownload(event)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Timeline connector */}
              {index < events.length - 1 && (
                <div className="w-px h-4 bg-border ml-6 md:ml-0" />
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 bg-card border-border text-center">
          <Eye className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum evento encontrado</h3>
          <p className="text-muted-foreground">
            Não há eventos registrados no período selecionado.
          </p>
        </Card>
      )}

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="bg-card border-border max-w-4xl">
          <DialogHeader>
            <DialogTitle>Imagem do Evento</DialogTitle>
            <DialogDescription>
              {selectedEvent?.camera?.name} - {selectedEvent && new Date(selectedEvent.timestamp).toLocaleString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent?.image_path && (
            <div className="relative">
              <img 
                src={selectedEvent.image_path} 
                alt={`Evento ${selectedEvent.id}`}
                className="w-full h-auto rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setIsImageDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="bg-card border-border max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vídeo do Evento</DialogTitle>
            <DialogDescription>
              {selectedEvent?.camera?.name} - {selectedEvent && new Date(selectedEvent.timestamp).toLocaleString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent?.video_path && (
            <div className="relative">
              <video 
                src={selectedEvent.video_path} 
                controls
                className="w-full h-auto rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setIsVideoDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedEvent(null);
          }}
        />
      )}
      </div>
    </Layout>
  );
};

export default Events;
