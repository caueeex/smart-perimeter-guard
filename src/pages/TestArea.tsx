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
import { cameraService, eventService } from "@/services/api";
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
  useEffect(() => {
    if (selectedCamera && availableCameras.length > 0) {
      const camera = availableCameras.find(c => c.id.toString() === selectedCamera);
      if (camera && camera.status === 'online' && camera.detection_enabled) {
        startCameraStream(camera);
      }
    }
  }, [selectedCamera, availableCameras]);

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
        hasVideo: !!videoRef.current
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
            videoHeight: video?.videoHeight
          });
          return;
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
                          const cameraIdNum = parseInt(selectedCamera || '0', 10);
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
  }, [isMonitoring, testAreas]);

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
    
    if (!selectedCamera) {
      toast.error("Selecione uma câmera antes de iniciar o monitoramento!");
      return;
    }
    
    const camera = availableCameras.find(c => c.id.toString() === selectedCamera);
    
    if (!camera) {
      toast.error("Câmera não encontrada!");
      return;
    }
    
    if (camera.status === 'offline') {
      toast.error("A câmera selecionada está offline!");
      return;
    }
    
    if (!camera.detection_enabled) {
      toast.error("A detecção está desabilitada para esta câmera!");
      return;
    }
    
    if (!detectionModelRef.current) {
      toast.error("Modelo de IA ainda não carregou. Aguarde alguns segundos.");
      return;
    }
    
    // Iniciar stream da câmera
    await startCameraStream(camera);
    
    // Aguardar um pouco para a câmera carregar
    setTimeout(() => {
      setIsMonitoring(true);
      toast.success(`Monitoramento iniciado com ${camera.name}!`);
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
        
        video.srcObject = stream;
        
        // Aguardar o vídeo carregar
        video.onloadedmetadata = () => {
          video.play();
          toast.success(`${camera.name} conectada com sucesso!`);
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

  const captureScreenshot = async (areaName: string, objectClass: string) => {
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video) return;

      // Obter ID da câmera para associar ao evento
      const camera = availableCameras.find(c => c.id.toString() === selectedCamera);

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
      const hasVideoSource = video && video.videoWidth > 0 && video.videoHeight > 0 && video.srcObject;
      
      if (hasVideoSource) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Fundo padrão
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!isMonitoring) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '18px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Selecione uma câmera e inicie o monitoramento', canvas.width/2, canvas.height/2);
        }
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
  }, [testAreas, currentPoints, detectionResults, isMonitoring]);

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
                </div>
              </div>
              
              <div className="relative w-full flex justify-center items-center">
                {/* Video da câmera */}
                <video
                  ref={videoRef}
                  width={800}
                  height={600}
                  className="hidden"
                  autoPlay
                  muted
                  playsInline
                />
                
                {/* Canvas sobreposto para desenho e detecção */}
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="border border-border rounded-lg cursor-crosshair w-full max-w-full h-auto relative"
                  style={{ maxWidth: '800px', maxHeight: '600px' }}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                />
                
                {/* Controles de Desenho */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
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
                  <div className="absolute top-16 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border border-border">
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
