import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Edit, Trash2, MapPin, Settings, Activity, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import LiveStream from "@/components/LiveStream";
import CameraConfig from "@/components/CameraConfig";
import WebcamSelector from "@/components/WebcamSelector";
import CameraTest from "@/components/CameraTest";
import CameraDebug from "@/components/CameraDebug";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cameraService, Camera as CameraType } from "@/services/api";

const Cameras = () => {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCamera, setIsAddingCamera] = useState(false);
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
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setIsLoading(true);
      const camerasData = await cameraService.getCameras();
      setCameras(camerasData);
    } catch (error) {
      console.error("Erro ao carregar câmeras:", error);
      toast.error("Erro ao carregar câmeras");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-success";
      case "offline":
        return "bg-destructive";
      case "maintenance":
        return "bg-warning";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "online":
        return "ONLINE";
      case "offline":
        return "OFFLINE";
      case "maintenance":
        return "MANUTENÇÃO";
      default:
        return "DESCONHECIDO";
    }
  };

  const handleAddCamera = async () => {
    if (!newCamera.name || !newCamera.stream_url) {
      toast.error("Nome e URL do stream são obrigatórios");
      return;
    }

    try {
      setIsAddingCamera(true);
      await cameraService.createCamera(newCamera);
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
      loadCameras();
    } catch (error) {
      console.error("Erro ao adicionar câmera:", error);
      toast.error("Erro ao adicionar câmera");
    } finally {
      setIsAddingCamera(false);
    }
  };

  const handleConfigureCamera = (camera: CameraType) => {
    setSelectedCamera(camera);
    setIsConfigDialogOpen(true);
  };

  const handleConfigSave = (updatedCamera: CameraType) => {
    setCameras(cameras.map(c => c.id === updatedCamera.id ? updatedCamera : c));
    setIsConfigDialogOpen(false);
    setSelectedCamera(null);
  };

  const handleDeleteCamera = async (cameraId: number) => {
    if (window.confirm("Tem certeza que deseja deletar esta câmera?")) {
      try {
        await cameraService.deleteCamera(cameraId);
        toast.success("Câmera deletada com sucesso!");
        loadCameras();
      } catch (error) {
        console.error("Erro ao deletar câmera:", error);
        toast.error("Erro ao deletar câmera");
      }
    }
  };

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
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Câmeras</h1>
          <p className="text-muted-foreground mt-1">Configure e monitore todas as câmeras do sistema</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Nova Câmera
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl">
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
                    {isAddingCamera ? "Adicionando..." : "Adicionar Câmera"}
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
                    {isAddingCamera ? "Adicionando..." : "Adicionar Câmera"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cameras Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden bg-card border-border shadow-card">
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : cameras.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <Card key={camera.id} className="overflow-hidden bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
              {/* Camera Preview */}
              <LiveStream 
                streamUrl={camera.stream_url} 
                cameraName={camera.name}
                cameraId={camera.id}
                className="w-full"
              />

              {/* Camera Info */}
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{camera.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        {camera.location}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-border">
                      {camera.zone}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className={`w-4 h-4 ${camera.detection_enabled ? "text-success" : "text-muted-foreground"}`} />
                    <span className="text-muted-foreground">
                      {camera.detection_enabled ? "Detecção ativa" : "Detecção inativa"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-border"
                    onClick={() => handleConfigureCamera(camera)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar
                  </Button>
                  <Button variant="outline" size="sm" className="border-border">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-border text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCamera(camera.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma câmera encontrada</h3>
          <p className="text-muted-foreground mb-4">Adicione uma câmera para começar o monitoramento</p>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeira Câmera
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      )}

      {/* Camera Configuration Dialog */}
      {selectedCamera && (
        <CameraConfig
          camera={selectedCamera}
          isOpen={isConfigDialogOpen}
          onClose={() => {
            setIsConfigDialogOpen(false);
            setSelectedCamera(null);
          }}
          onSave={handleConfigSave}
        />
      )}

      {/* Camera Test Components */}
      <div className="mt-8 space-y-6">
        <CameraDebug />
        <CameraTest />
      </div>
      </div>
    </Layout>
  );
};

export default Cameras;
