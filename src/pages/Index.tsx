import { useState, useCallback } from "react";
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
import { ExpenseSpreadsheet } from "@/components/ExpenseSpreadsheet";
import { PersonalExpenseSpreadsheet } from "@/components/PersonalExpenseSpreadsheet";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const handleTabChange = useCallback((tab: string) => {
    console.log('Changing tab to:', tab);
    setActiveTab(tab);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard key="dashboard" onNavigate={setActiveTab} />;
      case "equipment":
        return <Equipment key="equipment" />;
      case "inventory":
        return <Inventory key="inventory" />;
      case "rentals":
        return <Rentals key="rentals" />;
      case "event-equipment":
        return <EventEquipment key="event-equipment" />;
      case "clients":
        return <Clients key="clients" />;
      case "collaborators":
        return <Collaborators key="collaborators" />;
      case "financial":
        console.log('Loading FinancialManagement component');
        return <FinancialManagement key="financial" />;
      case "user-management":
        return <UserManagement key="user-management" />;
      case "maintenance":
        return <div key="maintenance" className="p-6"><h2 className="text-2xl font-bold">Manutenção - Em Desenvolvimento</h2></div>;
      case "expense-spreadsheet":
        return <ExpenseSpreadsheet key="expense-spreadsheet" />;
      case "personal-expenses":
        return <PersonalExpenseSpreadsheet key="personal-expenses" />;
      case "settings":
        return <SettingsPage key="settings" />;
      default:
        return <Dashboard key="default" onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
