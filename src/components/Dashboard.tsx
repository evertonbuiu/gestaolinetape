import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, Calendar, TrendingUp } from "lucide-react";

export const Dashboard = () => {
  const stats = [
    {
      title: "Total de Equipamentos",
      value: "1,234",
      description: "Equipamentos cadastrados",
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Equipamentos Locados",
      value: "156",
      description: "Atualmente em locação",
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Estoque Baixo",
      value: "23",
      description: "Itens com estoque crítico",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      title: "Receita do Mês",
      value: "R$ 45.230",
      description: "Faturamento atual",
      icon: TrendingUp,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral do sistema de controle de almoxarifado</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Equipamentos Mais Locados</CardTitle>
            <CardDescription>Top 5 equipamentos em demanda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Refletor LED 200W", rentals: 45, percentage: 90 },
                { name: "Mesa de Som 24 Canais", rentals: 38, percentage: 76 },
                { name: "Microfone Sem Fio", rentals: 35, percentage: 70 },
                { name: "Caixa de Som Ativa", rentals: 28, percentage: 56 },
                { name: "Truss Quadrada 3m", rentals: 22, percentage: 44 }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary rounded-full h-2 transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground ml-4">{item.rentals}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locações Próximas</CardTitle>
            <CardDescription>Equipamentos que devem retornar em breve</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { client: "Evento Casamento Silva", equipment: "Kit Iluminação Completo", date: "Hoje", status: "urgent" },
                { client: "Festa Corporativa ABC", equipment: "Som + Iluminação", date: "Amanhã", status: "warning" },
                { client: "Aniversário Maria", equipment: "Refletores LED", date: "15/07", status: "normal" },
                { client: "Show Banda XYZ", equipment: "Equipamento Palco", date: "18/07", status: "normal" }
              ].map((rental, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rental.client}</p>
                    <p className="text-xs text-muted-foreground">{rental.equipment}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      rental.status === 'urgent' ? 'text-red-600' : 
                      rental.status === 'warning' ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {rental.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};