import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Edit, Trash2, MapPin, Settings, Activity, Eye, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import LiveStream from "@/components/LiveStream";
import CameraConfigSimple from "@/components/CameraConfigSimple";
import WebcamSelector from "@/components/WebcamSelector";
import StreamTest from "@/components/StreamTest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cameraService, Camera as CameraType } from "@/services/api";

const Cameras = () => {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
  // Desenho de área
  const [areaPoints, setAreaPoints] = useState<{x:number;y:number}[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{width: number; height: number} | null>(null);
  const [videoContainerRect, setVideoContainerRect] = useState<{left: number; top: number; width: number; height: number} | null>(null);
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

  // Atualizar dimensões do container do vídeo quando o overlay for renderizado
  useEffect(() => {
    if (isConfigDialogOpen && overlayRef.current) {
      const updateContainerRect = () => {
        const cardElement = overlayRef.current?.querySelector('[class*="aspect-video"]');
        if (cardElement && overlayRef.current) {
          const cardRect = cardElement.getBoundingClientRect();
          const overlayRect = overlayRef.current.getBoundingClientRect();
          
          setVideoContainerRect({
            left: cardRect.left - overlayRect.left,
            top: cardRect.top - overlayRect.top,
            width: cardRect.width,
            height: cardRect.height
          });
        }
      };
      
      // Atualizar imediatamente e após um delay
      updateContainerRect();
      const timeout = setTimeout(updateContainerRect, 100);
      const interval = setInterval(updateContainerRect, 500);
      
      // Atualizar quando a janela for redimensionada
      window.addEventListener('resize', updateContainerRect);
      
      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
        window.removeEventListener('resize', updateContainerRect);
      };
    }
  }, [isConfigDialogOpen, selectedCamera]);

  // Log quando selectedCamera ou areaPoints mudarem para debug
  useEffect(() => {
    if (isConfigDialogOpen && selectedCamera) {
      console.log('🔍 Estado atual:', {
        selectedCameraId: selectedCamera.id,
        detectionZone: (selectedCamera as any).detection_zone,
        areaPointsCount: areaPoints.length,
        isDrawing
      });
    }
  }, [isConfigDialogOpen, selectedCamera, areaPoints.length, isDrawing]);

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

  // Função para calcular área de um polígono (Shoelace formula)
  const calculatePolygonArea = (points: Array<{x: number; y: number}>): number => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  };

  // Validação de área mínima (mínimo 1000 pixels²)
  const MIN_AREA = 1000;
  const validateZoneArea = (points: Array<{x: number; y: number}>): { valid: boolean; area: number; message: string } => {
    const area = calculatePolygonArea(points);
    if (points.length < 3) {
      return { valid: false, area: 0, message: 'Mínimo 3 pontos necessários' };
    }
    if (area < MIN_AREA) {
      return { valid: false, area, message: `Área muito pequena (${Math.round(area)}px²). Mínimo: ${MIN_AREA}px²` };
    }
    return { valid: true, area, message: `Área válida: ${Math.round(area)}px²` };
  };

  const handleConfigureCamera = async (camera: CameraType) => {
    console.log('🔧 handleConfigureCamera chamado com câmera:', camera);
    
    // Buscar dados atualizados da câmera para garantir que temos a zona mais recente
    try {
      const freshCamera = await cameraService.getCamera(camera.id);
      console.log('📥 Câmera atualizada do servidor:', freshCamera);
      setSelectedCamera(freshCamera as any);
    } catch (error) {
      console.warn('⚠️ Erro ao buscar câmera atualizada, usando dados locais:', error);
      setSelectedCamera(camera);
    }
    
    setIsConfigDialogOpen(true);
    setAreaPoints([]);
    setIsDrawing(false);
    setVideoDimensions(null);
    setVideoContainerRect(null);
    // Os pontos serão carregados no onVideoLoad quando o container estiver disponível
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
                onConfigure={() => handleConfigureCamera(camera)}
                detectionZone={(camera as any).detection_zone || null}
                showZonePreview={true}
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-border">
                        {camera.zone}
                      </Badge>
                      {(camera as any).detection_zone && (camera as any).detection_zone.points && (
                        <Badge variant="default" className="bg-green-600 text-white">
                          Zona Configurada
                        </Badge>
                      )}
                    </div>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-border"
                    onClick={() => handleConfigureCamera(camera)}
                    title="Editar câmera"
                  >
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

      {/* Camera Configuration Dialog - Configurar Área */}
      {isConfigDialogOpen && selectedCamera && (
        <Dialog open={isConfigDialogOpen} onOpenChange={() => {
          console.log('🔧 Dialog onOpenChange chamado');
          setIsConfigDialogOpen(false);
          setSelectedCamera(null);
        }}>
          <DialogContent className="bg-card border-border max-w-3xl">
            <DialogHeader>
              <DialogTitle>Configurar Área de Detecção</DialogTitle>
              <DialogDescription>Clique no painel para marcar pontos do polígono. Clique em "Concluir" para fechar a área.</DialogDescription>
            </DialogHeader>
            
            <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative w-full select-none" style={{ position: 'relative' }}>
                  {/* Container que envolve o Card do LiveStream */}
                  <div className="relative w-full" ref={videoContainerRef} style={{ position: 'relative' }}>
                    {/* Preview da câmera - LiveStream com Card wrapper */}
                    <LiveStream 
                      streamUrl={selectedCamera.stream_url}
                      cameraName={selectedCamera.name}
                      cameraId={selectedCamera.id}
                      className="pointer-events-none w-full"
                      onVideoLoad={(video) => {
                        if (video) {
                          videoRef.current = video;
                          const width = video.videoWidth || video.clientWidth || 1280;
                          const height = video.videoHeight || video.clientHeight || 720;
                          setVideoDimensions({ width, height });
                          
                          // Aguardar um pouco para o overlay estar renderizado
                          setTimeout(async () => {
                            // Encontrar o container do vídeo e carregar zona existente se houver
                            const cardElement = overlayRef.current?.querySelector('[class*="aspect-video"]');
                            if (cardElement) {
                              const cardRect = cardElement.getBoundingClientRect();
                              
                              // Atualizar estado com dimensões do container
                              setVideoContainerRect({
                                left: cardRect.left - (overlayRef.current?.getBoundingClientRect()?.left || 0),
                                top: cardRect.top - (overlayRef.current?.getBoundingClientRect()?.top || 0),
                                width: cardRect.width,
                                height: cardRect.height
                              });
                              
                              // Carregar zona salva e ajustar para o tamanho do container atual
                              try {
                                // Usar selectedCamera primeiro, se não tiver zona, buscar do servidor
                                let zone = (selectedCamera as any)?.detection_zone;
                                
                                if (!zone || !zone.points) {
                                  console.log('🔍 Zona não encontrada em selectedCamera, buscando do servidor...');
                                  const fresh = await cameraService.getCamera(selectedCamera.id);
                                  zone = (fresh as any)?.detection_zone;
                                }
                                
                                console.log('📦 Zona encontrada:', zone);
                                
                                if (zone) {
                                  // Obter pontos da zona (suportar formato antigo e novo)
                                  let savedPoints: Array<{x: number; y: number}> = [];
                                  let savedRefW = 0;
                                  let savedRefH = 0;
                                  
                                  // Verificar se é string JSON (pode acontecer em alguns casos)
                                  if (typeof zone === 'string') {
                                    try {
                                      zone = JSON.parse(zone);
                                    } catch (e) {
                                      console.error('Erro ao fazer parse da zona:', e);
                                      zone = null;
                                    }
                                  }
                                  
                                  if (zone) {
                                    if (zone.zones && Array.isArray(zone.zones) && zone.zones.length > 0) {
                                      // Formato novo: múltiplas zonas - usar a primeira
                                      console.log('📋 Formato novo (múltiplas zonas) detectado');
                                      savedPoints = zone.zones[0].points || [];
                                      savedRefW = zone.ref_w || 0;
                                      savedRefH = zone.ref_h || 0;
                                    } else if (zone.points && Array.isArray(zone.points)) {
                                      // Formato antigo: zona única
                                      console.log('📋 Formato antigo (zona única) detectado');
                                      savedPoints = zone.points;
                                      savedRefW = zone.ref_w || 0;
                                      savedRefH = zone.ref_h || 0;
                                    }
                                    
                                    console.log('📊 Dados extraídos:', {
                                      pontos: savedPoints.length,
                                      ref_w: savedRefW,
                                      ref_h: savedRefH,
                                      pontosExemplo: savedPoints.slice(0, 2)
                                    });
                                    
                                    if (savedPoints.length > 0 && savedRefW > 0 && savedRefH > 0) {
                                      // Calcular escala: container atual / dimensões salvas
                                      const scaleX = cardRect.width / savedRefW;
                                      const scaleY = cardRect.height / savedRefH;
                                      
                                      // Ajustar pontos para o tamanho do container atual
                                      const adjustedPoints = savedPoints.map(p => ({
                                        x: Number(p.x) * scaleX,
                                        y: Number(p.y) * scaleY
                                      }));
                                      
                                      console.log('✅ Zona carregada e ajustada:', {
                                        pontosOriginais: savedPoints.length,
                                        pontosAjustados: adjustedPoints.length,
                                        escala: { scaleX, scaleY },
                                        container: { width: cardRect.width, height: cardRect.height },
                                        salvo: { ref_w: savedRefW, ref_h: savedRefH },
                                        primeirosPontosAjustados: adjustedPoints.slice(0, 2)
                                      });
                                      
                                      setAreaPoints(adjustedPoints);
                                      setIsDrawing(true);
                                    } else {
                                      console.warn('⚠️ Zona encontrada mas dados incompletos:', {
                                        pontos: savedPoints.length,
                                        ref_w: savedRefW,
                                        ref_h: savedRefH
                                      });
                                    }
                                  }
                                } else {
                                  console.log('ℹ️ Nenhuma zona configurada para esta câmera');
                                }
                              } catch (e) {
                                console.error('❌ Erro ao carregar zona existente:', e);
                              }
                            }
                          }, 300);
                        }
                      }}
                    />
                    {/* Overlay de desenho - posicionado sobre o Card do LiveStream */}
                    <div
                      ref={overlayRef}
                      className="absolute inset-0 cursor-crosshair"
                      style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999,
                        pointerEvents: 'auto',
                        backgroundColor: 'rgba(0,0,0,0.01)' // Quase transparente mas visível para debug
                      }}
                      onMouseDown={(e) => {
                        // Prevenir que outros elementos capturem o evento
                        e.stopPropagation();
                        console.log('🖱️ MouseDown no overlay');
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        console.log('🔵 Clique no overlay detectado!', {
                          draggedPointIndex,
                          isDrawing,
                          areaPointsLength: areaPoints.length
                        });
                        
                        if (draggedPointIndex !== null) {
                          console.log('⚠️ Ignorando clique - arrastando ponto');
                          return;
                        }
                        
                        if (!isDrawing && areaPoints.length === 0) {
                          console.log('✅ Iniciando desenho');
                          setIsDrawing(true);
                        }
                        
                        // Usar videoContainerRef se disponível, senão procurar o elemento
                        const container = videoContainerRef.current || overlayRef.current?.querySelector('[class*="aspect-video"]');
                        if (!container) {
                          console.error('❌ Container do vídeo não encontrado');
                          toast.error('Erro: Container do vídeo não encontrado. Tente recarregar a página.');
                          return;
                        }
                        
                        const containerRect = container.getBoundingClientRect();
                        const overlayRect = overlayRef.current?.getBoundingClientRect();
                        
                        if (!overlayRect) {
                          console.error('❌ Overlay rect não encontrado');
                          return;
                        }
                        
                        // Atualizar estado com dimensões do container
                        const videoRect = {
                          left: containerRect.left - overlayRect.left,
                          top: containerRect.top - overlayRect.top,
                          width: containerRect.width,
                          height: containerRect.height
                        };
                        setVideoContainerRect(videoRect);
                        
                        // Calcular coordenadas relativas ao container do vídeo
                        const x = e.clientX - containerRect.left;
                        const y = e.clientY - containerRect.top;
                        
                        // Garantir que as coordenadas estão dentro dos limites do container do vídeo
                        const boundedX = Math.max(0, Math.min(containerRect.width, x));
                        const boundedY = Math.max(0, Math.min(containerRect.height, y));
                        
                        console.log('📍 Adicionando ponto:', {
                          clientX: e.clientX,
                          clientY: e.clientY,
                          containerLeft: containerRect.left,
                          containerTop: containerRect.top,
                          containerWidth: containerRect.width,
                          containerHeight: containerRect.height,
                          boundedX,
                          boundedY,
                          videoRect
                        });
                        
                        setAreaPoints(prev => {
                          const newPoints = [...prev, { x: boundedX, y: boundedY }];
                          console.log('✅ Pontos atualizados:', newPoints);
                          return newPoints;
                        });
                      }}
                    onMouseMove={(e) => {
                      if (draggedPointIndex === null || !overlayRef.current) return;
                      
                      // Encontrar o container do vídeo dentro do Card
                      const cardElement = overlayRef.current?.querySelector('[class*="aspect-video"]');
                      if (!cardElement) return;
                      
                      const cardRect = cardElement.getBoundingClientRect();
                      
                      // Calcular coordenadas relativas ao container do vídeo
                      const x = Math.max(0, Math.min(cardRect.width, e.clientX - cardRect.left));
                      const y = Math.max(0, Math.min(cardRect.height, e.clientY - cardRect.top));
                      
                      // Atualizar ponto arrastado
                      const updatedPoints = [...areaPoints];
                      updatedPoints[draggedPointIndex] = { x, y };
                      setAreaPoints(updatedPoints);
                    }}
                    onMouseUp={() => {
                      setDraggedPointIndex(null);
                    }}
                    onMouseLeave={() => {
                      setDraggedPointIndex(null);
                    }}
                  >
                    <svg 
                      className="absolute pointer-events-none" 
                      style={{ 
                        position: 'absolute',
                        left: videoContainerRect ? `${videoContainerRect.left}px` : '0px',
                        top: videoContainerRect ? `${videoContainerRect.top}px` : '0px',
                        width: videoContainerRect ? `${videoContainerRect.width}px` : '100%',
                        height: videoContainerRect ? `${videoContainerRect.height}px` : '100%',
                        zIndex: 10,
                        pointerEvents: 'none'
                      }}
                      viewBox={videoContainerRect ? `0 0 ${videoContainerRect.width} ${videoContainerRect.height}` : undefined}
                      preserveAspectRatio="none"
                    >
                      {/* Renderizar zona única */}
                      {areaPoints.length >= 3 && (
                        <polygon
                          points={areaPoints.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="rgba(239,68,68,0.15)"
                          stroke="#ef4444"
                          strokeWidth={2}
                        />
                      )}
                      {areaPoints.length > 1 && areaPoints.length < 3 && (
                        <polyline
                          points={areaPoints.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={2}
                          strokeDasharray="5,5"
                        />
                      )}
                      {areaPoints.map((point, pointIdx) => {
                        const isHovered = hoveredPoint === pointIdx;
                        const isDragging = draggedPointIndex === pointIdx;
                        return (
                          <g
                            key={pointIdx}
                            style={{ pointerEvents: 'all', cursor: 'move' }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggedPointIndex(pointIdx);
                            }}
                            onMouseEnter={() => setHoveredPoint(pointIdx)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={isDragging || isHovered ? 8 : 6}
                              fill={isDragging ? "#ff6b6b" : "#ef4444"}
                              stroke="#fff"
                              strokeWidth={2}
                            />
                            <text
                              x={point.x}
                              y={point.y - 12}
                              textAnchor="middle"
                              fill="#fff"
                              fontSize="10"
                              fontWeight="bold"
                              style={{ pointerEvents: 'none' }}
                            >
                              {pointIdx + 1}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    {!isDrawing && areaPoints.length === 0 && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground bg-black/20 rounded-md pointer-events-none"
                        style={{ zIndex: 5 }}
                      >
                        Clique para marcar os pontos da área (mínimo 3 pontos)
                      </div>
                    )}
                    {/* Debug: mostrar informações */}
                    <div className="absolute top-2 left-2 bg-black/80 text-white text-xs p-2 rounded pointer-events-none" style={{ zIndex: 1000 }}>
                      <div>Pontos: {areaPoints.length}</div>
                      <div>Desenhando: {isDrawing ? 'Sim' : 'Não'}</div>
                      {videoContainerRect && (
                        <div>Container: {Math.round(videoContainerRect.width)}x{Math.round(videoContainerRect.height)}</div>
                      )}
                      {areaPoints.length > 0 && (
                        <div className="mt-1 text-green-400">
                          Último: ({Math.round(areaPoints[areaPoints.length - 1].x)}, {Math.round(areaPoints[areaPoints.length - 1].y)})
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Câmera: <span className="text-foreground font-medium">{selectedCamera.name}</span>
                </div>
                {videoDimensions && (
                  <div className="text-xs text-muted-foreground">
                    Vídeo: {videoDimensions.width}x{videoDimensions.height}
                  </div>
                )}
                
                {/* Informações da Zona */}
                <div className="space-y-2">
                  <Label>Zona de Detecção</Label>
                  {areaPoints.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma zona configurada. Clique no vídeo para criar uma.</p>
                  )}
                  {areaPoints.length > 0 && (
                    <div className="p-2 border border-border rounded bg-background">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Zona de Detecção</span>
                          {areaPoints.length >= 3 && (
                            <Badge variant={validateZoneArea(areaPoints).valid ? "default" : "destructive"} className="text-xs">
                              {validateZoneArea(areaPoints).valid ? `✓ ${Math.round(validateZoneArea(areaPoints).area)}px²` : 'Inválida'}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAreaPoints([]);
                            setIsDrawing(false);
                            toast.success('Zona removida');
                          }}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {areaPoints.length} pontos {areaPoints.length >= 3 && `(${Math.round(calculatePolygonArea(areaPoints))}px²)`}
                      </div>
                      {areaPoints.length >= 3 && (
                        <div className="text-xs mt-1">
                          {validateZoneArea(areaPoints).valid ? (
                            <span className="text-green-600">✓ {validateZoneArea(areaPoints).message}</span>
                          ) : (
                            <span className="text-yellow-600">⚠ {validateZoneArea(areaPoints).message}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAreaPoints([]);
                      setIsDrawing(false);
                    }}
                    disabled={areaPoints.length === 0}
                    className="flex-1"
                  >
                    Limpar
                  </Button>
                  <Button
                    onClick={async () => {
                      // Validar zona
                      if (areaPoints.length < 3) {
                        toast.error('Marque pelo menos 3 pontos para formar uma área.');
                        return;
                      }

                      const validation = validateZoneArea(areaPoints);
                      if (!validation.valid) {
                        toast.error(validation.message);
                        return;
                      }

                      try {
                        // Usar videoContainerRef ou videoContainerRect se disponível
                        let ref_w = 0;
                        let ref_h = 0;
                        
                        if (videoContainerRef.current) {
                          const containerRect = videoContainerRef.current.getBoundingClientRect();
                          ref_w = containerRect.width;
                          ref_h = containerRect.height;
                        } else if (videoContainerRect) {
                          // Usar dimensões já calculadas
                          ref_w = videoContainerRect.width;
                          ref_h = videoContainerRect.height;
                        } else {
                          // Tentar encontrar o container do vídeo como fallback
                          const cardElement = overlayRef.current?.querySelector('[class*="aspect-video"]');
                          if (!cardElement) {
                            toast.error('Não foi possível encontrar o container do vídeo. Tente clicar no vídeo primeiro.');
                            console.error('Container não encontrado. videoContainerRef:', videoContainerRef.current, 'videoContainerRect:', videoContainerRect);
                            return;
                          }
                          const cardRect = cardElement.getBoundingClientRect();
                          ref_w = cardRect.width;
                          ref_h = cardRect.height;
                        }
                        
                        const video = videoRef.current;
                        
                        // Converter pontos para o formato esperado pelo backend (garantir que são números)
                        const formattedPoints = areaPoints.map(p => ({
                          x: Number(p.x),
                          y: Number(p.y)
                        }));
                        
                        // Salvar pontos exatamente como estão (já estão nas coordenadas do container)
                        const payload = { 
                          points: formattedPoints,
                          ref_w: Math.round(ref_w), 
                          ref_h: Math.round(ref_h),
                          color: "#ef4444",
                          fill_color: "rgba(239,68,68,0.15)"
                        };
                        
                        console.log('Salvando zona:', {
                          pontos: areaPoints.length,
                          pontosFormatados: formattedPoints,
                          ref_w: Math.round(ref_w),
                          ref_h: Math.round(ref_h),
                          containerWidth: ref_w,
                          containerHeight: ref_h,
                          videoWidth: video?.videoWidth,
                          videoHeight: video?.videoHeight,
                          videoContainerRef: !!videoContainerRef.current,
                          videoContainerRect: !!videoContainerRect,
                          payload
                        });
                        
                        await cameraService.configureDetectionZone(selectedCamera.id, payload);
                        
                        const updated = await cameraService.getCamera(selectedCamera.id);
                        setSelectedCamera(updated as any);
                        loadCameras();
                        toast.success('Zona salva com sucesso!');
                        setIsConfigDialogOpen(false);
                        setSelectedCamera(null);
                        setAreaPoints([]);
                        setIsDrawing(false);
                      } catch (err: any) {
                        console.error('Erro ao salvar zona:', err);
                        const errorMessage = err?.response?.data?.detail || err?.message || 'Erro desconhecido ao salvar zona de detecção';
                        toast.error(`Erro ao salvar zona: ${errorMessage}`);
                        console.error('Detalhes do erro:', {
                          status: err?.response?.status,
                          data: err?.response?.data,
                          message: err?.message,
                          stack: err?.stack
                        });
                      }
                    }}
                    className="flex-1"
                    disabled={areaPoints.length < 3}
                  >
                    Salvar Zona
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsConfigDialogOpen(false);
                setSelectedCamera(null);
              }}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Teste de Stream */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">🎥 Teste de Stream</h2>
        <p className="text-muted-foreground mb-6">
          Teste a conexão de câmeras web e RTSP antes de adicioná-las ao sistema
        </p>
        <StreamTest />
      </div>
      </div>
    </Layout>
  );
};

export default Cameras;

