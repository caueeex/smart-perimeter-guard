/**
 * Serviço de API para comunicação com o backend Python
 */
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Instância do axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Tipos de dados
export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Camera {
  id: number;
  name: string;
  location?: string;
  stream_url: string;
  zone?: string;
  status: 'online' | 'offline' | 'maintenance';
  detection_enabled: boolean;
  detection_line?: any;
  detection_zone?: any;
  sensitivity: number;
  fps: number;
  resolution: string;
  created_at: string;
  updated_at?: string;
}

export interface Event {
  id: number;
  camera_id: number;
  event_type: 'intrusion' | 'movement' | 'alert';
  timestamp: string;
  description?: string;
  confidence?: number;
  image_path?: string;
  video_path?: string;
  detected_objects?: any[];
  bounding_boxes?: any[];
  heatmap_data?: any;
  is_processed: boolean;
  is_notified: boolean;
  created_at: string;
  camera?: Camera;
}

export interface EventStats {
  total_events: number;
  events_today: number;
  events_this_week: number;
  events_this_month: number;
  intrusion_count: number;
  movement_count: number;
  alert_count: number;
  most_active_camera?: string;
  peak_hour?: number;
}

export interface CameraStats {
  total_cameras: number;
  online_cameras: number;
  offline_cameras: number;
  maintenance_cameras: number;
  detection_enabled: number;
  detection_disabled: number;
}

// Serviços de API
export const authService = {
  // Login
  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    return response.data;
  },

  // Registrar usuário
  register: async (userData: {
    email: string;
    username: string;
    password: string;
    full_name?: string;
    role?: 'admin' | 'user';
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Obter dados do usuário atual
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const cameraService = {
  // Listar câmeras
  getCameras: async (): Promise<Camera[]> => {
    const response = await api.get('/cameras/');
    return response.data;
  },

  // Obter câmera por ID
  getCamera: async (id: number): Promise<Camera> => {
    const response = await api.get(`/cameras/${id}`);
    return response.data;
  },

  // Criar câmera
  createCamera: async (cameraData: {
    name: string;
    location?: string;
    stream_url: string;
    zone?: string;
    detection_enabled?: boolean;
    sensitivity?: number;
    fps?: number;
    resolution?: string;
  }): Promise<Camera> => {
    const response = await api.post('/cameras/', cameraData);
    return response.data;
  },

  // Atualizar câmera
  updateCamera: async (id: number, cameraData: Partial<Camera>): Promise<Camera> => {
    const response = await api.put(`/cameras/${id}`, cameraData);
    return response.data;
  },

  // Deletar câmera
  deleteCamera: async (id: number): Promise<void> => {
    await api.delete(`/cameras/${id}`);
  },

  // Configurar linha de detecção
  configureDetectionLine: async (id: number, lineConfig: {
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    thickness?: number;
    color?: string;
  }): Promise<void> => {
    await api.post(`/cameras/${id}/configure-line`, lineConfig);
  },

  // Configurar zona de detecção
  configureDetectionZone: async (id: number, zoneConfig: {
    points: Array<{ x: number; y: number }>;
    color?: string;
    fill_color?: string;
  }): Promise<void> => {
    await api.post(`/cameras/${id}/configure-zone`, zoneConfig);
  },

  // Obter estatísticas das câmeras
  getCameraStats: async (): Promise<CameraStats> => {
    const response = await api.get('/cameras/stats/summary');
    return response.data;
  },
};

export const eventService = {
  // Listar eventos
  getEvents: async (params?: {
    skip?: number;
    limit?: number;
    camera_id?: number;
    event_type?: 'intrusion' | 'movement' | 'alert';
    start_date?: string;
    end_date?: string;
  }): Promise<Event[]> => {
    const response = await api.get('/events/', { params });
    return response.data;
  },

  // Obter evento por ID
  getEvent: async (id: number): Promise<Event> => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Obter eventos por câmera
  getEventsByCamera: async (cameraId: number, limit?: number): Promise<Event[]> => {
    const response = await api.get(`/events/camera/${cameraId}`, {
      params: { limit }
    });
    return response.data;
  },

  // Obter eventos recentes
  getRecentEvents: async (limit?: number): Promise<Event[]> => {
    const response = await api.get('/events/recent/list', {
      params: { limit }
    });
    return response.data;
  },

  // Obter estatísticas de eventos
  getEventStats: async (): Promise<EventStats> => {
    const response = await api.get('/events/stats/summary');
    return response.data;
  },

  // Marcar evento como notificado
  markEventAsNotified: async (id: number): Promise<void> => {
    await api.post(`/events/${id}/mark-notified`);
  },

  // Exportar eventos
  exportEvents: async (params?: {
    start_date?: string;
    end_date?: string;
    camera_id?: number;
    event_type?: 'intrusion' | 'movement' | 'alert';
  }): Promise<any[]> => {
    const response = await api.get('/events/export/data', { params });
    return response.data;
  },

  // Obter dados do heatmap
  getHeatmapData: async (cameraId: number, dateRange?: string): Promise<any> => {
    const response = await api.get(`/events/heatmap/${cameraId}`, {
      params: { date_range: dateRange }
    });
    return response.data;
  },
};

// Utilitários
export const apiUtils = {
  // Verificar se está autenticado
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  // Obter token
  getToken: (): string | null => {
    return localStorage.getItem('access_token');
  },

  // Salvar token
  setToken: (token: string): void => {
    localStorage.setItem('access_token', token);
  },

  // Remover token
  removeToken: (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  // Obter usuário
  getUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Salvar usuário
  setUser: (user: User): void => {
    localStorage.setItem('user', JSON.stringify(user));
  },
};

export default api;

