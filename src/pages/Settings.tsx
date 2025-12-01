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
  AlertTriangle,
  Edit,
  Loader2
} from "lucide-react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authService, apiUtils } from "@/services/api";
import { useSettings } from "@/contexts/SettingsContext";

const Settings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
  });

  const {
    notifications,
    detection,
    interface: interfaceSettings,
    updateNotifications,
    updateDetection,
    updateInterface,
    saveSettings,
  } = useSettings();

  useEffect(() => {
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
        setProfileData({
          full_name: cachedUser.full_name || "",
          email: cachedUser.email || "",
        });
      }
      
      // Depois atualiza com dados da API
      const user = await authService.getCurrentUser();
      setUserInfo(user);
      setProfileData({
        full_name: user.full_name || "",
        email: user.email || "",
      });
      apiUtils.setUser(user); // Atualizar cache
    } catch (error) {
      console.error("Erro ao carregar informações do usuário:", error);
      // Se falhar, usar dados do cache se existirem
      const cachedUser = apiUtils.getUser();
      if (cachedUser) {
        setUserInfo(cachedUser);
        setProfileData({
          full_name: cachedUser.full_name || "",
          email: cachedUser.email || "",
        });
      }
    }
  };

  const handleSaveAllSettings = async () => {
    setIsLoading(true);
    try {
      await saveSettings();
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validar dados antes de iniciar o loading
    if (!profileData.email || !profileData.email.includes('@')) {
      toast.error("Email inválido");
      return;
    }

    setIsSavingProfile(true);
    try {
      // Atualizar perfil via API
      const updatedUser = await authService.updateProfile({
        email: profileData.email,
        full_name: profileData.full_name,
      });

      // Atualizar estado e cache
      setUserInfo(updatedUser);
      apiUtils.setUser(updatedUser);
      setProfileData({
        full_name: updatedUser.full_name || "",
        email: updatedUser.email || "",
      });
      setIsEditingProfile(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      const errorMessage = error.response?.data?.detail || "Erro ao salvar perfil";
      toast.error(errorMessage);
    } finally {
      setIsSavingProfile(false);
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
            onClick={handleSaveAllSettings} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Informações do Perfil</h2>
                </div>
                {!isEditingProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                )}
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
                        value={isEditingProfile ? profileData.email : userInfo.email || ""}
                        disabled={!isEditingProfile}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={isEditingProfile ? profileData.full_name : userInfo.full_name || ""}
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className="mt-1"
                    />
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

                  {isEditingProfile && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="flex items-center gap-2"
                      >
                        {isSavingProfile ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Salvar Alterações
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileData({
                            full_name: userInfo.full_name || "",
                            email: userInfo.email || "",
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
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
                      updateNotifications({ email: checked })
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
                      updateNotifications({ push: checked })
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
                      updateNotifications({ sound: checked })
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
                      updateNotifications({ intrusion: checked })
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
                      updateNotifications({ movement: checked })
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
                      updateDetection({ confidence: value[0] })
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
                      updateDetection({ showBoundingBoxes: checked })
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
                      updateDetection({ showLabels: checked })
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
                      updateInterface({ refreshInterval: value[0] })
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
                      updateInterface({ autoRefresh: checked })
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
                      updateInterface({ language: e.target.value })
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
