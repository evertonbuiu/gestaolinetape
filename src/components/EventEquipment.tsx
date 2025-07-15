import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, MapPin, User, Package, Plus, Edit, Trash2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isSameMonth, addMonths } from 'date-fns';

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

interface Equipment {
  id: string;
  name: string;
  category: string;
  total_stock: number;
  available: number;
  rented: number;
  price_per_day: number;
  status: string;
  description: string;
}

export const EventEquipment = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [equipment, setEquipment] = useState<EventEquipment[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [equipmentDialog, setEquipmentDialog] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('/logo-empresa.png');
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

  // Fetch available equipment
  const fetchAvailableEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableEquipment(data || []);
    } catch (error) {
      console.error('Error fetching available equipment:', error);
      toast({
        title: "Erro ao carregar equipamentos",
        description: "Não foi possível carregar os equipamentos disponíveis.",
        variant: "destructive"
      });
    }
  };

  // Fetch logo from storage
  const fetchLogo = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('logos')
        .list('', { limit: 100 });

      if (error) {
        console.error('Error fetching logo:', error);
        return;
      }

      if (data && data.length > 0) {
        // Get the first logo file
        const logoFile = data[0];
        const { data: publicUrl } = supabase.storage
          .from('logos')
          .getPublicUrl(logoFile.name);
        
        if (publicUrl?.publicUrl) {
          setLogoUrl(publicUrl.publicUrl);
          console.log('Logo URL set:', publicUrl.publicUrl);
        }
      } else {
        console.log('No logos found in storage');
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

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

  // Filter events by selected month
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.event_date);
    return isSameMonth(eventDate, selectedMonth);
  });

  const yearsAndMonths = generateYearsAndMonths();
  
  // Print equipment list
  const printEquipmentList = () => {
    if (!selectedEvent) return;

    // Aguardar o carregamento da logo antes de gerar a página de impressão
    const logoImg = new Image();
    logoImg.onload = () => {
      const printContent = `
        <html>
          <head>
            <title>Lista de Materiais - ${selectedEvent.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                position: relative;
              }
              body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url('${logoUrl}');
                background-repeat: no-repeat;
                background-position: center center;
                background-size: 70%;
                opacity: 0.15;
                z-index: -1;
                pointer-events: none;
              }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .event-info { margin-bottom: 20px; }
              .event-info h2 { color: #333; margin-bottom: 10px; }
              .event-info p { margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
              .status-pending { background-color: #fff3cd; color: #856404; }
              .status-confirmed { background-color: #d1ecf1; color: #0c5460; }
              .status-allocated { background-color: #d4edda; color: #155724; }
              .status-returned { background-color: #f8d7da; color: #721c24; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${logoUrl}" alt="Logo da Empresa" style="height: 100px; margin-bottom: 15px;" />
              <h1>LISTA DE MATERIAIS</h1>
              <p>Sistema de Controle de Almoxarifado</p>
            </div>
            
            <div class="event-info">
              <h2>${selectedEvent.name}</h2>
              <p><strong>Cliente:</strong> ${selectedEvent.client_name}</p>
              ${selectedEvent.client_email ? `<p><strong>Email:</strong> ${selectedEvent.client_email}</p>` : ''}
              ${selectedEvent.client_phone ? `<p><strong>Telefone:</strong> ${selectedEvent.client_phone}</p>` : ''}
              <p><strong>Data do Evento:</strong> ${format(new Date(selectedEvent.event_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
              ${selectedEvent.event_time ? `<p><strong>Horário:</strong> ${selectedEvent.event_time}</p>` : ''}
              ${selectedEvent.setup_start_date ? `<p><strong>Data de Montagem:</strong> ${format(new Date(selectedEvent.setup_start_date), 'dd/MM/yyyy', { locale: ptBR })}</p>` : ''}
              ${selectedEvent.location ? `<p><strong>Local:</strong> ${selectedEvent.location}</p>` : ''}
              ${selectedEvent.description ? `<p><strong>Descrição:</strong> ${selectedEvent.description}</p>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Quantidade</th>
                  <th>Status</th>
                  <th>Descrição</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                ${equipment.map(item => `
                  <tr>
                    <td>${item.equipment_name}</td>
                    <td>${item.quantity}</td>
                    <td>
                      <span class="status status-${item.status}">
                        ${getStatusText(item.status)}
                      </span>
                    </td>
                    <td>${item.description || '-'}</td>
                    <td>_________________</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>Documento gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              <p>Total de itens: ${equipment.length}</p>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Aguardar um pouco para garantir que a logo seja carregada na página de impressão
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    };

    logoImg.onerror = () => {
      console.error('Erro ao carregar a logo para impressão');
      // Continuar com a impressão mesmo sem a logo
      const printContent = `
        <html>
          <head>
            <title>Lista de Materiais - ${selectedEvent.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
              }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .event-info { margin-bottom: 20px; }
              .event-info h2 { color: #333; margin-bottom: 10px; }
              .event-info p { margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
              .status-pending { background-color: #fff3cd; color: #856404; }
              .status-confirmed { background-color: #d1ecf1; color: #0c5460; }
              .status-allocated { background-color: #d4edda; color: #155724; }
              .status-returned { background-color: #f8d7da; color: #721c24; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>LISTA DE MATERIAIS</h1>
              <p>Sistema de Controle de Almoxarifado</p>
            </div>
            
            <div class="event-info">
              <h2>${selectedEvent.name}</h2>
              <p><strong>Cliente:</strong> ${selectedEvent.client_name}</p>
              ${selectedEvent.client_email ? `<p><strong>Email:</strong> ${selectedEvent.client_email}</p>` : ''}
              ${selectedEvent.client_phone ? `<p><strong>Telefone:</strong> ${selectedEvent.client_phone}</p>` : ''}
              <p><strong>Data do Evento:</strong> ${format(new Date(selectedEvent.event_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
              ${selectedEvent.event_time ? `<p><strong>Horário:</strong> ${selectedEvent.event_time}</p>` : ''}
              ${selectedEvent.setup_start_date ? `<p><strong>Data de Montagem:</strong> ${format(new Date(selectedEvent.setup_start_date), 'dd/MM/yyyy', { locale: ptBR })}</p>` : ''}
              ${selectedEvent.location ? `<p><strong>Local:</strong> ${selectedEvent.location}</p>` : ''}
              ${selectedEvent.description ? `<p><strong>Descrição:</strong> ${selectedEvent.description}</p>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Quantidade</th>
                  <th>Status</th>
                  <th>Descrição</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                ${equipment.map(item => `
                  <tr>
                    <td>${item.equipment_name}</td>
                    <td>${item.quantity}</td>
                    <td>
                      <span class="status status-${item.status}">
                        ${getStatusText(item.status)}
                      </span>
                    </td>
                    <td>${item.description || '-'}</td>
                    <td>_________________</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>Documento gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              <p>Total de itens: ${equipment.length}</p>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    };

    logoImg.src = logoUrl;
  };
  
  // Update selectedMonth when year changes
  useEffect(() => {
    setSelectedMonth(new Date(selectedYear, selectedMonth.getMonth(), 1));
  }, [selectedYear]);

  useEffect(() => {
    fetchEvents();
    fetchAvailableEquipment();
    fetchLogo();
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {format(month, 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {filteredEvents.length} evento(s)
                    </span>
                  </div>
                  
                  <div className="grid gap-6">
                    {filteredEvents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum evento encontrado para {format(month, 'MMMM yyyy', { locale: ptBR })}
                      </div>
                    ) : (
                      filteredEvents.map((event) => (
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
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
        </Tabs>
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
            <DialogDescription>
              Gerencie os equipamentos atribuídos a este evento
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-6">
              {/* Add Equipment Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Equipamentos do Evento</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={printEquipmentList}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir Lista
                  </Button>
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
                        <DialogDescription>
                          Adicione um novo equipamento ao evento
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="equipment_name">Nome do Equipamento *</Label>
                          <Select value={newEquipment.equipment_name} onValueChange={(value) => setNewEquipment(prev => ({ ...prev, equipment_name: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um equipamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableEquipment.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name} - {item.category} ({item.available} disponíveis)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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