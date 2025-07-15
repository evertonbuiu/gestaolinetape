import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Equipment {
  id: string;
  name: string;
  category: string;
  total_stock: number;
  available: number;
  rented: number;
  price_per_day: number;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const Inventory = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: "Erro ao carregar estoque",
        description: "Não foi possível carregar os dados do estoque.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();

    // Set up real-time subscription for equipment changes
    const channel = supabase
      .channel('inventory-equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment'
        },
        (payload) => {
          console.log('Inventory equipment change detected:', payload);
          fetchEquipment(); // Refetch data when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Also listen for event_equipment changes to update stock
  useEffect(() => {
    const eventEquipmentChannel = supabase
      .channel('inventory-event-equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_equipment'
        },
        (payload) => {
          console.log('Inventory event equipment change detected:', payload);
          fetchEquipment(); // Refetch to update available/rented counts
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventEquipmentChannel);
    };
  }, []);

  // Calculate totals
  const totalItems = equipment.reduce((sum, item) => sum + item.total_stock, 0);
  const criticalItems = equipment.filter(item => item.status === 'out_of_stock' || item.status === 'low_stock').length;
  const totalValue = equipment.reduce((sum, item) => sum + (item.total_stock * item.price_per_day * 30), 0); // Estimated monthly value

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "out_of_stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Normal";
      case "low_stock":
        return "Baixo";
      case "out_of_stock":
        return "Crítico";
      default:
        return "Desconhecido";
    }
  };

  const getMovementIcon = (available: number, rented: number) => {
    return rented > available ? TrendingDown : TrendingUp;
  };

  const getMovementColor = (available: number, rented: number) => {
    return rented > available ? "text-red-600" : "text-green-600";
  };

  if (loading) {
    return <div className="p-6">Carregando estoque...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Controle de Estoque</h2>
          <p className="text-muted-foreground">Monitore os níveis de estoque em tempo real</p>
        </div>
        <Button className="gap-2">
          <Package className="w-4 h-4" />
          Registrar Movimento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estoque Total</CardTitle>
            <CardDescription>Quantidade atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalItems}</div>
            <p className="text-sm text-muted-foreground mt-1">Itens em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estoque Baixo</CardTitle>
            <CardDescription>Abaixo do mínimo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalItems}</div>
            <p className="text-sm text-muted-foreground mt-1">Itens críticos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Valor do Estoque</CardTitle>
            <CardDescription>Valor total estimado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-sm text-muted-foreground mt-1">Valor estimado mensal</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Estoque</CardTitle>
          <CardDescription>Situação atual dos equipamentos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Equipamento</th>
                  <th className="text-left py-3 px-4">Categoria</th>
                  <th className="text-center py-3 px-4">Total</th>
                  <th className="text-center py-3 px-4">Disponível</th>
                  <th className="text-center py-3 px-4">Locado</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Última Atualização</th>
                  <th className="text-center py-3 px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => {
                  const MovementIcon = getMovementIcon(item.available, item.rented);
                  const movementColor = getMovementColor(item.available, item.rented);
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-primary" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                      <td className="py-3 px-4 text-center font-medium">{item.total_stock}</td>
                      <td className="py-3 px-4 text-center font-medium text-green-600">{item.available}</td>
                      <td className="py-3 px-4 text-center font-medium text-orange-600">{item.rented}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status === "out_of_stock" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {getStatusText(item.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MovementIcon className={`w-4 h-4 ${movementColor}`} />
                          <span className="text-sm">{new Date(item.updated_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button variant="outline" size="sm">
                          Ajustar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};