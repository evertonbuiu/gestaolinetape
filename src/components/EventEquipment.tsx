import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, MapPin, User, Package, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string;
  name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  setup_start_date: string;
  event_date: string;
  event_time: string;
  location: string;
  description: string;
  status: string;
  created_at: string;
}

interface EventEquipment {
  id: string;
  event_id: string;
  equipment_name: string;
  quantity: number;
  description: string;
  status: string;
  assigned_by: string;
  created_at: string;
}

export const EventEquipment = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [equipment, setEquipment] = useState<EventEquipment[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipmentDialog, setEquipmentDialog] = useState(false);
  const [newEquipment, setNewEquipment] = useState<Partial<EventEquipment>>({
    equipment_name: '',
    quantity: 1,
    description: '',
    status: 'pending'
  });

  // Fetch events
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar os eventos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch equipment for selected event
  const fetchEquipment = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_equipment')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: "Erro ao carregar equipamentos",
        description: "Não foi possível carregar os equipamentos.",
        variant: "destructive"
      });
    }
  };

  // Add new equipment
  const addEquipment = async () => {
    if (!selectedEvent || !newEquipment.equipment_name || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do equipamento.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('event_equipment')
        .insert({
          event_id: selectedEvent.id,
          equipment_name: newEquipment.equipment_name,
          quantity: newEquipment.quantity || 1,
          description: newEquipment.description || '',
          status: newEquipment.status || 'pending',
          assigned_by: user.id
        });

      if (error) throw error;

      await fetchEquipment(selectedEvent.id);
      setNewEquipment({
        equipment_name: '',
        quantity: 1,
        description: '',
        status: 'pending'
      });
      setEquipmentDialog(false);

      toast({
        title: "Equipamento adicionado",
        description: "O equipamento foi adicionado com sucesso.",
      });
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast({
        title: "Erro ao adicionar equipamento",
        description: "Não foi possível adicionar o equipamento.",
        variant: "destructive"
      });
    }
  };

  // Delete equipment
  const deleteEquipment = async (equipmentId: string) => {
    try {
      const { error } = await supabase
        .from('event_equipment')
        .delete()
        .eq('id', equipmentId);

      if (error) throw error;

      await fetchEquipment(selectedEvent!.id);

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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'allocated': return 'bg-green-100 text-green-800';
      case 'returned': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get event status color
  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'allocated': return 'Alocado';
      case 'returned': return 'Devolvido';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) {
    return <div className="p-6">Carregando eventos...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Equipamentos dos Eventos</h2>
          <p className="text-muted-foreground">Gerencie equipamentos para cada evento</p>
        </div>
      </div>

      <div className="grid gap-6">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {event.name}
                  </CardTitle>
                  <CardDescription className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{event.client_name}</span>
                      {event.client_email && (
                        <span className="text-muted-foreground">• {event.client_email}</span>
                      )}
                    </div>
                    {event.setup_start_date && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Montagem: {format(new Date(event.setup_start_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Evento: {format(new Date(event.event_date), 'dd/MM/yyyy', { locale: ptBR })}
                        {event.event_time && ` às ${event.event_time}`}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getEventStatusColor(event.status)}>
                    {getStatusText(event.status)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEvent(event);
                      fetchEquipment(event.id);
                    }}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Equipamentos
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Equipment Management Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => {
        if (!open) {
          setSelectedEvent(null);
          setEquipment([]);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Equipamentos - {selectedEvent?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-6">
              {/* Add Equipment Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Equipamentos do Evento</h3>
                <Dialog open={equipmentDialog} onOpenChange={setEquipmentDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Equipamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Equipamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="equipment_name">Nome do Equipamento *</Label>
                        <Input
                          id="equipment_name"
                          value={newEquipment.equipment_name || ''}
                          onChange={(e) => setNewEquipment(prev => ({ ...prev, equipment_name: e.target.value }))}
                          placeholder="Ex: Refletor LED 500W"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quantity">Quantidade</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={newEquipment.quantity || 1}
                            onChange={(e) => setNewEquipment(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={newEquipment.status} onValueChange={(value) => setNewEquipment(prev => ({ ...prev, status: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="confirmed">Confirmado</SelectItem>
                              <SelectItem value="allocated">Alocado</SelectItem>
                              <SelectItem value="returned">Devolvido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={newEquipment.description || ''}
                          onChange={(e) => setNewEquipment(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Detalhes sobre o equipamento..."
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setEquipmentDialog(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={addEquipment}>
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Equipment List */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhum equipamento adicionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      equipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.equipment_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusText(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEquipment(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};