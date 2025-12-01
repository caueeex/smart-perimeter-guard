import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sound: boolean;
  intrusion: boolean;
  movement: boolean;
}

interface DetectionSettings {
  confidence: number;
  showBoundingBoxes: boolean;
  showLabels: boolean;
}

interface InterfaceSettings {
  theme: string;
  language: string;
  autoRefresh: boolean;
  refreshInterval: number;
}

interface SettingsContextType {
  notifications: NotificationSettings;
  detection: DetectionSettings;
  interface: InterfaceSettings;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  updateDetection: (settings: Partial<DetectionSettings>) => void;
  updateInterface: (settings: Partial<InterfaceSettings>) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => void;
}

const defaultNotifications: NotificationSettings = {
  email: true,
  push: true,
  sound: true,
  intrusion: true,
  movement: true,
};

const defaultDetection: DetectionSettings = {
  confidence: 0.5,
  showBoundingBoxes: true,
  showLabels: true,
};

const defaultInterface: InterfaceSettings = {
  theme: 'dark',
  language: 'pt-BR',
  autoRefresh: true,
  refreshInterval: 5,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [detection, setDetection] = useState<DetectionSettings>(defaultDetection);
  const [interfaceSettings, setInterfaceSettings] = useState<InterfaceSettings>(defaultInterface);

  const loadSettings = () => {
    try {
      const savedNotifications = localStorage.getItem('settings_notifications');
      const savedDetection = localStorage.getItem('settings_detection');
      const savedInterface = localStorage.getItem('settings_interface');

      if (savedNotifications) {
        try {
          setNotifications(JSON.parse(savedNotifications));
        } catch (e) {
          console.warn('Erro ao parsear configurações de notificações:', e);
        }
      }
      if (savedDetection) {
        try {
          setDetection(JSON.parse(savedDetection));
        } catch (e) {
          console.warn('Erro ao parsear configurações de detecção:', e);
        }
      }
      if (savedInterface) {
        try {
          setInterfaceSettings(JSON.parse(savedInterface));
        } catch (e) {
          console.warn('Erro ao parsear configurações de interface:', e);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateNotifications = (settings: Partial<NotificationSettings>) => {
    setNotifications(prev => {
      const updated = { ...prev, ...settings };
      localStorage.setItem('settings_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const updateDetection = (settings: Partial<DetectionSettings>) => {
    setDetection(prev => {
      const updated = { ...prev, ...settings };
      localStorage.setItem('settings_detection', JSON.stringify(updated));
      return updated;
    });
  };

  const updateInterface = (settings: Partial<InterfaceSettings>) => {
    setInterfaceSettings(prev => {
      const updated = { ...prev, ...settings };
      localStorage.setItem('settings_interface', JSON.stringify(updated));
      return updated;
    });
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('settings_notifications', JSON.stringify(notifications));
      localStorage.setItem('settings_detection', JSON.stringify(detection));
      localStorage.setItem('settings_interface', JSON.stringify(interfaceSettings));
      return Promise.resolve();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      return Promise.reject(error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        notifications,
        detection,
        interface: interfaceSettings,
        updateNotifications,
        updateDetection,
        updateInterface,
        saveSettings,
        loadSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider');
  }
  return context;
};

