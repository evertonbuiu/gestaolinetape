import { useState, useEffect } from "react";
import { Package, Settings, BarChart3, Calendar, Home, Users, Wrench, LogOut, Cog, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const { signOut, userRole, hasPermission } = useAuth();
  const [canAccessSettings, setCanAccessSettings] = useState(false);
  const [canAccessClients, setCanAccessClients] = useState(false);
  
  useEffect(() => {
    const checkPermissions = async () => {
      const canAccessSettingsResult = await hasPermission('settings_access', 'view');
      const canAccessClientsResult = await hasPermission('clients_view', 'view');
      setCanAccessSettings(canAccessSettingsResult);
      setCanAccessClients(canAccessClientsResult);
    };
    
    checkPermissions();
  }, [hasPermission]);
  
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "equipment", label: "Equipamentos", icon: Package },
    { id: "inventory", label: "Estoque", icon: BarChart3 },
    ...(userRole === 'admin' ? [{ id: "rentals", label: "Locações", icon: Calendar }] : []),
    { id: "event-equipment", label: "Equipamentos Eventos", icon: Cog },
    ...(canAccessClients ? [{ id: "clients", label: "Clientes", icon: Users }] : []),
    { id: "collaborators", label: "Colaboradores", icon: UserCheck },
    { id: "maintenance", label: "Manutenção", icon: Wrench },
    ...(canAccessSettings ? [{ id: "settings", label: "Configurações", icon: Settings }] : []),
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
    <div className="p-6 border-b border-border">
      <h1 className="text-xl font-bold text-primary">Luz Locação</h1>
      <p className="text-sm text-muted-foreground">Controle de Estoque</p>
      <div className="mt-2">
        <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
          {userRole === 'admin' ? 'Administrador' : 'Funcionário'}
        </Badge>
      </div>
    </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={cn(
              "w-full justify-start gap-3",
              activeTab === item.id && "bg-primary text-primary-foreground"
            )}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </div>
  );
};