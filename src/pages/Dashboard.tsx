import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, AlertTriangle, Activity, TrendingUp, Eye, Users, Loader2, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import { cameraService, eventService, apiUtils } from "@/services/api";
import { websocketService } from "@/services/websocket";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LiveStream from "@/components/LiveStream";
import WebcamSelector from "@/components/WebcamSelector";
import StreamTest from "@/components/StreamTest";
import DetectionMonitor from "@/components/DetectionMonitor";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddingCamera, setIsAddingCamera] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<any>(null);
  const [newCamera, setNewCamera] = useState({
    name: '',
    location: '',
    stream_url: '',
    zone: '',
    detection_enabled: true,
    sensitivity: 50,
    fps: 15,
    resolution: '640x480'
  });

  useEffect(() => {
    // Conectar WS para eventos em tempo real
    websocketService.connect({
      onIntrusionAlert: (data: any) => {
        // Atualizar estatísticas rapidamente
        setStats(prev => ({
          ...prev,
          intrusionCount: (prev.intrusionCount || 0) + 1,
          eventsToday: (prev.eventsToday || 0) + 1,
          totalEvents: (prev.totalEvents || 0) + 1,
        }));
        // Prepend no recentEvents se vier payload completo
        if ((data as any).event) {
          setRecentEvents(prev => [{
            id: (data as any).event.id,
            camera_id: (data as any).event.camera_id,
            event_type: (data as any).event.event_type,
            confidence: (data as any).event.confidence,
            description: (data as any).event.description,
            timestamp: (data as any).event.timestamp,
            image_path: (data as any).event.image_path
          }, ...prev].slice(0, 6));
        }
      }
    });

    let interval: any;

    const startPolling = () => {
      loadDashboardData();
      // Atualização menos agressiva: a cada 30s
      interval = setInterval(loadDashboardData, 30000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) {
          clearInterval(interval);
          interval = undefined;
        }
      } else {
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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
      toast.error("Erro ao carregar dados do dashboard. Verifique se o backend está rodando.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCamera = async () => {
    if (!newCamera.name || !newCamera.stream_url) {
      toast.error("Nome e URL do stream são obrigatórios");
      return;
    }

    try {
      setIsAddingCamera(true);
      const createdCamera = await cameraService.createCamera(newCamera);
      toast.success("Câmera adicionada com sucesso!");
      setIsAddDialogOpen(false);
      setNewCamera({
        name: '',
        location: '',
        stream_url: '',
        zone: '',
        detection_enabled: true,
        sensitivity: 50,
        fps: 15,
        resolution: '640x480'
      });
      loadDashboardData(); // Recarregar dados
    } catch (error) {
      console.error("Erro ao adicionar câmera:", error);
      toast.error("Erro ao adicionar câmera");
    } finally {
      setIsAddingCamera(false);
    }
  };

  const handleConfigureCamera = (camera: any) => {
    setSelectedCamera(camera);
    setIsConfigDialogOpen(true);
  };

  const handleConfigSave = (updatedCamera: any) => {
    setCameras(cameras.map(c => c.id === updatedCamera.id ? updatedCamera : c));
    setIsConfigDialogOpen(false);
    setSelectedCamera(null);
    toast.success('Configurações salvas com sucesso!');
  };

  const [configForm, setConfigForm] = useState({
    name: '',
    location: ''
  });

  // Atualizar form quando câmera for selecionada
  useEffect(() => {
    if (selectedCamera) {
      setConfigForm({
        name: selectedCamera.name || '',
        location: selectedCamera.location || ''
      });
    }
  }, [selectedCamera]);

  const handleWebcamSelect = (webcam: any) => {
    setNewCamera({
      ...newCamera,
      name: webcam.name,
      stream_url: webcam.stream_url,
      resolution: webcam.resolution
    });
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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Nova Câmera
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Câmera</DialogTitle>
              <DialogDescription>Configure os parâmetros da nova câmera</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="webcam" className="pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="webcam">Câmera do PC</TabsTrigger>
                <TabsTrigger value="ip">Câmera IP</TabsTrigger>
              </TabsList>
              
              <TabsContent value="webcam" className="space-y-4 mt-4">
                <WebcamSelector onSelect={handleWebcamSelect} />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Câmera</Label>
                    <Input 
                      placeholder="Ex: Câmera do PC" 
                      className="bg-background border-border"
                      value={newCamera.name}
                      onChange={(e) => setNewCamera({...newCamera, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Localização</Label>
                    <Input 
                      placeholder="Ex: Escritório" 
                      className="bg-background border-border"
                      value={newCamera.location}
                      onChange={(e) => setNewCamera({...newCamera, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Zona</Label>
                    <Select value={newCamera.zone} onValueChange={(value) => setNewCamera({...newCamera, zone: value})}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione a zona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">Zona A1</SelectItem>
                        <SelectItem value="A2">Zona A2</SelectItem>
                        <SelectItem value="B1">Zona B1</SelectItem>
                        <SelectItem value="B2">Zona B2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Label>Detecção Automática</Label>
                    <Switch 
                      checked={newCamera.detection_enabled}
                      onCheckedChange={(checked) => setNewCamera({...newCamera, detection_enabled: checked})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sensibilidade</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="100" 
                      value={newCamera.sensitivity}
                      onChange={(e) => setNewCamera({...newCamera, sensitivity: parseInt(e.target.value)})}
                      className="bg-background border-border"
                    />
                  </div>
                  <Button 
                    onClick={handleAddCamera} 
                    disabled={isAddingCamera || !newCamera.stream_url}
                    className="w-full bg-gradient-primary hover:opacity-90"
                  >
                    {isAddingCamera ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      'Adicionar Câmera'
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="ip" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Câmera</Label>
                    <Input 
                      placeholder="Ex: Câmera Entrada" 
                      className="bg-background border-border"
                      value={newCamera.name}
                      onChange={(e) => setNewCamera({...newCamera, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Localização</Label>
                    <Input 
                      placeholder="Ex: Setor A - Corredor 1" 
                      className="bg-background border-border"
                      value={newCamera.location}
                      onChange={(e) => setNewCamera({...newCamera, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Stream</Label>
                    <Input 
                      placeholder="rtsp://..." 
                      className="bg-background border-border"
                      value={newCamera.stream_url}
                      onChange={(e) => setNewCamera({...newCamera, stream_url: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Zona</Label>
                    <Select value={newCamera.zone} onValueChange={(value) => setNewCamera({...newCamera, zone: value})}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione a zona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">Zona A1</SelectItem>
                        <SelectItem value="A2">Zona A2</SelectItem>
                        <SelectItem value="B1">Zona B1</SelectItem>
                        <SelectItem value="B2">Zona B2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Label>Detecção Automática</Label>
                    <Switch 
                      checked={newCamera.detection_enabled}
                      onCheckedChange={(checked) => setNewCamera({...newCamera, detection_enabled: checked})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sensibilidade</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="100" 
                      value={newCamera.sensitivity}
                      onChange={(e) => setNewCamera({...newCamera, sensitivity: parseInt(e.target.value)})}
                      className="bg-background border-border"
                    />
                  </div>
                  <Button 
                    onClick={handleAddCamera} 
                    disabled={isAddingCamera}
                    className="w-full bg-gradient-primary hover:opacity-90"
                  >
                    {isAddingCamera ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      'Adicionar Câmera'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
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
            <div key={camera.id} className="space-y-4">
              <LiveStream 
                streamUrl={camera.stream_url} 
                cameraName={camera.name}
                cameraId={camera.id}
                detectionEnabled={camera.detection_enabled}
                onConfigure={() => handleConfigureCamera(camera)}
                className="w-full"
              />
              <div className="p-4 bg-card border border-border rounded-lg shadow-card">
                <h3 className="font-semibold text-foreground">{camera.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{camera.location}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {camera.detection_enabled ? 'Detecção ativa' : 'Detecção inativa'}
                  </span>
                  <Button variant="ghost" size="sm">Configurar</Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma câmera encontrada</h3>
            <p className="text-muted-foreground mb-4">Adicione uma câmera para começar o monitoramento</p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
                  <Camera className="w-4 h-4 mr-2" />
                  Adicionar Primeira Câmera
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        )}
      </div>

      {/* Stream Test */}
      {/* Detection Monitor - Temporariamente desabilitado */}
      {/* <div className="mt-8">
        <DetectionMonitor />
      </div> */}

      {/* Stream Test Component */}
      <div className="mt-8">
        <StreamTest />
      </div>

      {/* Camera Configuration Dialog */}
      {isConfigDialogOpen && selectedCamera && (
        <Dialog open={isConfigDialogOpen} onOpenChange={() => {
          setIsConfigDialogOpen(false);
          setSelectedCamera(null);
        }}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>✅ Configurar Câmera</DialogTitle>
              <DialogDescription>
                Configurações da câmera: {selectedCamera.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Câmera</label>
                <input 
                  type="text" 
                  value={configForm.name}
                  onChange={(e) => setConfigForm({...configForm, name: e.target.value})}
                  className="w-full p-2 border border-border rounded-md bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Localização</label>
                <input 
                  type="text" 
                  value={configForm.location}
                  onChange={(e) => setConfigForm({...configForm, location: e.target.value})}
                  className="w-full p-2 border border-border rounded-md bg-background"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsConfigDialogOpen(false);
                setSelectedCamera(null);
              }}>
                Fechar
              </Button>
              <Button onClick={async () => {
                try {
                  // Simular salvamento local (sem backend por enquanto)
                  const updatedCamera = {
                    ...selectedCamera,
                    name: configForm.name,
                    location: configForm.location
                  };
                  
                  // Salvando configurações localmente
                  
                  // Atualizar lista local
                  setCameras(cameras.map(c => c.id === updatedCamera.id ? updatedCamera : c));
                  
                  // Fechar modal
                  setIsConfigDialogOpen(false);
                  setSelectedCamera(null);
                  
                  toast.success('Configurações salvas com sucesso!');
                  
                } catch (error) {
                  console.error('Erro ao salvar configurações:', error);
                  toast.error('Erro ao salvar configurações');
                }
              }}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </Layout>
  );
};

export default Dashboard;
