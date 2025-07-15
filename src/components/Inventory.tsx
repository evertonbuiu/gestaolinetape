import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, TrendingDown, TrendingUp } from "lucide-react";

export const Inventory = () => {
  const inventoryItems = [
    {
      id: 1,
      name: "Refletor LED 200W",
      category: "Iluminação",
      current: 18,
      minimum: 15,
      maximum: 30,
      status: "normal",
      lastMovement: "2024-07-14",
      movementType: "entrada"
    },
    {
      id: 2,
      name: "Mesa de Som 24 Canais",
      category: "Áudio",
      current: 5,
      minimum: 3,
      maximum: 10,
      status: "normal",
      lastMovement: "2024-07-13",
      movementType: "saída"
    },
    {
      id: 3,
      name: "Microfone Sem Fio",
      category: "Áudio",
      current: 2,
      minimum: 8,
      maximum: 25,
      status: "critical",
      lastMovement: "2024-07-12",
      movementType: "saída"
    },
    {
      id: 4,
      name: "Caixa de Som Ativa 500W",
      category: "Áudio",
      current: 12,
      minimum: 10,
      maximum: 20,
      status: "normal",
      lastMovement: "2024-07-11",
      movementType: "entrada"
    },
    {
      id: 5,
      name: "Truss Quadrada 3m",
      category: "Estrutura",
      current: 22,
      minimum: 20,
      maximum: 40,
      status: "normal",
      lastMovement: "2024-07-10",
      movementType: "saída"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800";
      case "low":
        return "bg-yellow-100 text-yellow-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "normal":
        return "Normal";
      case "low":
        return "Baixo";
      case "critical":
        return "Crítico";
      default:
        return "Desconhecido";
    }
  };

  const getMovementIcon = (type: string) => {
    return type === "entrada" ? TrendingUp : TrendingDown;
  };

  const getMovementColor = (type: string) => {
    return type === "entrada" ? "text-green-600" : "text-red-600";
  };

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
            <div className="text-3xl font-bold text-primary">1,234</div>
            <p className="text-sm text-muted-foreground mt-1">Itens em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estoque Baixo</CardTitle>
            <CardDescription>Abaixo do mínimo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">23</div>
            <p className="text-sm text-muted-foreground mt-1">Itens críticos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Valor do Estoque</CardTitle>
            <CardDescription>Valor total estimado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">R$ 125.480</div>
            <p className="text-sm text-muted-foreground mt-1">Valor patrimonial</p>
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
                  <th className="text-center py-3 px-4">Atual</th>
                  <th className="text-center py-3 px-4">Mínimo</th>
                  <th className="text-center py-3 px-4">Máximo</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Último Movimento</th>
                  <th className="text-center py-3 px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map((item) => {
                  const MovementIcon = getMovementIcon(item.movementType);
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-primary" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                      <td className="py-3 px-4 text-center font-medium">{item.current}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{item.minimum}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{item.maximum}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status === "critical" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {getStatusText(item.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MovementIcon className={`w-4 h-4 ${getMovementColor(item.movementType)}`} />
                          <span className="text-sm">{item.lastMovement}</span>
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