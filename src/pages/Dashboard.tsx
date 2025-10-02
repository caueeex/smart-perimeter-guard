import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, AlertTriangle, Activity, TrendingUp, Eye, Users } from "lucide-react";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const [stats] = useState({
    totalCameras: 8,
    activeAlerts: 3,
    todayEvents: 24,
    detectionRate: 94.2,
  });

  return (
    <Layout>
      <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central de Monitoramento</h1>
          <p className="text-muted-foreground mt-1">Sistema Inteligente de Vigilância</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
          <Camera className="w-4 h-4 mr-2" />
          Nova Câmera
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Câmeras Ativas</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.totalCameras}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Camera className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-success">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>100% operacional</span>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alertas Ativos</p>
              <p className="text-3xl font-bold text-warning mt-2">{stats.activeAlerts}</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-muted-foreground">
            <Activity className="w-4 h-4 mr-1" />
            <span>Requer atenção</span>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Eventos Hoje</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.todayEvents}</p>
            </div>
            <div className="p-3 bg-accent/10 rounded-lg">
              <Eye className="w-6 h-6 text-accent" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-success">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+12% vs ontem</span>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Detecção</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.detectionRate}%</p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <Users className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-success">
            <Activity className="w-4 h-4 mr-1" />
            <span>Acurácia alta</span>
          </div>
        </Card>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((cam) => (
          <Card key={cam} className="overflow-hidden bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="aspect-video bg-muted relative group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-4 right-4 flex gap-2">
                <span className="px-3 py-1 bg-success text-success-foreground text-xs font-semibold rounded-full flex items-center gap-1">
                  <div className="w-2 h-2 bg-success-foreground rounded-full animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button variant="secondary" size="sm" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar ao Vivo
                </Button>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground">Câmera {cam}</h3>
              <p className="text-sm text-muted-foreground mt-1">Setor {Math.ceil(cam / 2)}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Última detecção: 5 min</span>
                <Button variant="ghost" size="sm">Configurar</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
