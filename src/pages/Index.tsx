import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { Equipment } from "@/components/Equipment";
import { Inventory } from "@/components/Inventory";
import { Rentals } from "@/components/Rentals";
import { EventEquipment } from "@/components/EventEquipment";
import { Clients } from "@/components/Clients";
import { Collaborators } from "@/components/Collaborators";
import { FinancialManagement } from "@/components/FinancialManagement";
import { UserManagement } from "@/components/UserManagement";
import { SettingsPage } from "@/components/Settings";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "equipment":
        return <Equipment />;
      case "inventory":
        return <Inventory />;
      case "rentals":
        return <Rentals />;
      case "event-equipment":
        return <EventEquipment />;
      case "clients":
        return <Clients />;
      case "collaborators":
        return <Collaborators />;
      case "financial":
        return <FinancialManagement />;
      case "user-management":
        return <UserManagement />;
      case "maintenance":
        return <div className="p-6"><h2 className="text-2xl font-bold">Manutenção - Em Desenvolvimento</h2></div>;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
