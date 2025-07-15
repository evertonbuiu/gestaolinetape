import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, Calendar, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isSameMonth } from 'date-fns';

export const Dashboard = () => {
  const { hasPermission, userRole } = useAuth();
  const [showRevenue, setShowRevenue] = useState(false);
  const [canViewInventory, setCanViewInventory] = useState(false);
  const [canViewRentals, setCanViewRentals] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const checkPermission = async () => {
      const canViewRevenue = userRole === 'admin'; // Only admin can see revenue
      const canViewInventoryResult = await hasPermission('inventory_view', 'view');
      const canViewRentalsResult = await hasPermission('rentals_view', 'view');
      setShowRevenue(canViewRevenue);
      setCanViewInventory(canViewInventoryResult);
      setCanViewRentals(canViewRentalsResult);
    };
    
    checkPermission();
  }, [hasPermission, userRole]);
  
  // Generate years and months for tabs
  const generateYearsAndMonths = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
      const months = [];
      for (let month = 0; month < 12; month++) {
        months.push(new Date(year, month, 1));
      }
      years.push({ year, months });
    }
    
    return years;
  };

  const yearsAndMonths = generateYearsAndMonths();
  
  // Update selectedMonth when year changes
  useEffect(() => {
    setSelectedMonth(new Date(selectedYear, selectedMonth.getMonth(), 1));
  }, [selectedYear]);
  
  const stats = [
    ...(canViewInventory ? [{
      title: "Total de Equipamentos",
      value: "1,234",
      description: "Equipamentos cadastrados",
      icon: Package,
      color: "text-blue-600"
    }] : []),
    ...(canViewRentals ? [{
      title: "Equipamentos Locados",
      value: "156",
      description: "Atualmente em locação",
      icon: Calendar,
      color: "text-green-600"
    }] : []),
    ...(canViewInventory ? [{
      title: "Estoque Baixo",
      value: "23",
      description: "Itens com estoque crítico",
      icon: AlertTriangle,
      color: "text-red-600"
    }] : []),
    // Mostrar receita apenas se tiver permissão
    ...(showRevenue ? [{
      title: "Receita do Mês",
      value: "R$ 45.230",
      description: "Faturamento atual",
      icon: TrendingUp,
      color: "text-purple-600"
    }] : [])
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral do sistema de controle de almoxarifado</p>
      </div>

      <div className="space-y-4">
        {/* Year Selection */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">Ano:</Label>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearsAndMonths.map(({ year }) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Tabs */}
        <Tabs value={selectedMonth.toISOString()} onValueChange={(value) => setSelectedMonth(new Date(value))}>
          <TabsList className="grid w-full grid-cols-12 gap-1">
            {yearsAndMonths
              .find(({ year }) => year === selectedYear)
              ?.months.map((month) => (
                <TabsTrigger
                  key={month.toISOString()}
                  value={month.toISOString()}
                  className="text-xs p-2"
                >
                  {format(month, 'MMM', { locale: ptBR })}
                </TabsTrigger>
              ))}
          </TabsList>
          
          {yearsAndMonths
            .find(({ year }) => year === selectedYear)
            ?.months.map((month) => (
              <TabsContent key={month.toISOString()} value={month.toISOString()}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {format(month, 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                </div>
              </TabsContent>
            ))}
        </Tabs>
      </div>
    </div>
  );
};