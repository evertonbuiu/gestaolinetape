import { Package, Settings, BarChart3, Calendar, Home, Users, Wrench, LogOut, Cog, UserCheck, DollarSign, UserCog, FileSpreadsheet, User, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { QuickThemeToggle } from "@/components/QuickThemeToggle";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const { signOut, userRole } = useCustomAuth();
  
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "equipment", label: "Equipamentos", icon: Package },
    { id: "inventory", label: "Estoque", icon: BarChart3 },
    ...(userRole === 'admin' || userRole === 'financeiro' || userRole === 'deposito' ? [{ id: "rentals", label: "Locações", icon: Calendar }] : []),
    { id: "event-equipment", label: "Equipamentos Eventos", icon: Cog },
    ...(userRole === 'admin' || userRole === 'financeiro' || userRole === 'deposito' ? [{ id: "clients", label: "Clientes", icon: Users }] : []),
    { id: "collaborators", label: "Colaboradores", icon: UserCheck },
    ...(userRole === 'admin' || userRole === 'financeiro' ? [{ id: "financial", label: "Gestão Financeira", icon: DollarSign }] : []),
    ...(userRole === 'admin' || userRole === 'financeiro' ? [{ id: "expense-spreadsheet", label: "Gastos Empresa", icon: FileSpreadsheet }] : []),
    ...(userRole === 'admin' || userRole === 'financeiro' ? [{ id: "personal-expenses", label: "Gastos Pessoais", icon: User }] : []),
    ...(userRole === 'admin' ? [{ id: "user-management", label: "Gerenciar Usuários", icon: UserCog }] : []),
    { id: "maintenance", label: "Manutenção", icon: Wrench },
    { id: "theme-settings", label: "Configurar Tema", icon: Palette },
    ...(userRole === 'admin' ? [{ id: "settings", label: "Configurações", icon: Settings }] : []),
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
    <div className="p-6 border-b border-border">
      <Logo size="md" />
      <div className="mt-3 flex items-center justify-between">
        <Badge variant={userRole === 'admin' ? 'default' : userRole === 'financeiro' ? 'secondary' : userRole === 'deposito' ? 'destructive' : 'outline'}>
          {userRole === 'admin' ? 'Administrador' : userRole === 'financeiro' ? 'Financeiro' : userRole === 'deposito' ? 'Depósito' : 'Funcionário'}
        </Badge>
      </div>
      <div className="mt-3">
        <QuickThemeToggle />
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