import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Monitor, 
  Save,
  Info,
  Eye,
  AlertTriangle
} from "lucide-react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authService, apiUtils } from "@/services/api";

const Settings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  
  // Configurações de Notificações
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sound: true,
    intrusion: true,
    movement: true,
  });

  // Configurações de Detecção
  const [detection, setDetection] = useState({
    confidence: 0.5,
    showBoundingBoxes: true,
    showLabels: true,
  });

  // Configurações de Interface
  const [interfaceSettings, setInterfaceSettings] = useState({
    theme: "dark",
    language: "pt-BR",
    autoRefresh: true,
    refreshInterval: 5,
  });

  useEffect(() => {
    // Carregar configurações primeiro (síncrono, não pode travar)
    loadSettings();
    
    // Carregar informações do usuário depois (assíncrono)
    loadUserInfo().catch((error) => {
      console.error("Erro ao carregar informações do usuário:", error);
    });
  }, []);

  const loadUserInfo = async () => {
    try {
      // Primeiro tenta pegar do localStorage (mais rápido)
      const cachedUser = apiUtils.getUser();
      if (cachedUser) {
        setUserInfo(cachedUser);
      }
      
      // Depois atualiza com dados da API
      const user = await authService.getCurrentUser();
      setUserInfo(user);
      apiUtils.setUser(user); // Atualizar cache
    } catch (error) {
      console.error("Erro ao carregar informações do usuário:", error);
      // Se falhar, usar dados do cache se existirem
      const cachedUser = apiUtils.getUser();
      if (cachedUser) {
        setUserInfo(cachedUser);
      }
    }
  };

  const loadSettings = () => {
    try {
      // Carregar configurações do localStorage
      const savedNotifications = localStorage.getItem("settings_notifications");
      const savedDetection = localStorage.getItem("settings_detection");
      const savedInterface = localStorage.getItem("settings_interface");

      if (savedNotifications) {
        try {
          setNotifications(JSON.parse(savedNotifications));
        } catch (e) {
          console.warn("Erro ao parsear configurações de notificações:", e);
        }
      }
      if (savedDetection) {
        try {
          setDetection(JSON.parse(savedDetection));
        } catch (e) {
          console.warn("Erro ao parsear configurações de detecção:", e);
        }
      }
      if (savedInterface) {
        try {
          setInterfaceSettings(JSON.parse(savedInterface));
        } catch (e) {
          console.warn("Erro ao parsear configurações de interface:", e);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Salvar no localStorage
      localStorage.setItem("settings_notifications", JSON.stringify(notifications));
      localStorage.setItem("settings_detection", JSON.stringify(detection));
      localStorage.setItem("settings_interface", JSON.stringify(interfaceSettings));

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <SettingsIcon className="w-8 h-8" />
              Configurações
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as configurações do sistema e suas preferências
            </p>
          </div>
          <Button 
            onClick={saveSettings} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Todas
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="detection">
              <Eye className="w-4 h-4 mr-2" />
              Detecção
            </TabsTrigger>
            <TabsTrigger value="system">
              <Monitor className="w-4 h-4 mr-2" />
              Sistema
            </TabsTrigger>
          </TabsList>

          {/* Aba Perfil */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Informações do Perfil</h2>
              </div>
              
              {userInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Nome de Usuário</Label>
                      <Input
                        id="username"
                        value={userInfo.username || ""}
                        disabled
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={userInfo.email || ""}
                        disabled
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Função</Label>
                    <Input
                      id="role"
                      value={userInfo.is_admin ? "Administrador" : "Usuário"}
                      disabled
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Carregando informações...</p>
              )}
            </Card>
          </TabsContent>

          {/* Aba Notificações */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Preferências de Notificação</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-email">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas por email
                    </p>
                  </div>
                  <Switch
                    id="notif-email"
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-push">Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações no navegador
                    </p>
                  </div>
                  <Switch
                    id="notif-push"
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, push: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-sound">Som de Alerta</Label>
                    <p className="text-sm text-muted-foreground">
                      Reproduzir som quando houver alertas
                    </p>
                  </div>
                  <Switch
                    id="notif-sound"
                    checked={notifications.sound}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, sound: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-intrusion">Alertas de Intrusão</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar sobre detecções de intrusão
                    </p>
                  </div>
                  <Switch
                    id="notif-intrusion"
                    checked={notifications.intrusion}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, intrusion: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-movement">Alertas de Movimento</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar sobre detecções de movimento
                    </p>
                  </div>
                  <Switch
                    id="notif-movement"
                    checked={notifications.movement}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, movement: checked })
                    }
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Aba Detecção */}
          <TabsContent value="detection" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Eye className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Configurações de Detecção</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="confidence">
                    Limiar de Confiança: {(detection.confidence * 100).toFixed(0)}%
                  </Label>
                  <Slider
                    id="confidence"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={[detection.confidence]}
                    onValueChange={(value) =>
                      setDetection({
                        ...detection,
                        confidence: value[0],
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Ajuste o nível mínimo de confiança para detecções (0.1 = 10%, 1.0 = 100%)
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-bboxes">Mostrar Caixas de Detecção</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibir retângulos ao redor dos objetos detectados
                    </p>
                  </div>
                  <Switch
                    id="show-bboxes"
                    checked={detection.showBoundingBoxes}
                    onCheckedChange={(checked) =>
                      setDetection({ ...detection, showBoundingBoxes: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-labels">Mostrar Rótulos</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibir nomes e confiança dos objetos detectados
                    </p>
                  </div>
                  <Switch
                    id="show-labels"
                    checked={detection.showLabels}
                    onCheckedChange={(checked) =>
                      setDetection({ ...detection, showLabels: checked })
                    }
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Aba Sistema */}
          <TabsContent value="system" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Monitor className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Configurações do Sistema</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="refresh-interval">
                    Intervalo de Atualização: {interfaceSettings.refreshInterval}s
                  </Label>
                  <Slider
                    id="refresh-interval"
                    min={1}
                    max={60}
                    step={1}
                    value={[interfaceSettings.refreshInterval]}
                    onValueChange={(value) =>
                      setInterfaceSettings({
                        ...interfaceSettings,
                        refreshInterval: value[0],
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Tempo entre atualizações automáticas dos dados
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-refresh">Atualização Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Atualizar dados automaticamente
                    </p>
                  </div>
                  <Switch
                    id="auto-refresh"
                    checked={interfaceSettings.autoRefresh}
                    onCheckedChange={(checked) =>
                      setInterfaceSettings({
                        ...interfaceSettings,
                        autoRefresh: checked,
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <select
                    id="language"
                    value={interfaceSettings.language}
                    onChange={(e) =>
                      setInterfaceSettings({
                        ...interfaceSettings,
                        language: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Info className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Informações do Sistema</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Versão</Label>
                    <p className="text-foreground font-medium">1.0.0</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ambiente</Label>
                    <p className="text-foreground font-medium">
                      {import.meta.env.MODE === "development" ? "Desenvolvimento" : "Produção"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;

