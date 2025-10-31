import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Save, 
  X, 
  Settings, 
  Activity,
  Camera as CameraIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { cameraService, detectionService, Camera } from '@/services/api';

interface CameraConfigSimpleProps {
  camera: Camera;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCamera: Camera) => void;
}

const CameraConfigSimple = ({ camera, isOpen, onClose, onSave }: CameraConfigSimpleProps) => {
  console.log('🚀 CameraConfigSimple renderizado:', { camera: camera?.name, isOpen });
  
  const [config, setConfig] = useState({
    name: camera.name,
    location: camera.location || '',
    zone: camera.zone || '',
    detection_enabled: camera.detection_enabled,
    sensitivity: camera.sensitivity || 50,
    fps: camera.fps || 15,
    resolution: camera.resolution || '640x480'
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log('Salvando configurações:', config);
      
      // Update camera basic info
      const updatedCamera = await cameraService.updateCamera(camera.id, config);
      
      toast.success('Configurações salvas com sucesso!');
      onSave(updatedCamera);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Câmera: {camera.name}
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros básicos da câmera
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Configurações Básicas */}
          <Card className="p-4 bg-background border-border">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <CameraIcon className="w-4 h-4" />
              Configurações Básicas
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Câmera</Label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig({...config, name: e.target.value})}
                  className="bg-background border-border"
                  placeholder="Nome da câmera"
                />
              </div>
              <div className="space-y-2">
                <Label>Localização</Label>
                <Input
                  value={config.location}
                  onChange={(e) => setConfig({...config, location: e.target.value})}
                  className="bg-background border-border"
                  placeholder="Local da câmera"
                />
              </div>
              <div className="space-y-2">
                <Label>Zona</Label>
                <Select value={config.zone} onValueChange={(value) => setConfig({...config, zone: value})}>
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
              <div className="flex items-center justify-between">
                <Label>Detecção Automática</Label>
                <Switch
                  checked={config.detection_enabled}
                  onCheckedChange={(checked) => setConfig({...config, detection_enabled: checked})}
                />
              </div>
            </div>
          </Card>

          {/* Parâmetros de Detecção */}
          <Card className="p-4 bg-background border-border">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Parâmetros de Detecção
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sensibilidade: {config.sensitivity}%</Label>
                <Slider
                  value={[config.sensitivity]}
                  onValueChange={(value) => setConfig({...config, sensitivity: value[0]})}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>FPS</Label>
                <Select value={config.fps.toString()} onValueChange={(value) => setConfig({...config, fps: parseInt(value)})}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 FPS</SelectItem>
                    <SelectItem value="30">30 FPS</SelectItem>
                    <SelectItem value="60">60 FPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resolução</Label>
                <Select value={config.resolution} onValueChange={(value) => setConfig({...config, resolution: value})}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="640x480">640x480</SelectItem>
                    <SelectItem value="1280x720">1280x720</SelectItem>
                    <SelectItem value="1920x1080">1920x1080</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Informações da Câmera */}
          <Card className="p-4 bg-background border-border">
            <h3 className="font-semibold text-foreground mb-4">Informações da Câmera</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">URL do Stream:</span>
                <span className="font-mono text-xs break-all">{camera.stream_url}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${
                  camera.status === 'online' ? 'text-green-500' : 
                  camera.status === 'offline' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  {camera.status?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{camera.id}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraConfigSimple;
