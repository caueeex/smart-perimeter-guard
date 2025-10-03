import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Camera, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface DetectionStatus {
  total_cameras: number;
  active_cameras: number;
  detection_enabled: boolean;
  recent_events_24h: number;
  event_types: Record<string, number>;
  system_uptime: number;
  last_update: string;
}

interface CameraStatus {
  camera_id: number;
  name: string;
  detection_enabled: boolean;
  is_monitored: boolean;
  sensitivity: number;
  has_detection_line: boolean;
  has_detection_zone: boolean;
  recent_events: Array<{
    id: number;
    type: string;
    confidence: number;
    timestamp: string;
    description: string;
  }>;
  last_update: string;
}

const DetectionMonitor = () => {
  const [systemStatus, setSystemStatus] = useState<DetectionStatus | null>(null);
  const [cameraStatuses, setCameraStatuses] = useState<CameraStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchSystemStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/v1/monitoring/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erro ao buscar status do sistema:', error);
    }
  };

  const fetchCameraStatuses = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Buscar todas as câmeras primeiro
      const camerasResponse = await fetch('http://localhost:8000/api/v1/cameras/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (camerasResponse.ok) {
        const cameras = await camerasResponse.json();
        
        // Buscar status de cada câmera
        const statusPromises = cameras.map(async (camera: any) => {
          const statusResponse = await fetch(`http://localhost:8000/api/v1/monitoring/cameras/${camera.id}/status`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (statusResponse.ok) {
            return await statusResponse.json();
          }
          return null;
        });

        const statuses = await Promise.all(statusPromises);
        setCameraStatuses(statuses.filter(status => status !== null));
      }
    } catch (error) {
      console.error('Erro ao buscar status das câmeras:', error);
    }
  };

  const restartCameraDetection = async (cameraId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/v1/monitoring/cameras/${cameraId}/restart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Detecção da câmera reiniciada');
        fetchCameraStatuses();
      } else {
        toast.error('Erro ao reiniciar detecção');
      }
    } catch (error) {
      console.error('Erro ao reiniciar detecção:', error);
      toast.error('Erro ao reiniciar detecção');
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([fetchSystemStatus(), fetchCameraStatuses()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(refreshData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? CheckCircle : XCircle;
  };

  if (isLoading && !systemStatus) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Carregando status do sistema...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Geral do Sistema */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status do Sistema de Detecção
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Última atualização: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {systemStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{systemStatus.total_cameras}</div>
              <div className="text-sm text-muted-foreground">Total de Câmeras</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{systemStatus.active_cameras}</div>
              <div className="text-sm text-muted-foreground">Câmeras Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{systemStatus.recent_events_24h}</div>
              <div className="text-sm text-muted-foreground">Eventos (24h)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {formatUptime(Date.now() / 1000 - systemStatus.system_uptime)}
              </div>
              <div className="text-sm text-muted-foreground">Tempo Ativo</div>
            </div>
          </div>
        )}

        {/* Tipos de Eventos */}
        {systemStatus?.event_types && Object.keys(systemStatus.event_types).length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-foreground mb-2">Eventos por Tipo (24h)</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(systemStatus.event_types).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Status das Câmeras */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Status das Câmeras
        </h3>

        <div className="space-y-4">
          {cameraStatuses.map((camera) => {
            const StatusIcon = getStatusIcon(camera.is_monitored);
            
            return (
              <div key={camera.camera_id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-5 h-5 ${getStatusColor(camera.is_monitored)}`} />
                    <h4 className="font-medium text-foreground">{camera.name}</h4>
                    <Badge variant={camera.detection_enabled ? "default" : "secondary"}>
                      {camera.detection_enabled ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restartCameraDetection(camera.camera_id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reiniciar
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sensibilidade:</span>
                    <div className="font-medium">{camera.sensitivity}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Linha:</span>
                    <div className="font-medium">
                      {camera.has_detection_line ? "✅" : "❌"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Zona:</span>
                    <div className="font-medium">
                      {camera.has_detection_zone ? "✅" : "❌"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monitorado:</span>
                    <div className={`font-medium ${getStatusColor(camera.is_monitored)}`}>
                      {camera.is_monitored ? "Sim" : "Não"}
                    </div>
                  </div>
                </div>

                {/* Eventos Recentes */}
                {camera.recent_events.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Eventos Recentes
                    </h5>
                    <div className="space-y-1">
                      {camera.recent_events.slice(0, 3).map((event) => (
                        <div key={event.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <span>{event.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(event.confidence * 100)}%
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default DetectionMonitor;
