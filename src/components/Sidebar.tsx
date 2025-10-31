import { Shield, LayoutDashboard, Camera, History, Settings, LogOut, Bell, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Camera, label: "Câmeras", path: "/cameras" },
    { icon: History, label: "Eventos", path: "/events", badge: 3 },
    { icon: Bell, label: "Notificações", path: "/notifications", badge: 2 },
    { icon: TestTube, label: "Área de Teste", path: "/test-area" },
    { icon: Settings, label: "Configurações", path: "/settings" },
  ];

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">SecureVision</h2>
            <p className="text-xs text-muted-foreground">Monitoramento IA</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 mr-3" />
              {item.label}
              {item.badge && (
                <Badge className="ml-auto bg-destructive text-destructive-foreground">
                  {item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border space-y-2">
        <div className="flex items-center gap-3 px-2 py-3 rounded-lg bg-muted">
          <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Administrador</p>
            <p className="text-xs text-muted-foreground truncate">admin@securevision.com</p>
          </div>
        </div>
        <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive">
          <LogOut className="w-4 h-4 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
