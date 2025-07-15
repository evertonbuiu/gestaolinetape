import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, TrendingDown, TrendingUp, Shield, Filter } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";

export const Inventory = () => {
  const { equipment, loading, totals } = useEquipment();
  const { hasPermission } = usePermissions();
  const { userRole } = useAuth();
  const [canViewInventory, setCanViewInventory] = useState(false);
  const [canViewPrices, setCanViewPrices] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const canViewInventoryResult = await hasPermission('inventory_view', 'view');
      const canViewPricesResult = userRole === 'admin'; // Only admin can see prices
      setCanViewInventory(canViewInventoryResult);
      setCanViewPrices(canViewPricesResult);
    };
    checkPermissions();
  }, [hasPermission, userRole]);

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

  // Filter equipment by category
  const filteredEquipment = equipment.filter(item => {
    if (selectedCategory === "all") return true;
    return item.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  // Calculate filtered totals
  const filteredTotals = filteredEquipment.reduce((acc, item) => {
    acc.totalItems += item.total_stock;
    acc.criticalItems += item.status === 'out_of_stock' || item.status === 'low_stock' ? 1 : 0;
    acc.totalValue += item.total_stock * item.price_per_day * 30; // Monthly value estimate
    return acc;
  }, { totalItems: 0, criticalItems: 0, totalValue: 0 });

  const categories = [
    { value: "all", label: "Todos os Itens" },
    { value: "equipamento", label: "Equipamentos" },
    { value: "cabeamento", label: "Cabeamentos" },
    { value: "insumos", label: "Insumos" }
  ];

  if (loading) {
    return <div className="p-6">Carregando estoque...</div>;
  }

  // Show permission warning if user has no view access
  if (!canViewInventory) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Você não tem permissão para visualizar informações do estoque.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Controle de Estoque</h2>
          <p className="text-muted-foreground">Monitore os níveis de estoque em tempo real</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Label htmlFor="category-filter">Filtrar por:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50">
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2">
            <Package className="w-4 h-4" />
            Registrar Movimento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estoque Total</CardTitle>
            <CardDescription>
              {selectedCategory === "all" ? "Quantidade atual" : `Categoria: ${categories.find(c => c.value === selectedCategory)?.label}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{filteredTotals.totalItems}</div>
            <p className="text-sm text-muted-foreground mt-1">Itens em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estoque Baixo</CardTitle>
            <CardDescription>Abaixo do mínimo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{filteredTotals.criticalItems}</div>
            <p className="text-sm text-muted-foreground mt-1">Itens críticos</p>
          </CardContent>
        </Card>

{canViewPrices && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Valor do Estoque</CardTitle>
              <CardDescription>Valor total estimado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                R$ {filteredTotals.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Valor estimado mensal</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Estoque</CardTitle>
          <CardDescription>
            {selectedCategory === "all" 
              ? "Situação atual dos equipamentos" 
              : `Categoria: ${categories.find(c => c.value === selectedCategory)?.label} - ${filteredEquipment.length} item(s)`
            }
          </CardDescription>
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
                {filteredEquipment.map((item) => {
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
                {filteredEquipment.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      {selectedCategory === "all" 
                        ? "Nenhum equipamento encontrado" 
                        : `Nenhum item encontrado na categoria "${categories.find(c => c.value === selectedCategory)?.label}"`
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};