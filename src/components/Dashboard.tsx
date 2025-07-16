import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, Calendar, TrendingUp, BarChart3, Activity, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

  // Queries para dados reais
  const { data: equipmentData } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: canViewInventory,
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', format(new Date(selectedYear, selectedMonth.getMonth(), 1), 'yyyy-MM-dd'))
        .lt('event_date', format(new Date(selectedYear, selectedMonth.getMonth() + 1, 1), 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: canViewRentals,
  });

  const { data: eventEquipmentData } = useQuery({
    queryKey: ['event_equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_equipment')
        .select('*, events!inner(*)')
        .in('status', ['confirmed', 'active']);
      if (error) throw error;
      return data;
    },
    enabled: canViewRentals,
  });

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

  // Calcular estatísticas reais
  const totalEquipments = equipmentData?.length || 0;
  const totalStock = equipmentData?.reduce((sum, item) => sum + item.total_stock, 0) || 0;
  const currentlyRented = equipmentData?.reduce((sum, item) => sum + item.rented, 0) || 0;
  const lowStockItems = equipmentData?.filter(item => 
    item.available <= item.total_stock * 0.2 && item.total_stock > 0
  ).length || 0;
  
  // Receita do mês selecionado
  const monthlyRevenue = eventsData?.filter(event => event.is_paid)
    .reduce((sum, event) => sum + (event.payment_amount || event.total_budget || 0), 0) || 0;
  
  // Eventos ativos no mês
  const activeEvents = eventsData?.filter(event => 
    event.status === 'confirmed' || event.status === 'active'
  ).length || 0;
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

  // Configurar estatísticas dinâmicas
  const stats = [
    ...(canViewInventory ? [{
      title: "Total de Equipamentos",
      value: totalEquipments.toLocaleString('pt-BR'),
      description: `${totalStock.toLocaleString('pt-BR')} itens em estoque`,
      icon: Package,
      color: "text-blue-600"
    }] : []),
    ...(canViewRentals ? [{
      title: "Equipamentos Locados",
      value: currentlyRented.toLocaleString('pt-BR'),
      description: "Atualmente em locação",
      icon: Calendar,
      color: "text-green-600"
    }] : []),
    ...(canViewInventory && lowStockItems > 0 ? [{
      title: "Estoque Baixo",
      value: lowStockItems.toLocaleString('pt-BR'),
      description: "Itens com estoque crítico",
      icon: AlertTriangle,
      color: "text-red-600"
    }] : []),
    ...(canViewRentals ? [{
      title: "Eventos Ativos",
      value: activeEvents.toLocaleString('pt-BR'),
      description: "Eventos no mês selecionado",
      icon: Activity,
      color: "text-purple-600"
    }] : []),
    // Mostrar receita apenas se tiver permissão
    ...(showRevenue ? [{
      title: "Receita do Mês",
      value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      description: "Faturamento do período",
      icon: TrendingUp,
      color: "text-emerald-600"
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-8 rounded-b-3xl mb-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-xl">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">Visão geral do sistema de controle de almoxarifado</p>
          
          {/* Live Stats Indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Dados atualizados em tempo real</span>
          </div>
        </div>
      </div>

      <div className="px-8 space-y-8">
        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50">
          <div className="flex items-center gap-4">
            <Activity className="w-5 h-5 text-primary" />
            <Label className="text-sm font-medium">Período de análise:</Label>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-36 bg-background/50 border-border/50 hover:bg-background transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background/95 backdrop-blur-sm">
              {yearsAndMonths.map(({ year }) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Navigation */}
        <Tabs value={selectedMonth.toISOString()} onValueChange={(value) => setSelectedMonth(new Date(value))}>
          <TabsList className="grid w-full grid-cols-12 gap-1 bg-card/40 backdrop-blur-sm p-2 rounded-2xl border border-border/30">
            {yearsAndMonths
              .find(({ year }) => year === selectedYear)
              ?.months.map((month) => (
                <TabsTrigger
                  key={month.toISOString()}
                  value={month.toISOString()}
                  className="text-xs p-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10"
                >
                  {format(month, 'MMM', { locale: ptBR })}
                </TabsTrigger>
              ))}
          </TabsList>
          
          {yearsAndMonths
            .find(({ year }) => year === selectedYear)
            ?.months.map((month) => (
              <TabsContent key={month.toISOString()} value={month.toISOString()} className="mt-8">
                <div className="space-y-8">
                  {/* Period Header */}
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-card/60 to-card/30 backdrop-blur-sm rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-semibold capitalize">
                        {format(month, 'MMMM yyyy', { locale: ptBR })}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Análise dinâmica</span>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                      <Card key={index} className="group relative overflow-hidden bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {stat.title}
                          </CardTitle>
                          <div className="p-2 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg group-hover:scale-110 transition-transform duration-200">
                            <stat.icon className="w-4 h-4 text-primary" />
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-1">
                            {stat.value}
                          </div>
                          <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  {stats.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 hover:border-blue-400/50 transition-all duration-300 cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg group-hover:scale-110 transition-transform">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">Gestão de Estoque</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300">Controlar inventário</p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50 hover:border-green-400/50 transition-all duration-300 cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/20 rounded-lg group-hover:scale-110 transition-transform">
                            <Calendar className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-green-900 dark:text-green-100">Novos Aluguéis</h4>
                            <p className="text-sm text-green-600 dark:text-green-300">Gerenciar locações</p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50 hover:border-purple-400/50 transition-all duration-300 cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-purple-900 dark:text-purple-100">Relatórios</h4>
                            <p className="text-sm text-purple-600 dark:text-purple-300">Análises detalhadas</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
        </Tabs>
      </div>
    </div>
  );
};