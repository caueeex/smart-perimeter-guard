import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Edit, Trash2, MapPin, Settings, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Layout from "@/components/Layout";

interface CameraConfig {
  id: number;
  name: string;
  location: string;
  status: "online" | "offline" | "maintenance";
  detectionEnabled: boolean;
  zone: string;
}

const Cameras = () => {
  const [cameras, setCameras] = useState<CameraConfig[]>([
    { id: 1, name: "Câmera 1", location: "Entrada Principal", status: "online", detectionEnabled: true, zone: "A1" },
    { id: 2, name: "Câmera 2", location: "Recepção", status: "online", detectionEnabled: true, zone: "A1" },
    { id: 3, name: "Câmera 3", location: "Estacionamento", status: "online", detectionEnabled: false, zone: "B2" },
    { id: 4, name: "Câmera 4", location: "Corredor A", status: "maintenance", detectionEnabled: false, zone: "A2" },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

  const handleAddCamera = () => {
    toast.success("Câmera adicionada com sucesso!");
    setIsAddDialogOpen(false);
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
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Câmera</DialogTitle>
              <DialogDescription>Configure os parâmetros da nova câmera</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da Câmera</Label>
                <Input placeholder="Ex: Câmera Entrada" className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label>Localização</Label>
                <Input placeholder="Ex: Setor A - Corredor 1" className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label>URL do Stream</Label>
                <Input placeholder="rtsp://..." className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label>Zona</Label>
                <Select>
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
                <Switch defaultChecked />
              </div>
              <Button onClick={handleAddCamera} className="w-full bg-gradient-primary hover:opacity-90">
                Adicionar Câmera
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cameras Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((camera) => (
          <Card key={camera.id} className="overflow-hidden bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
            {/* Camera Preview */}
            <div className="aspect-video bg-muted relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-4 right-4 flex gap-2">
                <Badge className={`${getStatusColor(camera.status)} text-white flex items-center gap-1`}>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {getStatusLabel(camera.status)}
                </Badge>
              </div>
              <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-2">
                <Button size="sm" className="w-full bg-primary">
                  <Camera className="w-4 h-4 mr-2" />
                  Visualizar ao Vivo
                </Button>
              </div>
            </div>

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
                  <Activity className={`w-4 h-4 ${camera.detectionEnabled ? "text-success" : "text-muted-foreground"}`} />
                  <span className="text-muted-foreground">
                    {camera.detectionEnabled ? "Detecção ativa" : "Detecção inativa"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 border-border">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Button>
                <Button variant="outline" size="sm" className="border-border">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="border-border text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      </div>
    </Layout>
  );
};

export default Cameras;
