import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, AlertTriangle, Activity, TrendingUp, Eye, Users, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { cameraService, eventService, apiUtils } from "@/services/api";
import { toast } from "sonner";

interface DashboardStats {
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  totalEvents: number;
  eventsToday: number;
  intrusionCount: number;
  movementCount: number;
  alertCount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCameras: 0,
    onlineCameras: 0,
    offlineCameras: 0,
    totalEvents: 0,
    eventsToday: 0,
    intrusionCount: 0,
    movementCount: 0,
    alertCount: 0,
  });
  const [cameras, setCameras] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar estatísticas das câmeras
      const cameraStats = await cameraService.getCameraStats();
      
      // Carregar estatísticas dos eventos
      const eventStats = await eventService.getEventStats();
      
      // Carregar câmeras
      const camerasData = await cameraService.getCameras();
      
      // Carregar eventos recentes
      const eventsData = await eventService.getRecentEvents(6);
      
      // Atualizar estado
      setStats({
        totalCameras: cameraStats.total_cameras,
        onlineCameras: cameraStats.online_cameras,
        offlineCameras: cameraStats.offline_cameras,
        totalEvents: eventStats.total_events,
        eventsToday: eventStats.events_today,
        intrusionCount: eventStats.intrusion_count,
        movementCount: eventStats.movement_count,
        alertCount: eventStats.alert_count,
      });
      
      setCameras(camerasData);
      setRecentEvents(eventsData);
      
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central de Monitoramento</h1>
          <p className="text-muted-foreground mt-1">Sistema Inteligente de Vigilância</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
          <Camera className="w-4 h-4 mr-2" />
          Nova Câmera
        </Button>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Câmeras Ativas</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.onlineCameras}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Camera className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{stats.totalCameras} total</span>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invasões Hoje</p>
                <p className="text-3xl font-bold text-warning mt-2">{stats.intrusionCount}</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <Activity className="w-4 h-4 mr-1" />
              <span>Requer atenção</span>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eventos Hoje</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.eventsToday}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <Eye className="w-6 h-6 text-accent" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{stats.totalEvents} total</span>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Movimentos</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.movementCount}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <Users className="w-6 h-6 text-success" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <Activity className="w-4 h-4 mr-1" />
              <span>Detecção ativa</span>
            </div>
          </Card>
        </div>
      )}

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden bg-card border-border shadow-card">
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </Card>
          ))
        ) : cameras.length > 0 ? (
          cameras.map((camera) => (
            <Card key={camera.id} className="overflow-hidden bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
              <div className="aspect-video bg-muted relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${
                    camera.status === 'online' 
                      ? 'bg-success text-success-foreground' 
                      : camera.status === 'offline'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-warning text-warning-foreground'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      camera.status === 'online' ? 'bg-success-foreground animate-pulse' : 'bg-current'
                    }`} />
                    {camera.status.toUpperCase()}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar ao Vivo
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">{camera.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{camera.location}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {camera.detection_enabled ? 'Detecção ativa' : 'Detecção inativa'}
                  </span>
                  <Button variant="ghost" size="sm">Configurar</Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma câmera encontrada</h3>
            <p className="text-muted-foreground mb-4">Adicione uma câmera para começar o monitoramento</p>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
              <Camera className="w-4 h-4 mr-2" />
              Adicionar Primeira Câmera
            </Button>
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
