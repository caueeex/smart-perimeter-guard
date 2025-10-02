import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Filter, Download, AlertTriangle, Eye, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";

interface Event {
  id: number;
  timestamp: string;
  camera: string;
  type: "intrusion" | "movement" | "alert";
  description: string;
  image: string;
  hasVideo: boolean;
}

const Events = () => {
  const [events] = useState<Event[]>([
    {
      id: 1,
      timestamp: "2025-10-02 14:32:15",
      camera: "Câmera 1 - Entrada Principal",
      type: "intrusion",
      description: "Invasão detectada - linha de segurança cruzada",
      image: "/placeholder.svg",
      hasVideo: true,
    },
    {
      id: 2,
      timestamp: "2025-10-02 13:15:42",
      camera: "Câmera 3 - Estacionamento",
      type: "movement",
      description: "Movimento detectado na zona monitorada",
      image: "/placeholder.svg",
      hasVideo: true,
    },
    {
      id: 3,
      timestamp: "2025-10-02 12:08:33",
      camera: "Câmera 5 - Corredor A",
      type: "alert",
      description: "Objeto não identificado detectado",
      image: "/placeholder.svg",
      hasVideo: false,
    },
  ]);

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
            <Input placeholder="Buscar eventos..." className="pl-10 bg-background border-border" />
          </div>
          <Select>
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
          <Select>
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
      <div className="space-y-4">
        {events.map((event, index) => (
          <Card key={event.id} className="overflow-hidden bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
              {/* Image Preview */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {event.hasVideo && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded">
                    VÍDEO
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button size="sm" className="bg-gradient-primary shadow-glow">
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
                      <Badge variant={getTypeColor(event.type) as any} className="flex items-center gap-1">
                        {getTypeIcon(event.type)}
                        {event.type === "intrusion" ? "INVASÃO" : event.type === "movement" ? "MOVIMENTO" : "ALERTA"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{event.timestamp}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{event.camera}</h3>
                  <p className="text-muted-foreground">{event.description}</p>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button variant="outline" size="sm" className="border-border">
                    Ver Imagem
                  </Button>
                  {event.hasVideo && (
                    <Button variant="outline" size="sm" className="border-border">
                      Assistir Vídeo
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
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
      </div>
    </Layout>
  );
};

export default Events;
