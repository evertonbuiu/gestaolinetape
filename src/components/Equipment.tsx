import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit, Trash2, Package, Shield } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCustomAuth } from "@/hooks/useCustomAuth";

export const Equipment = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { equipment, loading, fetchEquipment } = useEquipment();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const { user } = useCustomAuth();
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [equipmentDialog, setEquipmentDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    category: '',
    description: '',
    total_stock: 0,
    price_per_day: 0
  });

  // Fetch maintenance records
  const fetchMaintenanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .in('status', ['agendada', 'em_andamento']);

      if (error) throw error;
      setMaintenanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    }
  };

  // Add realtime updates for equipment
  useEffect(() => {
    const equipmentChannel = supabase
      .channel('equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment'
        },
        () => {
          console.log('Equipment data updated, refreshing...');
          fetchEquipment();
        }
      )
      .subscribe();

    const maintenanceChannel = supabase
      .channel('maintenance-equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_records'
        },
        () => {
          console.log('Maintenance data updated, refreshing...');
          fetchMaintenanceRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(maintenanceChannel);
    };
  }, [fetchEquipment]);

  // Check permissions on mount
  useEffect(() => {
    // Permitir acesso para todos os usuários autenticados
    setCanView(true);
    setCanEdit(true);
    fetchMaintenanceRecords();
  }, []);

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

  // Add new equipment
  const addEquipment = async () => {
    if (!newEquipment.name || !newEquipment.category || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e categoria do equipamento.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment')
        .insert({
          name: newEquipment.name,
          category: newEquipment.category,
          description: newEquipment.description || '',
          total_stock: newEquipment.total_stock || 0,
          available: newEquipment.total_stock || 0,
          rented: 0,
          price_per_day: newEquipment.price_per_day || 0,
          status: 'available'
        });

      if (error) throw error;

      await fetchEquipment();
      setNewEquipment({
        name: '',
        category: '',
        description: '',
        total_stock: 0,
        price_per_day: 0
      });
      setEquipmentDialog(false);

      toast({
        title: "Equipamento criado",
        description: "O equipamento foi criado com sucesso.",
      });
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast({
        title: "Erro ao criar equipamento",
        description: "Não foi possível criar o equipamento.",
        variant: "destructive"
      });
    }
  };

  // Update equipment
  const updateEquipment = async () => {
    if (!editingEquipment || !editingEquipment.name || !editingEquipment.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e categoria do equipamento.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment')
        .update({
          name: editingEquipment.name,
          category: editingEquipment.category,
          description: editingEquipment.description || '',
          total_stock: editingEquipment.total_stock || 0,
          price_per_day: editingEquipment.price_per_day || 0
        })
        .eq('id', editingEquipment.id);

      if (error) throw error;

      await fetchEquipment();
      setEditingEquipment(null);
      setEquipmentDialog(false);

      toast({
        title: "Equipamento atualizado",
        description: "O equipamento foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast({
        title: "Erro ao atualizar equipamento",
        description: "Não foi possível atualizar o equipamento.",
        variant: "destructive"
      });
    }
  };

  // Delete equipment
  const deleteEquipment = async (equipmentId: string) => {
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', equipmentId);

      if (error) throw error;

      await fetchEquipment();

      toast({
        title: "Equipamento removido",
        description: "O equipamento foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast({
        title: "Erro ao remover equipamento",
        description: "Não foi possível remover o equipamento.",
        variant: "destructive"
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (equipment: any) => {
    setEditingEquipment(equipment);
    setEquipmentDialog(true);
  };

  // Open add dialog
  const openAddDialog = () => {
    setEditingEquipment(null);
    setNewEquipment({
      name: '',
      category: '',
      description: '',
      total_stock: 0,
      price_per_day: 0
    });
    setEquipmentDialog(true);
  };

  const categories = [
    { value: "equipamento", label: "Equipamento" },
    { value: "cabeamento", label: "Cabeamento" },
    { value: "insumos", label: "Insumos" }
  ];

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Carregando equipamentos...</div>;
  }

  // Show permission warning if user has no view access
  if (!canView) {
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

  // Check if equipment is in maintenance
  const isInMaintenance = (equipmentName: string) => {
    return maintenanceRecords.some(record => record.equipment_name === equipmentName);
  };

  // Get maintenance info for equipment
  const getMaintenanceInfo = (equipmentName: string) => {
    return maintenanceRecords.find(record => record.equipment_name === equipmentName);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Equipamentos</h2>
          <p className="text-muted-foreground">Gerencie todos os equipamentos do almoxarifado</p>
        </div>
        {canEdit && (
          <Dialog open={equipmentDialog} onOpenChange={setEquipmentDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openAddDialog}>
                <Plus className="w-4 h-4" />
                Novo Equipamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
                </DialogTitle>
                <DialogDescription>
                  {editingEquipment ? 'Edite as informações do equipamento' : 'Cadastre um novo equipamento no almoxarifado'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome do Equipamento *</Label>
                      <Input
                        id="name"
                        value={editingEquipment ? editingEquipment.name : newEquipment.name}
                        onChange={(e) => {
                          if (editingEquipment) {
                            setEditingEquipment({ ...editingEquipment, name: e.target.value });
                          } else {
                            setNewEquipment(prev => ({ ...prev, name: e.target.value }));
                          }
                        }}
                        placeholder="Ex: Mesa de Som"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria *</Label>
                      <Select 
                        value={editingEquipment ? editingEquipment.category : newEquipment.category} 
                        onValueChange={(value) => {
                          if (editingEquipment) {
                            setEditingEquipment({ ...editingEquipment, category: value });
                          } else {
                            setNewEquipment(prev => ({ ...prev, category: value }));
                          }
                        }}
                      >
                        <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
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
                </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={editingEquipment ? editingEquipment.description : newEquipment.description}
                      onChange={(e) => {
                        if (editingEquipment) {
                          setEditingEquipment({ ...editingEquipment, description: e.target.value });
                        } else {
                          setNewEquipment(prev => ({ ...prev, description: e.target.value }));
                        }
                      }}
                      placeholder="Descrição detalhada do equipamento"
                    />
                  </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="total_stock">Quantidade em Estoque</Label>
                      <Input
                        id="total_stock"
                        type="number"
                        min="0"
                        value={editingEquipment ? editingEquipment.total_stock : newEquipment.total_stock}
                        onChange={(e) => {
                          if (editingEquipment) {
                            setEditingEquipment({ ...editingEquipment, total_stock: parseInt(e.target.value) || 0 });
                          } else {
                            setNewEquipment(prev => ({ ...prev, total_stock: parseInt(e.target.value) || 0 }));
                          }
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price_per_day">Preço por Dia (R$)</Label>
                      <Input
                        id="price_per_day"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingEquipment ? editingEquipment.price_per_day : newEquipment.price_per_day}
                        onChange={(e) => {
                          if (editingEquipment) {
                            setEditingEquipment({ ...editingEquipment, price_per_day: parseFloat(e.target.value) || 0 });
                          } else {
                            setNewEquipment(prev => ({ ...prev, price_per_day: parseFloat(e.target.value) || 0 }));
                          }
                        }}
                        placeholder="0.00"
                      />
                    </div>
                </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEquipmentDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={editingEquipment ? updateEquipment : addEquipment}>
                      {editingEquipment ? 'Salvar' : 'Cadastrar Equipamento'}
                    </Button>
                  </div>
              </div>
            </DialogContent>
          </Dialog>
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
        {filteredEquipment.map((item) => {
          const inMaintenance = isInMaintenance(item.name);
          const maintenanceInfo = getMaintenanceInfo(item.name);
          
          return (
            <Card key={item.id} className={`hover:shadow-lg transition-shadow ${inMaintenance ? 'border-orange-200 bg-orange-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Package className="w-8 h-8 text-primary" />
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusText(item.status)}
                    </Badge>
                    {inMaintenance && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        🔧 Manutenção
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription>{item.category}</CardDescription>
                {inMaintenance && maintenanceInfo && (
                  <div className="text-sm text-orange-600 bg-orange-100 p-2 rounded">
                    <div className="font-medium">Em manutenção:</div>
                    <div className="text-xs">{maintenanceInfo.description}</div>
                    <div className="text-xs">Status: {maintenanceInfo.status}</div>
                  </div>
                )}
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
                {canEdit && (
                  <div>
                    <p className="text-muted-foreground">Preço/Dia</p>
                    <p className="font-medium">R$ {item.price_per_day.toFixed(2)}</p>
                  </div>
                )}
              </div>
              
              {canEdit && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(item)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteEquipment(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
};