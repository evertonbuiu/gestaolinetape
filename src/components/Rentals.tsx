import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, User, Package } from "lucide-react";
import { useState } from "react";

export const Rentals = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const rentals = [
    {
      id: 1,
      client: "João Silva",
      event: "Casamento Silva",
      equipment: "Kit Iluminação Completo",
      startDate: "2024-07-10",
      endDate: "2024-07-15",
      totalValue: 1250.00,
      status: "active",
      phone: "(11) 99999-9999"
    },
    {
      id: 2,
      client: "Empresa ABC Ltda",
      event: "Festa Corporativa",
      equipment: "Som + Iluminação",
      startDate: "2024-07-12",
      endDate: "2024-07-16",
      totalValue: 2100.00,
      status: "active",
      phone: "(11) 88888-8888"
    },
    {
      id: 3,
      client: "Maria Santos",
      event: "Aniversário 50 Anos",
      equipment: "Refletores LED",
      startDate: "2024-07-08",
      endDate: "2024-07-15",
      totalValue: 450.00,
      status: "overdue",
      phone: "(11) 77777-7777"
    },
    {
      id: 4,
      client: "Produtora XYZ",
      event: "Show Musical",
      equipment: "Equipamento Completo Palco",
      startDate: "2024-07-15",
      endDate: "2024-07-18",
      totalValue: 5500.00,
      status: "scheduled",
      phone: "(11) 66666-6666"
    },
    {
      id: 5,
      client: "Carlos Mendes",
      event: "Festa de Formatura",
      equipment: "DJ + Iluminação",
      startDate: "2024-07-05",
      endDate: "2024-07-13",
      totalValue: 890.00,
      status: "returned",
      phone: "(11) 55555-5555"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "returned":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Ativa";
      case "scheduled":
        return "Agendada";
      case "overdue":
        return "Atrasada";
      case "returned":
        return "Devolvida";
      default:
        return "Desconhecida";
    }
  };

  const filteredRentals = rentals.filter(rental =>
    rental.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.equipment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Locações</h2>
          <p className="text-muted-foreground">Gerencie todas as locações de equipamentos</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Locação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-600">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-600">Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-600">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-600">Devolvidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar locações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locações Recentes</CardTitle>
          <CardDescription>Últimas movimentações de equipamentos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{rental.client}</p>
                      <p className="text-sm text-muted-foreground">{rental.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{rental.event}</p>
                      <p className="text-sm text-muted-foreground">
                        {rental.startDate} até {rental.endDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{rental.equipment}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {rental.totalValue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(rental.status)}>
                    {getStatusText(rental.status)}
                  </Badge>
                  <Button variant="outline" size="sm">
                    Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};