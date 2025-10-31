import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  X, 
  Settings, 
  MapPin, 
  Activity, 
  Eye,
  LineChart,
  Square,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cameraService, detectionService, Camera } from '@/services/api';

interface CameraConfigProps {
  camera: Camera;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCamera: Camera) => void;
}

interface Point {
  x: number;
  y: number;
}

const CameraConfig = ({ camera, isOpen, onClose, onSave }: CameraConfigProps) => {
  console.log('CameraConfig renderizado:', { camera, isOpen });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [config, setConfig] = useState({
    name: camera.name,
    location: camera.location || '',
    zone: camera.zone || '',
    detection_enabled: camera.detection_enabled,
    sensitivity: camera.sensitivity || 50,
    fps: camera.fps || 15,
    resolution: camera.resolution || '640x480'
  });
  
  const [detectionLines, setDetectionLines] = useState<Array<{id: string, start: Point, end: Point}>>([]);
  const [detectionZones, setDetectionZones] = useState<Array<{id: string, points: Point[]}>>([]);
  const [currentLine, setCurrentLine] = useState<{start: Point | null, end: Point | null}>({
    start: null,
    end: null
  });
  const [currentZone, setCurrentZone] = useState<Point[]>([]);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{type: 'line' | 'zone', id: string, index?: number} | null>(null);

  // Inicializar stream da câmera
  useEffect(() => {
    console.log('useEffect inicialização:', { isOpen, stream_url: camera.stream_url });
    if (isOpen && camera.stream_url) {
      console.log('Inicializando câmera...');
      initializeCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    };
  }, [isOpen, camera.stream_url]);

  useEffect(() => {
    // Carregar linhas existentes
    if (camera.detection_line) {
      const line = camera.detection_line;
      setDetectionLines([{
        id: 'line-1',
        start: { x: line.start_x, y: line.start_y },
        end: { x: line.end_x, y: line.end_y }
      }]);
    }
    
    // Carregar zonas existentes
    if (camera.detection_zone) {
      const zone = camera.detection_zone;
      setDetectionZones([{
        id: 'zone-1',
        points: zone.points || []
      }]);
    }
  }, [camera]);

  const initializeCamera = async () => {
    console.log('Iniciando initializeCamera com URL:', camera.stream_url);
    try {
      if (camera.stream_url.startsWith('webcam://')) {
        console.log('Detectado stream webcam');
        const cameraIndex = parseInt(camera.stream_url.split('://')[1]);
        
        // Tentar diferentes configurações de câmera
        const constraints = [
          // Tentativa 1: deviceId específico
          { video: { deviceId: { exact: cameraIndex.toString() } } },
          // Tentativa 2: deviceId ideal
          { video: { deviceId: { ideal: cameraIndex.toString() } } },
          // Tentativa 3: apenas índice
          { video: { deviceId: cameraIndex.toString() } },
          // Tentativa 4: câmera padrão
          { video: true },
          // Tentativa 5: configuração básica
          { video: { width: 640, height: 480 } }
        ];

        let mediaStream;
        for (let i = 0; i < constraints.length; i++) {
          try {
            console.log(`Tentativa ${i + 1} com constraints:`, constraints[i]);
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints[i]);
            console.log(`✅ Câmera inicializada com tentativa ${i + 1}`);
            break;
          } catch (error) {
            console.log(`❌ Tentativa ${i + 1} falhou:`, error.name, error.message);
            if (i === constraints.length - 1) {
              throw error;
            }
          }
        }
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              drawCanvas();
            }
          };
        }
        setIsStreaming(true);
        toast.success('Câmera inicializada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao inicializar câmera:', error);
      toast.error(`Erro ao acessar câmera: ${error.message}. Verifique as permissões e se a câmera não está sendo usada por outro aplicativo.`);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing detection lines
    detectionLines.forEach((line, index) => {
      ctx.strokeStyle = hoveredPoint?.type === 'line' && hoveredPoint?.id === line.id ? '#ff6b6b' : '#ef4444';
      ctx.lineWidth = hoveredPoint?.type === 'line' && hoveredPoint?.id === line.id ? 4 : 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw line points
      ctx.fillStyle = hoveredPoint?.type === 'line' && hoveredPoint?.id === line.id ? '#ff6b6b' : '#ef4444';
      ctx.beginPath();
      ctx.arc(line.start.x, line.start.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(line.end.x, line.end.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw line number
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`L${index + 1}`, (line.start.x + line.end.x) / 2, (line.start.y + line.end.y) / 2);
    });

    // Draw current line being drawn
    if (currentLine.start && currentLine.end) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentLine.start.x, currentLine.start.y);
      ctx.lineTo(currentLine.end.x, currentLine.end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(currentLine.start.x, currentLine.start.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(currentLine.end.x, currentLine.end.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw existing detection zones
    detectionZones.forEach((zone, index) => {
      if (zone.points.length >= 3) {
        ctx.fillStyle = hoveredPoint?.type === 'zone' && hoveredPoint?.id === zone.id ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)';
        ctx.strokeStyle = hoveredPoint?.type === 'zone' && hoveredPoint?.id === zone.id ? '#ff6b6b' : '#ef4444';
        ctx.lineWidth = hoveredPoint?.type === 'zone' && hoveredPoint?.id === zone.id ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(zone.points[0].x, zone.points[0].y);
        for (let i = 1; i < zone.points.length; i++) {
          ctx.lineTo(zone.points[i].x, zone.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw zone points
        ctx.fillStyle = hoveredPoint?.type === 'zone' && hoveredPoint?.id === zone.id ? '#ff6b6b' : '#ef4444';
        zone.points.forEach((point, pointIndex) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, hoveredPoint?.index === pointIndex ? 6 : 4, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Draw zone number
        if (zone.points.length > 0) {
          const centerX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
          const centerY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.fillText(`Z${index + 1}`, centerX, centerY);
        }
      }
    });

    // Draw current zone being drawn
    if (currentZone.length > 0) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentZone[0].x, currentZone[0].y);
      for (let i = 1; i < currentZone.length; i++) {
        ctx.lineTo(currentZone[i].x, currentZone[i].y);
      }
      if (currentZone.length >= 3) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();

      // Draw current zone points
      ctx.fillStyle = '#10b981';
      currentZone.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [detectionLines, detectionZones, currentLine, currentZone, hoveredPoint]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isStreaming) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    if (isDrawingLine) {
      if (!currentLine.start) {
        setCurrentLine({ start: { x, y }, end: null });
      } else if (!currentLine.end) {
        const newLine = {
          id: `line-${Date.now()}`,
          start: currentLine.start,
          end: { x, y }
        };
        setDetectionLines(prev => [...prev, newLine]);
        setCurrentLine({ start: null, end: null });
        setIsDrawingLine(false);
        toast.success('Linha de detecção adicionada!');
      }
    } else if (isDrawingZone) {
      setCurrentZone(prev => [...prev, { x, y }]);
      toast.success(`Ponto ${currentZone.length + 1} adicionado. Clique novamente para adicionar mais pontos ou finalize a zona.`);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isStreaming) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    // Update current line end point while drawing
    if (isDrawingLine && currentLine.start) {
      setCurrentLine(prev => ({ ...prev, end: { x, y } }));
    }

    // Check for hover over existing points
    let foundHover = null;

    // Check lines
    detectionLines.forEach(line => {
      const distStart = Math.sqrt((x - line.start.x) ** 2 + (y - line.start.y) ** 2);
      const distEnd = Math.sqrt((x - line.end.x) ** 2 + (y - line.end.y) ** 2);
      
      if (distStart <= 10) {
        foundHover = { type: 'line' as const, id: line.id, index: 0 };
      } else if (distEnd <= 10) {
        foundHover = { type: 'line' as const, id: line.id, index: 1 };
      }
    });

    // Check zones
    detectionZones.forEach(zone => {
      zone.points.forEach((point, index) => {
        const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        if (dist <= 10) {
          foundHover = { type: 'zone' as const, id: zone.id, index };
        }
      });
    });

    setHoveredPoint(foundHover);
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPoint(null);
  };

  const startDrawingLine = () => {
    setIsDrawingLine(true);
    setIsDrawingZone(false);
    setCurrentLine({ start: null, end: null });
    setCurrentZone([]);
    toast.info('Clique em dois pontos para desenhar a linha de detecção');
  };

  const startDrawingZone = () => {
    setIsDrawingZone(true);
    setIsDrawingLine(false);
    setCurrentZone([]);
    setCurrentLine({ start: null, end: null });
    toast.info('Clique em múltiplos pontos para desenhar a zona de detecção');
  };

  const finishZone = () => {
    if (currentZone.length >= 3) {
      const newZone = {
        id: `zone-${Date.now()}`,
        points: [...currentZone]
      };
      setDetectionZones(prev => [...prev, newZone]);
      setCurrentZone([]);
      setIsDrawingZone(false);
      toast.success('Zona de detecção adicionada!');
    } else {
      toast.error('Uma zona precisa de pelo menos 3 pontos');
    }
  };

  const clearCurrentDrawing = () => {
    setCurrentLine({ start: null, end: null });
    setCurrentZone([]);
    setIsDrawingLine(false);
    setIsDrawingZone(false);
    toast.info('Desenho cancelado');
  };

  const clearAllDetections = () => {
    setDetectionLines([]);
    setDetectionZones([]);
    setCurrentLine({ start: null, end: null });
    setCurrentZone([]);
    setIsDrawingLine(false);
    setIsDrawingZone(false);
    toast.success('Todas as áreas de detecção foram removidas');
  };

  const deleteDetection = (type: 'line' | 'zone', id: string) => {
    if (type === 'line') {
      setDetectionLines(prev => prev.filter(line => line.id !== id));
      toast.success('Linha removida');
    } else {
      setDetectionZones(prev => prev.filter(zone => zone.id !== id));
      toast.success('Zona removida');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Update camera basic info
      const updatedCamera = await cameraService.updateCamera(camera.id, config);
      
      // Configure detection lines if exist
      if (detectionLines.length > 0) {
        const line = detectionLines[0]; // For now, save only the first line
        await detectionService.configureDetectionLine(camera.id, {
          start_x: line.start.x,
          start_y: line.start.y,
          end_x: line.end.x,
          end_y: line.end.y,
          thickness: 3,
          color: '#ef4444'
        });
        toast.success('Linha de detecção configurada!');
      }

      // Configure detection zones if exist
      if (detectionZones.length > 0) {
        const zone = detectionZones[0]; // For now, save only the first zone
        await detectionService.configureDetectionZone(camera.id, {
          points: zone.points,
          color: '#ef4444',
          fill_color: 'rgba(239, 68, 68, 0.2)'
        });
        toast.success('Zona de detecção configurada!');
      }

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
      <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Câmera: {camera.name}
          </DialogTitle>
          <DialogDescription>
            Configure as áreas de detecção e parâmetros da câmera
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          {/* Left Panel - Camera Settings */}
          <div className="space-y-6">
            <Card className="p-4 bg-background border-border">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações Básicas
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Câmera</Label>
                  <Input
                    value={config.name}
                    onChange={(e) => setConfig({...config, name: e.target.value})}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <Input
                    value={config.location}
                    onChange={(e) => setConfig({...config, location: e.target.value})}
                    className="bg-background border-border"
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
          </div>

          {/* Right Panel - Detection Areas */}
          <div className="space-y-6">
            <Card className="p-4 bg-background border-border">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Áreas de Detecção
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={isDrawingLine ? "default" : "outline"}
                    size="sm"
                    onClick={startDrawingLine}
                    disabled={isStreaming ? false : true}
                  >
                    <LineChart className="w-4 h-4 mr-2" />
                    Desenhar Linha
                  </Button>
                  <Button
                    variant={isDrawingZone ? "default" : "outline"}
                    size="sm"
                    onClick={startDrawingZone}
                    disabled={isStreaming ? false : true}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Desenhar Zona
                  </Button>
                </div>

                {(isDrawingLine || isDrawingZone) && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCurrentDrawing}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    {isDrawingZone && currentZone.length >= 3 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={finishZone}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Finalizar Zona
                      </Button>
                    )}
                  </div>
                )}

                {(detectionLines.length > 0 || detectionZones.length > 0) && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={clearAllDetections}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Limpar Tudo
                    </Button>
                  </div>
                )}

                <div className="text-sm text-muted-foreground space-y-1">
                  {isDrawingLine && (
                    <p>🎯 <strong>Desenhando linha:</strong> Clique em dois pontos para definir a linha de detecção</p>
                  )}
                  {isDrawingZone && (
                    <p>🎯 <strong>Desenhando zona:</strong> Clique para adicionar pontos. Mínimo 3 pontos para finalizar.</p>
                  )}
                  {!isDrawingLine && !isDrawingZone && (
                    <p>📝 Selecione uma ferramenta para desenhar áreas de detecção</p>
                  )}
                  
                  {/* Status das áreas */}
                  <div className="flex gap-4 text-xs">
                    <span>Linhas: {detectionLines.length}</span>
                    <span>Zonas: {detectionZones.length}</span>
                    {currentZone.length > 0 && (
                      <span className="text-green-600">Pontos atuais: {currentZone.length}</span>
                    )}
                  </div>
                </div>

                <div className="relative border border-border rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-video object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseLeave={handleCanvasMouseLeave}
                  />
                  
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div className="text-center text-muted-foreground">
                        <Eye className="w-12 h-12 mx-auto mb-2" />
                        <p>Carregando câmera...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de áreas configuradas */}
                {(detectionLines.length > 0 || detectionZones.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Áreas Configuradas</h4>
                    
                    {/* Linhas */}
                    {detectionLines.map((line, index) => (
                      <div key={line.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm">Linha {index + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDetection('line', line.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Zonas */}
                    {detectionZones.map((zone, index) => (
                      <div key={zone.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500/20 rounded-full border border-red-500"></div>
                          <span className="text-sm">Zona {index + 1} ({zone.points.length} pontos)</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDetection('zone', zone.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Legenda */}
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Legenda</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Linha de Detecção</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500/20 rounded-full border border-red-500"></div>
                      <span className="text-sm">Zona de Detecção</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Desenhando (temporário)</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
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

export default CameraConfig;
