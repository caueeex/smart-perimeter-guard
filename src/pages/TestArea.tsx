import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  TestTube, 
  Play, 
  Pause, 
  Square, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Camera,
  MapPin,
  Zap,
  Video
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { cameraService, youtubeService, eventService } from "@/services/api";
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface Point {
  x: number;
  y: number;
}

interface TestArea {
  id: string;
  name: string;
  points: Point[];
  isActive: boolean;
  intrusionCount: number;
  lastIntrusion?: Date;
}

interface DetectionResult {
  objects: Array<{
    bbox: [number, number, number, number];
    confidence: number;
    class: string;
    center: [number, number];
  }>;
  intrusions: Array<{
    object: any;
    area: string;
    timestamp: Date;
  }>;
}

const TestArea = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [testAreas, setTestAreas] = useState<TestArea[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [detectionResults, setDetectionResults] = useState<DetectionResult | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [isYoutubeMode, setIsYoutubeMode] = useState(false);
  const [downloadedVideos, setDownloadedVideos] = useState<Array<{
    filename: string;
    size: number;
    size_mb: number;
    created_at: string;
    stream_url: string;
  }>>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [selectedCameraForVideo, setSelectedCameraForVideo] = useState<string>("");
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    message: string;
    type: 'intrusion' | 'warning' | 'success';
    timestamp: Date;
  }>>([]);
  const [streamUrl, setStreamUrl] = useState("");
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [availableCameras, setAvailableCameras] = useState<Array<{
    id: number;
    name: string;
    location?: string;
    status: 'online' | 'offline' | 'maintenance';
    stream_url: string;
    detection_enabled: boolean;
  }>>([]);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);
  const lastEventAtRef = useRef<number>(0);

  // Carregar câmeras do backend
  useEffect(() => {
    loadCameras();
    loadDownloadedVideos();
  }, []);

  // Carregar modelo de detecção
  useEffect(() => {
    const loadDetectionModel = async () => {
      try {
        toast.info("Carregando modelo de detecção...");
        console.log("Iniciando carregamento do modelo COCO-SSD...");
        
        // Configurar TensorFlow.js para usar WebGL
        await tf.ready();
        console.log("TensorFlow.js carregado:", tf.getBackend());
        
        const model = await cocoSsd.load();
        detectionModelRef.current = model;
        console.log("Modelo COCO-SSD carregado com sucesso!");
        toast.success("Modelo de detecção carregado!");
      } catch (error) {
        console.error("Erro ao carregar modelo:", error);
        toast.error(`Erro ao carregar modelo: ${error.message}`);
      }
    };

    loadDetectionModel();
  }, []);

  // Iniciar stream automaticamente quando uma câmera for selecionada
  // MAS APENAS se NÃO estiver em modo vídeo
  useEffect(() => {
    // Não iniciar câmera se estiver em modo vídeo
    if (isVideoMode || selectedVideo) {
      console.log("Modo vídeo ativo - não iniciar câmera automaticamente");
      return;
    }
    
    if (selectedCamera && availableCameras.length > 0) {
      const camera = availableCameras.find(c => c.id.toString() === selectedCamera);
      if (camera && camera.status === 'online' && camera.detection_enabled) {
        startCameraStream(camera);
      }
    }
  }, [selectedCamera, availableCameras, isVideoMode, selectedVideo]);

  const loadDownloadedVideos = async () => {
    try {
      // Verificar se o backend está online antes de tentar carregar
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Criar controller para timeout manual (AbortSignal.timeout pode não estar disponível)
      let healthController: AbortController | null = null;
      let healthTimeout: NodeJS.Timeout | null = null;
      
      try {
        healthController = new AbortController();
        healthTimeout = setTimeout(() => healthController!.abort(), 3000); // 3 segundos
        
        const healthResponse = await fetch(`${apiBaseUrl}/health`, {
          method: 'GET',
          signal: healthController.signal
        });
        
        if (healthTimeout) clearTimeout(healthTimeout);
        
        if (!healthResponse.ok) {
          console.warn("Backend health check falhou - não carregando vídeos");
          return;
        }
      } catch (healthError: any) {
        if (healthTimeout) clearTimeout(healthTimeout);
        if (healthError.name === 'AbortError') {
          console.warn("Backend não respondeu em 3 segundos - pode estar offline");
        } else {
          console.warn("Backend parece estar offline - não carregando vídeos:", healthError.message);
        }
        return;
      }
      
      // Se health check passou, tentar carregar vídeos com timeout menor
      console.log("✅ Backend está online, carregando lista de vídeos...");
      
      const videosController = new AbortController();
      const videosTimeout = setTimeout(() => videosController.abort(), 8000); // 8 segundos
      
      try {
        const result = await Promise.race([
          youtubeService.listVideos(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout ao carregar vídeos')), 8000)
          )
        ]);
        
        clearTimeout(videosTimeout);
        
        if (result && result.success && result.videos) {
          setDownloadedVideos(result.videos);
          console.log(`✅ ${result.videos.length} vídeo(s) baixado(s) carregado(s):`, result.videos);
          
          if (result.videos.length === 0) {
            console.log("ℹ️ Nenhum vídeo encontrado na pasta temp_videos");
          }
        } else {
          console.log("ℹ️ Endpoint retornou sem vídeos:", result);
          setDownloadedVideos([]);
        }
      } catch (videosError: any) {
        clearTimeout(videosTimeout);
        if (videosError.name === 'AbortError' || videosError.message?.includes('timeout')) {
          console.warn("⏱️ Timeout ao carregar lista de vídeos (8s)");
        } else {
          console.warn("⚠️ Erro ao carregar vídeos:", videosError.message);
        }
        setDownloadedVideos([]);
      }
    } catch (error: any) {
      console.warn("⚠️ Não foi possível carregar vídeos baixados:", error.message);
      // Não mostrar erro ao usuário, apenas deixar lista vazia
      setDownloadedVideos([]);
    }
  };

  const loadCameras = async () => {
    try {
      setIsLoadingCameras(true);
      
      // Primeiro verificar se o backend está online (sem autenticação)
      let healthTimeoutId: NodeJS.Timeout | null = null;
      try {
        const controller = new AbortController();
        healthTimeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos
        
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const healthCheck = await fetch(`${apiBaseUrl}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        if (healthTimeoutId) clearTimeout(healthTimeoutId);
        healthTimeoutId = null;
        
        if (!healthCheck.ok) {
          throw new Error('Backend não está respondendo corretamente');
        }
        
        console.log("✅ Backend está online");
      } catch (healthError: any) {
        if (healthTimeoutId) clearTimeout(healthTimeoutId);
        console.warn("Health check falhou:", healthError);
        
        if (healthError.name === 'AbortError' || healthError.message?.includes('aborted')) {
          toast.warning("⚠️ Backend não respondeu em 5 segundos. Verifique se está rodando.");
        } else {
          toast.warning("⚠️ Backend parece estar offline. Usando modo offline.");
        }
        throw new Error("Backend offline");
      }
      
      // Se health check passou, tentar carregar câmeras com timeout
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 10000); // 10 segundos
      
      try {
        const cameras = await cameraService.getCameras();
        clearTimeout(timeoutId2);
      
        setAvailableCameras(cameras);
        console.log("Câmeras carregadas:", cameras);
        
        // Auto-selecionar primeira câmera online se nenhuma estiver selecionada
        if (!selectedCamera && cameras.length > 0) {
          const onlineCamera = cameras.find(c => c.status === 'online');
          if (onlineCamera) {
            setSelectedCamera(onlineCamera.id.toString());
            toast.info(`Câmera ${onlineCamera.name} selecionada automaticamente`);
          }
        }
      } catch (camerasError: any) {
        clearTimeout(timeoutId2);
        throw camerasError;
      }
    } catch (error: any) {
      console.error("Erro ao carregar câmeras:", error);
      
      // Mensagem de erro mais específica
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        toast.error("⏱️ Timeout ao conectar com o backend. Verifique se o servidor está rodando na porta 8000.");
      } else if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        toast.error("🌐 Erro de rede. Verifique se o backend está acessível em http://localhost:8000");
      } else if (error.response?.status === 401) {
        toast.error("🔐 Erro de autenticação. Faça login novamente.");
      } else {
        toast.warning("⚠️ Não foi possível carregar câmeras do backend. Usando modo offline.");
      }
      
      // Fallback com câmeras de exemplo se o backend não estiver disponível
      const fallbackCameras = [
        { 
          id: 1, 
          name: "Webcam Principal", 
          location: "Escritório", 
          status: "online" as const, 
          stream_url: "webcam://0",
          detection_enabled: true
        },
        { 
          id: 2, 
          name: "Câmera IP Exemplo", 
          location: "Entrada", 
          status: "offline" as const, 
          stream_url: "rtsp://192.168.1.100:554/stream",
          detection_enabled: true
        }
      ];
      setAvailableCameras(fallbackCameras);
      
      // Auto-selecionar primeira câmera do fallback
      if (!selectedCamera) {
        setSelectedCamera(fallbackCameras[0].id.toString());
        toast.info("📹 Usando câmera de exemplo (modo offline)");
      }
    } finally {
      setIsLoadingCameras(false);
    }
  };

  // Detecção real de objetos
  useEffect(() => {
    if (!isMonitoring || !detectionModelRef.current || !videoRef.current) {
      console.log("Detecção não iniciada:", {
        isMonitoring,
        hasModel: !!detectionModelRef.current,
        hasVideo: !!videoRef.current,
        isVideoMode,
        selectedVideo,
        hasVideoUrl: !!videoUrl
      });
      return;
    }

    console.log("Iniciando detecção de objetos...");

    const detectObjects = async () => {
      try {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0) {
          console.log("Vídeo não está pronto:", {
            hasVideo: !!video,
            videoWidth: video?.videoWidth,
            videoHeight: video?.videoHeight,
            isVideoMode,
            videoSrc: video?.src
          });
          return;
        }

        // Se estiver em modo vídeo, garantir que está reproduzindo
        if (isVideoMode && video.paused) {
          video.play().catch(console.error);
        }

        console.log("Detectando objetos no vídeo...");
        
        // Detectar objetos no vídeo
        const predictions = await detectionModelRef.current!.detect(video);
        console.log("Predições encontradas:", predictions.length);
        
        // Mostrar todas as predições para debug
        predictions.forEach((pred, index) => {
          console.log(`Predição ${index}:`, {
            class: pred.class,
            score: pred.score,
            bbox: pred.bbox
          });
        });
        
        // Filtrar apenas objetos relevantes (pessoas, animais, veículos)
        const relevantClasses = ['person', 'dog', 'cat', 'bird', 'car', 'truck', 'motorcycle', 'bicycle'];
        const relevantObjects = predictions.filter(pred => relevantClasses.includes(pred.class) && pred.score > 0.3);
        
        console.log("Objetos relevantes encontrados:", relevantObjects.length);

        // Converter para formato compatível e ESCALAR para o canvas
        const scaleX = video.videoWidth > 0 ? (canvasRef.current!.width / video.videoWidth) : 1;
        const scaleY = video.videoHeight > 0 ? (canvasRef.current!.height / video.videoHeight) : 1;
        const detectedObjects = relevantObjects.map(pred => {
          const [bx, by, bw, bh] = pred.bbox as [number, number, number, number];
          const x1 = bx * scaleX;
          const y1 = by * scaleY;
          const x2 = (bx + bw) * scaleX;
          const y2 = (by + bh) * scaleY;
          return {
            bbox: [x1, y1, x2, y2] as [number, number, number, number],
            class: pred.class,
            confidence: pred.score,
            center: [x1 + (x2 - x1)/2, y1 + (y2 - y1)/2] as [number, number]
          };
        });

        console.log("Objetos processados:", detectedObjects);

        const intrusions: any[] = [];
        
        // Verificar intrusões em cada área ativa (≥10% da bbox dentro)
        testAreas.forEach(area => {
          if (!area.isActive) return;
          
          detectedObjects.forEach(obj => {
            const ratio = bboxInsideRatio(obj.bbox, area.points);
            if (ratio >= 0.1) {
              console.log("INTRUSÃO DETECTADA!", { area: area.name, object: obj.class });
              
              intrusions.push({
                object: obj,
                area: area.name,
                timestamp: new Date()
              });
              
              // Adicionar alerta
              const alert = {
                id: Date.now().toString(),
                message: `🚨 INTRUSÃO DETECTADA! ${obj.class} invadiu a área "${area.name}"`,
                type: 'intrusion' as const,
                timestamp: new Date()
              };
              
              setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Manter apenas 10 alertas
              toast.error(`Intrusão detectada na área ${area.name}!`);
              
              // Atualizar contador de intrusões
              setTestAreas(prev => prev.map(a => 
                a.id === area.id 
                  ? { ...a, intrusionCount: a.intrusionCount + 1, lastIntrusion: new Date() }
                  : a
              ));

              // Capturar screenshot
              captureScreenshot(area.name, obj.class);

              // Registrar evento no backend (com throttle de 3s para evitar spam)
              const nowTs = Date.now();
              if (nowTs - lastEventAtRef.current > 3000) {
                lastEventAtRef.current = nowTs;
                (async () => {
                  try {
                    const cameraIdNum = parseInt((selectedCameraForVideo || selectedCamera) || '0', 10);
                    await eventService.createEvent({
                      camera_id: isNaN(cameraIdNum) ? undefined : cameraIdNum,
                      event_type: 'intrusion',
                      description: `Intrusão detectada na área "${area.name}" (${obj.class})`,
                      confidence: obj.confidence,
                      detected_objects: [{ class: obj.class, confidence: obj.confidence, center: obj.center }],
                      bounding_boxes: [obj.bbox]
                    });
                  } catch (e) {
                    console.warn('Falha ao registrar evento no backend:', e);
                  }
                })();
              }
            }
          });
        });

        setDetectionResults({
          objects: detectedObjects,
          intrusions
        });
      } catch (error) {
        console.error("Erro na detecção:", error);
        toast.error(`Erro na detecção: ${error.message}`);
      }
    };

    let rafId = requestAnimationFrame(function loop() {
      if (!isMonitoring) return;
      detectObjects();
      rafId = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(rafId);
  }, [isMonitoring, testAreas, isVideoMode, videoUrl, selectedVideo]);

  // Função para verificar se um ponto está dentro de um polígono
  const isPointInPolygon = (point: [number, number], polygon: Point[]): boolean => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = [polygon[i].x, polygon[i].y];
      const [xj, yj] = [polygon[j].x, polygon[j].y];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Aproximar porcentagem da bbox dentro do polígono amostrando uma grade de pontos
  const bboxInsideRatio = (bbox: [number, number, number, number], polygon: Point[]): number => {
    const [x1, y1, x2, y2] = bbox;
    const width = Math.max(0, x2 - x1);
    const height = Math.max(0, y2 - y1);
    if (width === 0 || height === 0) return 0;
    const samplesX = 6; // grid 6x4=24 pontos
    const samplesY = 4;
    let countInside = 0;
    let total = 0;
    for (let i = 0; i < samplesX; i++) {
      for (let j = 0; j < samplesY; j++) {
        const px = x1 + (i + 0.5) * (width / samplesX);
        const py = y1 + (j + 0.5) * (height / samplesY);
        total++;
        if (isPointInPolygon([px, py], polygon)) countInside++;
      }
    }
    return total > 0 ? countInside / total : 0;
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newPoint = { x, y };
    setCurrentPoints(prev => [...prev, newPoint]);
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Atualizar o último ponto enquanto desenha
    if (currentPoints.length > 0) {
      const newPoints = [...currentPoints.slice(0, -1), { x, y }];
      setCurrentPoints(newPoints);
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPoints([]);
  };

  const finishDrawing = () => {
    if (currentPoints.length < 3) {
      toast.error("Desenhe pelo menos 3 pontos para formar uma área!");
      return;
    }
    
    setIsDrawing(false);
    
    if (!areaName.trim()) {
      // Mostrar input para nome da área
      setShowNameInput(true);
      return;
    }
    
    const newArea: TestArea = {
      id: Date.now().toString(),
      name: areaName,
      points: [...currentPoints],
      isActive: true,
      intrusionCount: 0
    };
    
    setTestAreas(prev => [...prev, newArea]);
    setAreaName("");
    setCurrentPoints([]);
    setShowNameInput(false);
    toast.success(`Área "${newArea.name}" criada com sucesso!`);
  };

  const confirmAreaName = () => {
    if (!areaName.trim()) {
      toast.error("Digite um nome para a área!");
      return;
    }
    
    const newArea: TestArea = {
      id: Date.now().toString(),
      name: areaName,
      points: [...currentPoints],
      isActive: true,
      intrusionCount: 0
    };
    
    setTestAreas(prev => [...prev, newArea]);
    setAreaName("");
    setCurrentPoints([]);
    setShowNameInput(false);
    toast.success(`Área "${newArea.name}" criada com sucesso!`);
  };

  const cancelAreaName = () => {
    setShowNameInput(false);
    setAreaName("");
    setCurrentPoints([]);
    toast.info("Criação de área cancelada.");
  };

  const clearCurrentDrawing = () => {
    setCurrentPoints([]);
    setIsDrawing(false);
  };

  const toggleArea = (areaId: string) => {
    setTestAreas(prev => prev.map(area => 
      area.id === areaId ? { ...area, isActive: !area.isActive } : area
    ));
  };

  const deleteArea = (areaId: string) => {
    setTestAreas(prev => prev.filter(area => area.id !== areaId));
    toast.success("Área removida!");
  };

  const startMonitoring = async () => {
    if (testAreas.length === 0) {
      toast.error("Crie pelo menos uma área antes de iniciar o monitoramento!");
      return;
    }
    
    // Se não há vídeo carregado, precisa de câmera
    if (!isVideoMode && !selectedCamera) {
      toast.error("Selecione uma câmera ou carregue um vídeo antes de iniciar o monitoramento!");
      return;
    }
    
    // Se estiver em modo vídeo, garantir que há uma câmera selecionada para associar eventos
    if (isVideoMode && !selectedCameraForVideo && !selectedCamera) {
      toast.warning("⚠️ Selecione uma câmera para associar os eventos de detecção!");
      // Continuar mesmo assim, mas avisar
    }
    
    // Usar câmera do vídeo se disponível, senão usar câmera padrão
    const cameraIdToUse = selectedCameraForVideo || selectedCamera;
    const camera = availableCameras.find(c => c.id.toString() === cameraIdToUse);
    
    if (camera && camera.status === 'offline') {
      toast.error("A câmera selecionada está offline!");
      return;
    }
    
    if (camera && !camera.detection_enabled) {
      toast.error("A detecção está desabilitada para esta câmera!");
      return;
    }
    
    if (!detectionModelRef.current) {
      toast.error("Modelo de IA ainda não carregou. Aguarde alguns segundos.");
      return;
    }
    
    // Iniciar stream da câmera ou vídeo
    if (isVideoMode && videoUrl) {
      // Modo vídeo carregado
      if (videoRef.current) {
        console.log("Carregando vídeo com URL:", videoUrl);
        videoRef.current.src = videoUrl;
        videoRef.current.load();
        // Tentar reproduzir
        videoRef.current.play().catch(err => {
          console.error("Erro ao reproduzir vídeo:", err);
          toast.error("Erro ao reproduzir vídeo. Verifique a URL.");
        });
      }
    } else {
      // Modo câmera ao vivo
      await startCameraStream(camera);
    }
    
    // Aguardar um pouco para o vídeo carregar
    setTimeout(() => {
      setIsMonitoring(true);
      const mode = isVideoMode ? "vídeo carregado" : camera?.name;
      toast.success(`Monitoramento iniciado com ${mode}! 🚀`);
      console.log("Monitoramento iniciado!");
      
      // Forçar primeira detecção após 2 segundos
      setTimeout(async () => {
        if (detectionModelRef.current && videoRef.current) {
          try {
            console.log("Forçando primeira detecção...");
            const predictions = await detectionModelRef.current.detect(videoRef.current);
            console.log("Primeira detecção:", predictions);
            toast.info(`Primeira detecção: ${predictions.length} objetos encontrados`);
          } catch (error) {
            console.error("Erro na primeira detecção:", error);
          }
        }
      }, 2000);
    }, 1000);
  };

  const startCameraStream = async (camera: any) => {
    try {
      // NÃO iniciar câmera se estiver em modo vídeo
      if (isVideoMode || selectedVideo) {
        console.log("⚠️ Tentativa de iniciar câmera bloqueada - modo vídeo ativo");
        return;
      }
      
      if (!videoRef.current) return;
      
      const video = videoRef.current;
      
      // Limpar qualquer src de vídeo antes de iniciar câmera
      if (video.src) {
        video.src = "";
        video.load();
      }
      
      // Para webcam
      if (camera.stream_url.startsWith('webcam://')) {
        toast.info(`Conectando à ${camera.name}...`);
        
        const token = camera.stream_url.split('://')[1];
        const decoded = decodeURIComponent(token || '');
        const numericIndex = decoded !== '' && !isNaN(Number(decoded)) ? Number(decoded) : null;
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 800 },
          height: { ideal: 600 },
          facingMode: 'user'
        };
        if (decoded) {
          // Preferir deviceId verdadeiro quando disponível
          if (numericIndex === null) {
            videoConstraints.deviceId = { exact: decoded } as any;
          }
        }
        const constraints: MediaStreamConstraints = { video: videoConstraints };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Verificar novamente se não entrou em modo vídeo enquanto aguardava
        if (isVideoMode || selectedVideo) {
          stream.getTracks().forEach(track => track.stop());
          console.log("Stream cancelado - modo vídeo ativado durante espera");
          return;
        }
        
        video.srcObject = stream;
        
        // Aguardar o vídeo carregar
        video.onloadedmetadata = () => {
          if (!isVideoMode && !selectedVideo) {
            video.play();
            toast.success(`✅ ${camera.name} conectada com sucesso!`);
          } else {
            // Se entrou em modo vídeo durante o carregamento, parar stream
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
          }
        };
        
        video.onerror = () => {
          toast.error(`❌ Erro ao reproduzir ${camera.name}`);
        };
        
      } else {
        // Para streams RTSP/HTTP (simulação)
        toast.info("Stream RTSP não suportado no navegador. Usando simulação.");
        showSimulatedStream(camera);
      }
    } catch (error: any) {
      console.error('Erro ao iniciar stream:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('❌ Permissão negada para acessar a câmera. Clique no ícone da câmera na barra de endereços.');
      } else if (error.name === 'NotFoundError') {
        toast.error('❌ Câmera não encontrada. Verifique se está conectada.');
      } else if (error.name === 'NotReadableError') {
        toast.error('❌ Câmera está sendo usada por outro aplicativo.');
      } else {
        toast.error(`❌ Erro ao acessar a câmera: ${error.message}`);
      }
      
      showFallbackMessage();
    }
  };

  const showSimulatedStream = (camera: any) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Desenhar fundo simulando stream
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Adicionar texto indicativo
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Stream: ${camera.stream_url}`, canvas.width/2, canvas.height/2);
        ctx.fillText('Simulação de Câmera IP', canvas.width/2, canvas.height/2 + 30);
        ctx.fillText('Desenhe áreas para testar detecção', canvas.width/2, canvas.height/2 + 60);
      }
    }
  };

  const showFallbackMessage = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Câmera não disponível', canvas.width/2, canvas.height/2);
        ctx.fillText('Clique em "Desenhar Área" para continuar', canvas.width/2, canvas.height/2 + 30);
      }
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    setDetectionResults(null);
    
    // Parar stream da câmera
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Limpar canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    toast.info("Monitoramento parado.");
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setUploadedVideo(file);
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        setIsVideoMode(true);
        toast.success(`Vídeo carregado: ${file.name}`);
      } else {
        toast.error("Por favor, selecione um arquivo de vídeo válido.");
      }
    }
  };

  const switchToLiveCamera = () => {
    // PARAR VÍDEO se estiver rodando
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.load();
      
      // Se tiver srcObject (câmera), limpar também
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    
    setIsVideoMode(false);
    setIsYoutubeMode(false);
    setVideoUrl("");
    setUploadedVideo(null);
    setYoutubeUrl("");
    setSelectedVideo(""); // Limpar seleção de vídeo também
    
    toast.info("Modo câmera ao vivo ativado");
    
    // Reiniciar câmera se houver uma selecionada
    if (selectedCamera && availableCameras.length > 0) {
      const camera = availableCameras.find(c => c.id.toString() === selectedCamera);
      if (camera) {
        setTimeout(() => startCameraStream(camera), 500);
      }
    }
  };

  const switchToVideoMode = () => {
    if (videoUrl) {
      setIsVideoMode(true);
      setIsYoutubeMode(false);
      toast.info("Modo vídeo ativado");
    } else {
      toast.error("Nenhum vídeo carregado. Faça upload primeiro.");
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleYouTubeUrl = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Digite uma URL do YouTube válida");
      return;
    }

    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      toast.error("URL do YouTube inválida. Use um link como: https://www.youtube.com/watch?v=VIDEO_ID");
      return;
    }

    try {
      toast.info("🔄 Processando vídeo do YouTube...");
      
      // Processar URL através do proxy
      const result = await youtubeService.processUrl(youtubeUrl);
      
      if (result.success && result.stream_url) {
        // Garantir que a URL está completa (com baseURL da API)
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const fullStreamUrl = result.stream_url.startsWith('http') 
          ? result.stream_url 
          : `${apiBaseUrl}${result.stream_url}`;
        
        console.log("URL completa do stream:", fullStreamUrl);
        
        // Definir URL do vídeo
        setVideoUrl(fullStreamUrl);
        setIsYoutubeMode(false); // Não é mais modo YouTube, é vídeo local
        setIsVideoMode(true);
        
        // Aguardar um pouco e então carregar o vídeo
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.src = fullStreamUrl;
            videoRef.current.load();
            videoRef.current.play().catch(err => {
              console.error("Erro ao reproduzir vídeo:", err);
              toast.error("Erro ao reproduzir vídeo. Verifique se o arquivo foi baixado corretamente.");
            });
          }
        }, 500);
        
        toast.success(`✅ Vídeo processado: ${result.video_info?.title || 'YouTube Video'}`);
        console.log("Vídeo processado:", result);
      } else {
        toast.error(`❌ Erro ao processar vídeo: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error("Erro ao processar YouTube:", error);
      toast.error(`❌ Erro ao processar vídeo: ${error.message}`);
    }
  };

  const switchToYouTubeMode = async () => {
    if (youtubeUrl) {
      await handleYouTubeUrl();
    } else {
      toast.error("Digite uma URL do YouTube primeiro.");
    }
  };

  const captureScreenshot = async (areaName: string, objectClass: string) => {
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video) return;

      // Obter ID da câmera para associar ao evento
      const cameraIdToUse = selectedCameraForVideo || selectedCamera;
      const camera = availableCameras.find(c => c.id.toString() === cameraIdToUse);

      // Criar um canvas temporário para capturar a imagem
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return;

      // Definir dimensões
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      // Desenhar o vídeo como fundo
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      }

      // Desenhar áreas e objetos detectados
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Copiar conteúdo do canvas principal
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Converter para blob
      const blob = await new Promise<Blob>((resolve) => {
        tempCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png', 0.9);
      });

      // Criar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `intrusion_${areaName}_${objectClass}_${timestamp}.png`;

      // Enviar para o backend
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('area', areaName);
      formData.append('object', objectClass);
      formData.append('timestamp', new Date().toISOString());
      if (camera) {
        formData.append('camera_id', camera.id.toString());
        formData.append('camera_name', camera.name);
      }
      if (selectedVideo) {
        formData.append('video_source', selectedVideo);
      }

      const response = await fetch('/api/v1/events/screenshot', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success(`📸 Screenshot salvo: ${filename}${camera ? ` (Câmera: ${camera.name})` : ''}`);
      } else {
        console.error('Erro ao salvar screenshot');
      }
    } catch (error) {
      console.error('Erro ao capturar screenshot:', error);
    }
  };


  // Loop de animação para atualizar o canvas
  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Limpar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Desenhar vídeo como fundo se disponível
      // Verificar se é vídeo de arquivo (src) ou stream de câmera (srcObject)
      const hasVideoSource = (video && video.videoWidth > 0 && video.videoHeight > 0) && 
                             (isVideoMode || selectedVideo || video.srcObject);
      
      if (hasVideoSource) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else if (!isVideoMode && !selectedVideo) {
        // Fundo padrão apenas se não estiver em modo vídeo
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!isMonitoring) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '18px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Selecione uma câmera e inicie o monitoramento', canvas.width/2, canvas.height/2);
        }
      } else if ((isVideoMode || selectedVideo) && (!video || video.videoWidth === 0)) {
        // Se está em modo vídeo mas vídeo não carregou ainda
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Carregando vídeo...', canvas.width/2, canvas.height/2);
      }
      
      // Desenhar áreas existentes
      testAreas.forEach(area => {
        if (area.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(area.points[0].x, area.points[0].y);
        
        for (let i = 1; i < area.points.length; i++) {
          ctx.lineTo(area.points[i].x, area.points[i].y);
        }
        
        ctx.closePath();
        ctx.strokeStyle = area.isActive ? '#ef4444' : '#6b7280';
        ctx.fillStyle = area.isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(107, 114, 128, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();
        
        // Desenhar nome da área
        if (area.points.length > 0) {
          const centerX = area.points.reduce((sum, p) => sum + p.x, 0) / area.points.length;
          const centerY = area.points.reduce((sum, p) => sum + p.y, 0) / area.points.length;
          
          ctx.fillStyle = area.isActive ? '#ef4444' : '#6b7280';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(area.name, centerX, centerY);
        }
      });
      
      // Desenhar área sendo criada
      if (currentPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
        
        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();
        
        // Desenhar pontos
        currentPoints.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
        });
      }
      
      // Desenhar objetos detectados
      if (detectionResults) {
        detectionResults.objects.forEach(obj => {
          const [x1, y1, x2, y2] = obj.bbox;
          const centerX = obj.center[0];
          const centerY = obj.center[1];
          const radius = Math.max((x2 - x1), (y2 - y1)) / 2 + 10;
          
          // Desenhar círculo ao redor do objeto
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = '#ef4444'; // Vermelho para intrusos
          ctx.lineWidth = 4;
          ctx.stroke();
          
          // Desenhar círculo interno
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius - 8, 0, 2 * Math.PI);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Desenhar círculo pulsante
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Desenhar label com fundo
          const label = `${obj.class} (${Math.round(obj.confidence * 100)}%)`;
          ctx.font = 'bold 16px Arial';
          const textWidth = ctx.measureText(label).width;
          
          // Fundo do label maior e mais visível
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.fillRect(x1, y1 - 30, textWidth + 15, 25);
          
          // Borda do label
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x1, y1 - 30, textWidth + 15, 25);
          
          // Texto do label
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, x1 + 7, y1 - 12);
          
          // Indicador de intrusão
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 20px Arial';
          ctx.fillText('🚨 INTRUSÃO!', x1, y1 - 40);
          
          // Desenhar centro do objeto
          ctx.beginPath();
          ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          
          // Desenhar cruz no centro
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX - 6, centerY);
          ctx.lineTo(centerX + 6, centerY);
          ctx.moveTo(centerX, centerY - 6);
          ctx.lineTo(centerX, centerY + 6);
          ctx.stroke();
        });
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }, [testAreas, currentPoints, detectionResults, isMonitoring, isVideoMode]);

  return (
    <Layout>
      <div className="min-h-screen bg-background p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <TestTube className="w-8 h-8 text-primary" />
              Área de Teste
            </h1>
            <p className="text-muted-foreground mt-1">
              Demarque áreas protegidas e monitore intrusões em tempo real
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedCamera} onValueChange={setSelectedCamera} disabled={isLoadingCameras}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder={isLoadingCameras ? "Carregando câmeras..." : "Selecione uma câmera"} />
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.length === 0 ? (
                    <SelectItem value="no-cameras" disabled>
                      {isLoadingCameras ? "Carregando..." : "Nenhuma câmera encontrada"}
                    </SelectItem>
                  ) : (
                    availableCameras.map(camera => (
                      <SelectItem key={camera.id} value={camera.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            camera.status === 'online' ? 'bg-green-500' : 
                            camera.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span>{camera.name}</span>
                          <span className="text-muted-foreground">
                            ({camera.location || 'Sem localização'})
                          </span>
                          {!camera.detection_enabled && (
                            <Badge variant="secondary" className="text-xs">Detecção OFF</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
                      {/* Botão para recarregar câmeras */}
                      <Button 
                        onClick={loadCameras} 
                        variant="outline" 
                        size="sm"
                        disabled={isLoadingCameras}
                        title="Recarregar câmeras"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                      
                      {/* Botão para testar conexão */}
                      {selectedCamera && (
                        <Button 
                          onClick={() => {
                            const camera = availableCameras.find(c => c.id.toString() === selectedCamera);
                            if (camera) {
                              startCameraStream(camera);
                            }
                          }}
                          variant="outline" 
                          size="sm"
                          title="Testar conexão com a câmera"
                        >
                          <Video className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Botão para testar detecção */}
                      {isMonitoring && detectionModelRef.current && (
                        <Button 
                          onClick={async () => {
                            const video = videoRef.current;
                            if (!video) return;
                            
                            try {
                              console.log("Testando detecção manual...");
                              const predictions = await detectionModelRef.current!.detect(video);
                              console.log("Teste de detecção:", predictions);
                              toast.info(`Detectados ${predictions.length} objetos`);
                            } catch (error) {
                              console.error("Erro no teste:", error);
                              toast.error("Erro no teste de detecção");
                            }
                          }}
                          variant="outline" 
                          size="sm"
                          title="Testar detecção manual"
                        >
                          <TestTube className="w-4 h-4" />
                        </Button>
                      )}
            </div>
            
            {isMonitoring ? (
              <Button onClick={stopMonitoring} variant="destructive">
                <Pause className="w-4 h-4 mr-2" />
                Parar Monitoramento
              </Button>
            ) : (
              <Button onClick={startMonitoring} className="bg-gradient-primary hover:opacity-90">
                <Play className="w-4 h-4 mr-2" />
                Iniciar Monitoramento
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas de Desenho */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Área de Monitoramento
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant={isMonitoring ? "default" : "secondary"}>
                    {isMonitoring ? "Monitorando" : "Parado"}
                  </Badge>
                  {detectionModelRef.current && (
                    <Badge variant="default" className="bg-green-600">
                      IA Ativa
                    </Badge>
                  )}
                  {detectionResults && (
                    <Badge variant="outline">
                      {detectionResults.objects.length} objetos
                    </Badge>
                  )}
                  {isVideoMode && (
                    <Badge variant="secondary" className="bg-blue-600">
                      Modo Vídeo
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Seção de Upload de Vídeo e YouTube */}
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Vídeo para Teste de Detecção
                </h4>
                
                <div className="space-y-4">
                  {/* Upload de arquivo */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Upload de Arquivo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="flex-1"
                        placeholder="Selecione um vídeo de invasão"
                      />
                      {uploadedVideo && (
                        <Button onClick={switchToVideoMode} size="sm" variant="outline">
                          Usar Vídeo
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* URL do YouTube */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">URL do YouTube</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={switchToYouTubeMode} size="sm" variant="outline">
                        Usar YouTube
                      </Button>
                    </div>
                  </div>

                  {/* Vídeos Baixados */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Vídeo Baixado (Pasta do Servidor)</Label>
                    <div className="flex items-center gap-2">
                      <Select value={selectedVideo} onValueChange={setSelectedVideo}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um vídeo baixado..." />
                        </SelectTrigger>
                        <SelectContent>
                          {downloadedVideos.length === 0 ? (
                            <SelectItem value="no-videos" disabled>
                              Nenhum vídeo disponível
                            </SelectItem>
                          ) : (
                            downloadedVideos.map((video) => (
                              <SelectItem key={video.filename} value={video.filename}>
                                <div className="flex flex-col">
                                  <span>{video.filename}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {video.size_mb} MB • {new Date(video.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={async () => {
                          if (!selectedVideo) {
                            toast.error("Selecione um vídeo primeiro");
                            return;
                          }
                          const video = downloadedVideos.find(v => v.filename === selectedVideo);
                          if (!video) return;

                          // PARAR A STREAM DA CÂMERA SE ESTIVER RODANDO
                          if (videoRef.current && videoRef.current.srcObject) {
                            const stream = videoRef.current.srcObject as MediaStream;
                            stream.getTracks().forEach(track => {
                              track.stop();
                              console.log("Track da câmera parado:", track.kind);
                            });
                            videoRef.current.srcObject = null;
                            console.log("Stream da câmera parado");
                          }

                          // Limpar src anterior
                          if (videoRef.current) {
                            videoRef.current.src = "";
                            videoRef.current.load();
                          }

                          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                          const fullStreamUrl = `${apiBaseUrl}${video.stream_url}`;
                          
                          console.log("Carregando vídeo:", fullStreamUrl);
                          
                          setVideoUrl(fullStreamUrl);
                          setIsVideoMode(true);
                          setIsYoutubeMode(false);
                          
                          // Aguardar um pouco e então carregar o vídeo
                          setTimeout(async () => {
                            if (!videoRef.current) return;
                            
                            const video = videoRef.current;
                            
                            // Garantir que srcObject está vazio
                            video.srcObject = null;
                            
                            // Primeiro, verificar se o arquivo existe fazendo uma requisição HEAD
                            try {
                              const token = localStorage.getItem('access_token');
                              const headers: HeadersInit = {
                                'Content-Type': 'application/json',
                              };
                              if (token) {
                                headers['Authorization'] = `Bearer ${token}`;
                              }
                              
                              const headResponse = await fetch(fullStreamUrl, {
                                method: 'HEAD',
                                headers: headers
                              });
                              
                              if (!headResponse.ok) {
                                if (headResponse.status === 401) {
                                  toast.error("❌ Erro de autenticação. Faça login novamente.");
                                  return;
                                } else if (headResponse.status === 404) {
                                  toast.error(`❌ Vídeo não encontrado: ${selectedVideo || 'arquivo'}`);
                                  return;
                                } else {
                                  toast.error(`❌ Erro ao acessar vídeo (${headResponse.status})`);
                                  return;
                                }
                              }
                              
                              console.log("✅ Arquivo de vídeo existe no servidor");
                              
                              // Construir URL com token se necessário para o elemento video
                              // O elemento video não envia headers customizados, então precisamos
                              // usar uma URL diferente ou token na query string
                              let videoUrlWithAuth = fullStreamUrl;
                              if (token && !fullStreamUrl.includes('token=')) {
                                // Adicionar token como query parameter (se o backend suportar)
                                const separator = fullStreamUrl.includes('?') ? '&' : '?';
                                videoUrlWithAuth = `${fullStreamUrl}${separator}token=${token}`;
                              }
                              
                              // Configurar eventos do vídeo ANTES de definir src
                              let retriedWithoutToken = false;
                              const cleanupVideoListeners = () => {
                                video.onloadeddata = null;
                                video.onloadedmetadata = null;
                                video.onerror = null;
                              };

                              video.onloadeddata = () => {
                                console.log("✅ Vídeo carregado com sucesso");
                                cleanupVideoListeners();
                                video.play().catch(err => {
                                  console.error("Erro ao reproduzir vídeo:", err);
                                  toast.error("Erro ao reproduzir vídeo.");
                                });
                              };

                              video.oncanplay = () => {
                                console.log("🎬 canplay: vídeo pronto para iniciar");
                                video.play().catch(() => {});
                              };

                              video.onplaying = () => {
                                console.log("▶️ playing: vídeo em reprodução");
                              };

                              video.onerror = async () => {
                                console.error("❌ Erro no elemento video. URL tentada:", video.src);
                                if (token && !retriedWithoutToken && video.src.includes('token=')) {
                                  retriedWithoutToken = true;
                                  console.log("Tentando novamente sem token na URL...");
                                  // Trocar para URL sem token apenas uma vez
                                  video.src = fullStreamUrl;
                                  return;
                                }

                                // Fallback final: baixar como blob e tocar via ObjectURL
                                try {
                                  console.log("↘️ Fallback: baixando arquivo como blob...");
                                  const authToken = localStorage.getItem('access_token');
                                  const blobResp = await fetch(fullStreamUrl + (authToken ? `?token=${authToken}` : ''), {
                                    // Forçar download completo
                                    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined,
                                    cache: 'no-store'
                                  });
                                  if (!blobResp.ok) throw new Error(`HTTP ${blobResp.status}`);
                                  const blob = await blobResp.blob();
                                  const objectUrl = URL.createObjectURL(blob);
                                  cleanupVideoListeners();
                                  video.onloadeddata = () => {
                                    URL.revokeObjectURL(objectUrl);
                                    video.play().catch(() => {});
                                  };
                                  video.srcObject = null;
                                  video.src = objectUrl;
                                } catch (blobErr: any) {
                                  console.error("❌ Fallback blob falhou:", blobErr);
                                  cleanupVideoListeners();
                                  toast.error("Não foi possível carregar o vídeo.");
                                }
                              };

                              video.onloadedmetadata = () => {
                                console.log("✅ Metadados do vídeo carregados");
                                console.log("Duração:", video.duration, "segundos");
                                console.log("Dimensões:", video.videoWidth, "x", video.videoHeight);
                              };

                              // Carregar o vídeo (uma única vez)
                              video.src = videoUrlWithAuth;
                              
                            } catch (fetchError: any) {
                              console.error("Erro ao verificar arquivo:", fetchError);
                              toast.error(`Erro ao verificar vídeo: ${fetchError.message}`);
                            }
                          }, 300);
                          
                          toast.success(`✅ Vídeo "${video.filename}" carregado`);
                        }} 
                        size="sm" 
                        variant="outline"
                        disabled={!selectedVideo}
                      >
                        Usar Vídeo
                      </Button>
                      <Button 
                        onClick={loadDownloadedVideos} 
                        size="sm" 
                        variant="ghost"
                        title="Atualizar lista de vídeos"
                      >
                        ↻
                      </Button>
                    </div>
                  </div>

                  {/* Câmera para Vídeo */}
                  {(isVideoMode || selectedVideo) && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Câmera para Detecção</Label>
                      <Select 
                        value={selectedCameraForVideo || selectedCamera} 
                        onValueChange={(value) => {
                          setSelectedCameraForVideo(value);
                          setSelectedCamera(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a câmera..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCameras.length === 0 ? (
                            <SelectItem value="no-cameras" disabled>
                              Nenhuma câmera disponível
                            </SelectItem>
                          ) : (
                            availableCameras.map((camera) => (
                              <SelectItem key={camera.id} value={camera.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    camera.status === 'online' ? 'bg-green-500' : 
                                    camera.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`} />
                                  <span>{camera.name}</span>
                                  {camera.location && (
                                    <span className="text-muted-foreground text-xs">({camera.location})</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedCameraForVideo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Esta câmera será usada para associar os eventos de detecção
                        </p>
                      )}
                    </div>
                  )}

                  {/* Controles */}
                  <div className="flex items-center gap-2">
                    {(isVideoMode || isYoutubeMode) && (
                      <Button onClick={switchToLiveCamera} size="sm" variant="outline">
                        Câmera ao Vivo
                      </Button>
                    )}
                    {isYoutubeMode && (
                      <Badge variant="secondary" className="bg-red-600">
                        YouTube
                      </Badge>
                    )}
                  </div>
                  
                  {/* Informações */}
                  {uploadedVideo && (
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Arquivo:</strong> {uploadedVideo.name}</p>
                      <p><strong>Tamanho:</strong> {(uploadedVideo.size / 1024 / 1024).toFixed(2)} MB</p>
                      <p><strong>Tipo:</strong> {uploadedVideo.type}</p>
                      {isVideoMode && !isYoutubeMode && (
                        <p className="text-green-600 font-medium">✅ Vídeo carregado e reproduzindo</p>
                      )}
                    </div>
                  )}

                  {isYoutubeMode && (
                    <div className="text-sm text-muted-foreground">
                      <p><strong>YouTube:</strong> {youtubeUrl}</p>
                      <p className="text-green-600 font-medium">✅ Vídeo do YouTube processado e pronto para detecção</p>
                    </div>
                  )}

                  {selectedVideo && (
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Vídeo selecionado:</strong> {selectedVideo}</p>
                      {selectedCameraForVideo && (
                        <p><strong>Câmera associada:</strong> {availableCameras.find(c => c.id.toString() === selectedCameraForVideo)?.name || 'Nenhuma'}</p>
                      )}
                      {isVideoMode && (
                        <p className="text-green-600 font-medium">✅ Vídeo carregado e pronto para detecção</p>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    💡 <strong>Dica:</strong> Agora você pode usar URLs do YouTube diretamente! O sistema baixa e processa automaticamente.
                  </div>
                </div>
              </div>
              
              <div className="relative">
                {/* Video da câmera ou vídeo carregado */}
                <video
                  ref={videoRef}
                  width={800}
                  height={600}
                  className={(isVideoMode || selectedVideo) ? "border border-border rounded-lg" : "hidden"}
                  autoPlay
                  muted
                  playsInline
                  controls
                  preload="auto"
                  src={(isVideoMode || selectedVideo) ? videoUrl : undefined}
                />
                
                {/* Canvas sobreposto para desenho e detecção */}
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="border border-border rounded-lg cursor-crosshair absolute top-0 left-0 bg-transparent"
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                />
                
                {/* Controles de Desenho */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {!isDrawing ? (
                    <Button onClick={startDrawing} size="sm" variant="outline">
                      <MapPin className="w-4 h-4 mr-2" />
                      Desenhar Área
                    </Button>
                  ) : (
                    <>
                      <Button onClick={finishDrawing} size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finalizar
                      </Button>
                      <Button onClick={clearCurrentDrawing} size="sm" variant="outline">
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
                
                {/* Input para nome da área */}
                {showNameInput && (
                  <div className="absolute top-16 left-4 bg-white p-4 rounded-lg shadow-lg border border-border">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="areaName" className="text-sm font-medium">
                          Nome da Área:
                        </Label>
                        <Input
                          id="areaName"
                          value={areaName}
                          onChange={(e) => setAreaName(e.target.value)}
                          placeholder="Ex: Área de Entrada"
                          className="mt-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              confirmAreaName();
                            } else if (e.key === 'Escape') {
                              cancelAreaName();
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={confirmAreaName} size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirmar
                        </Button>
                        <Button onClick={cancelAreaName} size="sm" variant="outline">
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Painel Lateral */}
          <div className="space-y-6">
            {/* Áreas Criadas */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Áreas Criadas ({testAreas.length})
              </h3>
              
              <div className="space-y-3">
                {testAreas.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhuma área criada ainda. Desenhe uma área no canvas.
                  </p>
                ) : (
                  testAreas.map(area => (
                    <div key={area.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{area.name}</h4>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={area.isActive ? "default" : "outline"}
                            onClick={() => toggleArea(area.id)}
                          >
                            {area.isActive ? "Ativa" : "Inativa"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteArea(area.id)}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Pontos: {area.points.length}</p>
                        <p>Intrusões: {area.intrusionCount}</p>
                        {area.lastIntrusion && (
                          <p>Última: {area.lastIntrusion.toLocaleTimeString()}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Alertas */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Alertas ({alerts.length})
                </h3>
                {alerts.length > 0 && (
                  <Button onClick={clearAlerts} size="sm" variant="outline">
                    Limpar
                  </Button>
                )}
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhum alerta ainda. Inicie o monitoramento para detectar intrusões.
                  </p>
                ) : (
                  alerts.map(alert => (
                    <Alert key={alert.id} className={`${
                      alert.type === 'intrusion' ? 'border-red-500 bg-red-50' :
                      alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {alert.message}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {alert.timestamp.toLocaleTimeString()}
                        </span>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </Card>

            {/* Informações da Câmera */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Câmera Selecionada
              </h3>
              
              {selectedCamera ? (
                (() => {
                  const camera = availableCameras.find(c => c.id.toString() === selectedCamera);
                  return camera ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          camera.status === 'online' ? 'bg-green-500' : 
                          camera.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium">{camera.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <div><strong>Localização:</strong> {camera.location || 'Não especificada'}</div>
                        <div className="flex items-center gap-2">
                          <strong>Status:</strong> 
                          <Badge 
                            variant={
                              camera.status === 'online' ? "default" : 
                              camera.status === 'maintenance' ? "secondary" : "destructive"
                            }
                          >
                            {camera.status === 'online' ? 'Online' : 
                             camera.status === 'maintenance' ? 'Manutenção' : 'Offline'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <strong>Detecção:</strong> 
                          <Badge 
                            variant={camera.detection_enabled ? "default" : "secondary"}
                          >
                            {camera.detection_enabled ? 'Ativa' : 'Desabilitada'}
                          </Badge>
                        </div>
                        <div>
                          <strong>Stream:</strong> 
                          <code className="text-xs bg-muted px-1 rounded ml-1">
                            {camera.stream_url.length > 30 
                              ? `${camera.stream_url.substring(0, 30)}...` 
                              : camera.stream_url}
                          </code>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nenhuma câmera selecionada
                </p>
              )}
            </Card>

            {/* Estatísticas */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Estatísticas
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Áreas Ativas:</span>
                  <span className="font-medium">{testAreas.filter(a => a.isActive).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Intrusões:</span>
                  <span className="font-medium text-red-600">
                    {testAreas.reduce((sum, a) => sum + a.intrusionCount, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={isMonitoring ? "default" : "secondary"}>
                    {isMonitoring ? "Monitorando" : "Parado"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Câmera:</span>
                  <span className="font-medium text-sm">
                    {selectedCamera ? availableCameras.find(c => c.id.toString() === selectedCamera)?.name : "Nenhuma"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Câmeras:</span>
                  <span className="font-medium">{availableCameras.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Câmeras Online:</span>
                  <span className="font-medium text-green-600">
                    {availableCameras.filter(c => c.status === 'online').length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TestArea;
