import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  X, 
  Calendar, 
  Camera, 
  MapPin, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Clock,
  Eye,
  Bell,
  Activity
} from 'lucide-react';

interface Notification {
  id: number;
  type: "alert" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  cameraName?: string;
}

interface NotificationDetailsProps {
  notification: Notification;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (id: number) => void;
}

const NotificationDetails = ({ notification, isOpen, onClose, onMarkAsRead }: NotificationDetailsProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="w-6 h-6 text-destructive" />;
      case "success":
        return <CheckCircle className="w-6 h-6 text-success" />;
      default:
        return <Info className="w-6 h-6 text-primary" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "alert":
        return "bg-destructive/10 border-destructive/20 text-destructive";
      case "success":
        return "bg-success/10 border-success/20 text-success";
      default:
        return "bg-primary/10 border-primary/20 text-primary";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "alert":
        return "ALERTA CRÍTICO";
      case "success":
        return "SUCESSO";
      default:
        return "INFORMAÇÃO";
    }
  };

  const formatDate = (dateString: string) => {
    // Se for uma string relativa como "Há 5 minutos"
    if (dateString.includes("Há")) {
      return dateString;
    }
    
    // Se for uma data ISO
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('pt-BR'),
        time: date.toLocaleTimeString('pt-BR'),
        full: date.toLocaleString('pt-BR')
      };
    } catch {
      return dateString;
    }
  };

  const handleMarkAsRead = () => {
    if (onMarkAsRead && !notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon(notification.type)}
            Detalhes da Notificação
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a notificação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getTypeColor(notification.type)} flex items-center gap-1`}>
                  {getIcon(notification.type)}
                  {getTypeLabel(notification.type)}
                </Badge>
                {!notification.read && (
                  <Badge variant="destructive" className="text-xs">
                    NOVO
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {notification.title}
              </h2>
            </div>
          </div>

          {/* Content */}
          <Card className="p-4 bg-background border-border">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Mensagem
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {notification.message}
                </p>
              </div>

              {/* Camera Info */}
              {notification.cameraName && (
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Câmera Relacionada
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{notification.cameraName}</span>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timestamp
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {typeof formatDate(notification.timestamp) === 'string' 
                      ? formatDate(notification.timestamp) 
                      : formatDate(notification.timestamp).full
                    }
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Status
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant={notification.read ? "default" : "secondary"}>
                    {notification.read ? "Lida" : "Não lida"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {notification.read ? "Notificação já foi visualizada" : "Notificação ainda não foi visualizada"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="flex gap-2">
              {!notification.read && onMarkAsRead && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMarkAsRead}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar como Lida
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDetails;
