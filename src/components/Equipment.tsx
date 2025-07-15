import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Package, Shield } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { usePermissions } from "@/hooks/usePermissions";

export const Equipment = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { equipment, loading } = useEquipment();
  const { hasPermission } = usePermissions();
  const [canViewPrices, setCanViewPrices] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const canViewPricesResult = await hasPermission('inventory_view', 'view');
      const canEditResult = await hasPermission('inventory_edit', 'edit');
      setCanViewPrices(canViewPricesResult);
      setCanEdit(canEditResult);
    };
    checkPermissions();
  }, [hasPermission]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "low_stock":
        return "bg-red-100 text-red-800";
      case "out_of_stock":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Disponível";
      case "low_stock":
        return "Estoque Baixo";
      case "out_of_stock":
        return "Sem Estoque";
      default:
        return "Desconhecido";
    }
  };

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Carregando equipamentos...</div>;
  }

  // Show permission warning if user has no view access
  if (!canViewPrices) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Você não tem permissão para visualizar informações de equipamentos.
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
          <h2 className="text-3xl font-bold text-foreground">Equipamentos</h2>
          <p className="text-muted-foreground">Gerencie todos os equipamentos do almoxarifado</p>
        </div>
        {canEdit && (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Equipamento
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar equipamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Package className="w-8 h-8 text-primary" />
                <Badge className={getStatusColor(item.status)}>
                  {getStatusText(item.status)}
                </Badge>
              </div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription>{item.category}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{item.total_stock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Disponível</p>
                  <p className="font-medium text-green-600">{item.available}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Locado</p>
                  <p className="font-medium text-orange-600">{item.rented}</p>
                </div>
                {canViewPrices && (
                  <div>
                    <p className="text-muted-foreground">Preço/Dia</p>
                    <p className="font-medium">R$ {item.price_per_day.toFixed(2)}</p>
                  </div>
                )}
              </div>
              
              {canEdit && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};