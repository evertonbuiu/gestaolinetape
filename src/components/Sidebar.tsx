import { Package, Settings, BarChart3, Calendar, Home, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "equipment", label: "Equipamentos", icon: Package },
    { id: "inventory", label: "Estoque", icon: BarChart3 },
    { id: "rentals", label: "Locações", icon: Calendar },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "maintenance", label: "Manutenção", icon: Wrench },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">Luz Locação</h1>
        <p className="text-sm text-muted-foreground">Controle de Estoque</p>
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
    </div>
  );
};