import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, AlertTriangle, Info, CheckCircle, Eye } from "lucide-react";
import Layout from "@/components/Layout";
import NotificationDetails from "@/components/NotificationDetails";
import { useState } from "react";
import { toast } from "sonner";

interface Notification {
  id: number;
  type: "alert" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  cameraName?: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: "alert",
      title: "Invasão Detectada",
      message: "Movimento suspeito detectado na linha de segurança. O sistema identificou uma pessoa não autorizada cruzando a área restrita. A detecção ocorreu com 95% de confiança. Recomenda-se verificação imediata da área e contato com a equipe de segurança.",
      timestamp: "Há 5 minutos",
      read: false,
      cameraName: "Câmera 1 - Entrada Principal",
    },
    {
      id: 2,
      type: "alert",
      title: "Zona Violada",
      message: "Objeto não autorizado cruzou a linha de detecção no estacionamento. O sistema detectou movimento em área restrita durante horário não permitido. Verifique as imagens capturadas para identificar o objeto detectado.",
      timestamp: "Há 12 minutos",
      read: false,
      cameraName: "Câmera 3 - Estacionamento",
    },
    {
      id: 3,
      type: "info",
      title: "Câmera Offline",
      message: "Câmera 4 perdeu conexão com o servidor principal. Tentativas de reconexão automática estão sendo realizadas. Verifique a conexão de rede e o status do equipamento.",
      timestamp: "Há 1 hora",
      read: true,
      cameraName: "Câmera 4 - Corredor A",
    },
    {
      id: 4,
      type: "success",
      title: "Sistema Atualizado",
      message: "Módulo de IA atualizado para versão 2.1 com melhorias na detecção de objetos e redução de falsos positivos. O sistema agora possui maior precisão na identificação de intrusões.",
      timestamp: "Há 3 horas",
      read: true,
    },
  ]);

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "alert":
        return "bg-destructive/10 border-destructive/20";
      case "success":
        return "bg-success/10 border-success/20";
      default:
        return "bg-primary/10 border-primary/20";
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    toast.success("Notificação marcada como lida");
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success("Notificação removida");
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("Todas notificações marcadas como lidas");
  };

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailsDialogOpen(true);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bell className="w-8 h-8" />
              Notificações
              {unreadCount > 0 && (
                <Badge className="bg-destructive text-destructive-foreground">
                  {unreadCount} novas
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">Central de alertas e eventos do sistema</p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" className="border-border">
              <Check className="w-4 h-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card border-border shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground mt-1">{notifications.length}</p>
              </div>
              <Bell className="w-8 h-8 text-primary" />
            </div>
          </Card>
          <Card className="p-6 bg-card border-border shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Não Lidas</p>
                <p className="text-2xl font-bold text-warning mt-1">{unreadCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </Card>
          <Card className="p-6 bg-card border-border shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  {notifications.filter(n => n.type === "alert" && !n.read).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </Card>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-6 ${getTypeColor(notification.type)} ${
                !notification.read ? "border-l-4" : ""
              } border-border hover:shadow-glow transition-all duration-300`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-card">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        {notification.title}
                        {!notification.read && (
                          <Badge variant="destructive" className="text-xs">
                            NOVO
                          </Badge>
                        )}
                      </h3>
                      {notification.cameraName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.cameraName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {notification.timestamp}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-4">{notification.message}</p>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        onClick={() => markAsRead(notification.id)}
                        variant="outline"
                        size="sm"
                        className="border-border"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Marcar como lida
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-border"
                      onClick={() => handleViewDetails(notification)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <Button
                      onClick={() => deleteNotification(notification.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {notifications.length === 0 && (
          <Card className="p-12 bg-card border-border text-center">
            <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma notificação</h3>
            <p className="text-muted-foreground">
              Você está em dia! Não há notificações no momento.
            </p>
          </Card>
        )}

        {/* Notification Details Dialog */}
        {selectedNotification && (
          <NotificationDetails
            notification={selectedNotification}
            isOpen={isDetailsDialogOpen}
            onClose={() => {
              setIsDetailsDialogOpen(false);
              setSelectedNotification(null);
            }}
            onMarkAsRead={markAsRead}
          />
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
