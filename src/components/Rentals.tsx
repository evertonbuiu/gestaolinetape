import { useState, useEffect } from 'react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { usePermissions } from '@/hooks/usePermissions';
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
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Calendar as CalendarIcon, Clock, MapPin, User, DollarSign, FileText, Plus, Edit, Trash2, Calculator, Shield, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isSameMonth, addMonths } from 'date-fns';

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  total_budget: number;
  total_expenses: number;
  profit_margin: number;
  status: string;
  is_paid: boolean;
  payment_date: string;
  payment_bank_account?: string;
  payment_amount: number;
  payment_type: string;
  created_at: string;
}

interface EventExpense {
  id: string;
  event_id: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier: string;
  notes: string;
  receipt_url: string;
  expense_bank_account?: string;
  expense_date: string;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export const Rentals = () => {
  const { userRole, user } = useCustomAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [editExpenseDialog, setEditExpenseDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);
  const [editEventDialog, setEditEventDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [selectedEventForStatus, setSelectedEventForStatus] = useState<Event | null>(null);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<Event | null>(null);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<EventExpense | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [canViewRentals, setCanViewRentals] = useState(false);
  const [canEditRentals, setCanEditRentals] = useState(false);
  const [canViewFinancials, setCanViewFinancials] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    setup_start_date: '',
    event_date: '',
    event_time: '',
    location: '',
    description: '',
    total_budget: 0,
    status: 'pending'
  });
  const [newExpense, setNewExpense] = useState<Partial<EventExpense>>({
    category: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    supplier: '',
    notes: '',
    expense_date: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('');

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const canViewRentalsResult = await hasPermission('rentals_view', 'view');
      const canEditRentalsResult = await hasPermission('rentals_edit', 'edit');
      const canViewFinancialsResult = userRole === 'admin'; // Only admin can see financials
      setCanViewRentals(canViewRentalsResult);
      setCanEditRentals(canEditRentalsResult);
      setCanViewFinancials(canViewFinancialsResult);
    };
    checkPermissions();
  }, [hasPermission, userRole]);

  // Update selectedMonth when year changes
  useEffect(() => {
    setSelectedMonth(new Date(selectedYear, selectedMonth.getMonth(), 1));
  }, [selectedYear]);

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

  const fetchExpenses = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_expenses')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Erro ao carregar despesas",
        description: "Não foi possível carregar as despesas.",
        variant: "destructive"
      });
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive"
      });
    }
  };

  const fetchCollaborators = async () => {
    try {
      // Mock data for collaborators since the table doesn't exist in schema
      const mockCollaborators = [
        {
          id: "1",
          name: "João Silva",
          email: "joao@empresa.com",
          phone: "(11) 99999-9999",
          role: "Funcionário",
          status: "active" as const,
          createdAt: "2024-01-15"
        },
        {
          id: "2",
          name: "Maria Santos",
          email: "maria@empresa.com",
          phone: "(11) 88888-8888",
          role: "Técnico",
          status: "active" as const,
          createdAt: "2024-01-10"
        }
      ];
      setCollaborators(mockCollaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: "Erro ao carregar contas bancárias",
        description: "Não foi possível carregar as contas bancárias.",
        variant: "destructive"
      });
    }
  };

  const createEvent = async (event: Partial<Event>) => {
    if (!event.name || !event.client_name || !event.event_date || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome do evento, cliente e data.",
        variant: "destructive"
      });
      return;
    }

    try {
      const eventData = {
        name: event.name,
        client_name: event.client_name,
        client_email: event.client_email || '',
        client_phone: event.client_phone || '',
        setup_start_date: event.setup_start_date || null,
        event_date: event.event_date,
        event_time: event.event_time || null,
        location: event.location || '',
        description: event.description || '',
        total_budget: event.total_budget || 0,
        status: event.status || 'pending',
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select();

      if (error) throw error;
      
      await fetchEvents();
      toast({
        title: "Evento criado com sucesso!",
        description: "O evento foi criado e adicionado à lista.",
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Erro ao criar evento",
        description: "Não foi possível criar o evento.",
        variant: "destructive"
      });
    } finally {
      setEventDialog(false);
      setNewEvent({
        name: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        setup_start_date: '',
        event_date: '',
        event_time: '',
        location: '',
        description: '',
        total_budget: 0,
        status: 'pending'
      });
    }
  };

  const updateEvent = async (id: string, updates: Partial<Event>) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;

      setEvents(events.map(event => (event.id === id ? { ...event, ...data[0] } : event)));
      toast({
        title: "Evento atualizado com sucesso!",
        description: "O evento foi atualizado.",
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Erro ao atualizar evento",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive"
      });
    } finally {
      setEditEventDialog(false);
      setSelectedEventForEdit(null);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEvents(events.filter(event => event.id !== id));
      toast({
        title: "Evento excluído com sucesso!",
        description: "O evento foi removido da lista.",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro ao excluir evento",
        description: "Não foi possível excluir o evento.",
        variant: "destructive"
      });
    }
  };

  const createExpense = async (expense: Partial<EventExpense>) => {
    if (!selectedEvent || !user) return;

    try {
      const expenseData = {
        event_id: selectedEvent.id,
        category: expense.category || '',
        description: expense.description || '',
        quantity: expense.quantity || 1,
        unit_price: expense.unit_price || 0,
        total_price: expense.total_price || 0,
        supplier: expense.supplier || '',
        notes: expense.notes || '',
        expense_date: expense.expense_date || format(new Date(), 'yyyy-MM-dd'),
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('event_expenses')
        .insert(expenseData)
        .select();

      if (error) throw error;

      setExpenses([...expenses, ...data]);
      toast({
        title: "Despesa criada com sucesso!",
        description: "A despesa foi adicionada ao evento.",
      });

      // Update total_expenses in events table
      const newTotalExpenses = selectedEvent.total_expenses + expense.total_price!;
      const { error: updateError } = await supabase
        .from('events')
        .update({ total_expenses: newTotalExpenses })
        .eq('id', selectedEvent.id);

      if (updateError) throw updateError;

      // Update local state for events
      setEvents(events.map(event =>
        event.id === selectedEvent.id ? { ...event, total_expenses: newTotalExpenses } : event
      ));

      setSelectedEvent(events.find(event => event.id === selectedEvent.id) || null);

    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Erro ao criar despesa",
        description: "Não foi possível criar a despesa.",
        variant: "destructive"
      });
    } finally {
      setExpenseDialog(false);
      setNewExpense({
        category: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        supplier: '',
        notes: '',
        expense_date: format(new Date(), 'yyyy-MM-dd')
      });
    }
  };

  const updateExpense = async (id: string, updates: Partial<EventExpense>) => {
    try {
      const { data, error } = await supabase
        .from('event_expenses')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;

      setExpenses(expenses.map(expense => (expense.id === id ? { ...expense, ...data[0] } : expense)));
      toast({
        title: "Despesa atualizada com sucesso!",
        description: "A despesa foi atualizada.",
      });

      // Recalculate total_expenses in events table
      if (selectedEvent) {
        const updatedExpenses = expenses.map(expense => (expense.id === id ? { ...expense, ...data[0] } : expense));
        const newTotalExpenses = updatedExpenses.reduce((acc, curr) => acc + curr.total_price!, 0);

        const { error: updateError } = await supabase
          .from('events')
          .update({ total_expenses: newTotalExpenses })
          .eq('id', selectedEvent.id);

        if (updateError) throw updateError;

        // Update local state for events
        setEvents(events.map(event =>
          event.id === selectedEvent.id ? { ...event, total_expenses: newTotalExpenses } : event
        ));

        setSelectedEvent(events.find(event => event.id === selectedEvent.id) || null);
      }

    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Erro ao atualizar despesa",
        description: "Não foi possível atualizar a despesa.",
        variant: "destructive"
      });
    } finally {
      setEditExpenseDialog(false);
      setSelectedExpenseForEdit(null);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('event_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExpenses(expenses.filter(expense => expense.id !== id));
      toast({
        title: "Despesa excluída com sucesso!",
        description: "A despesa foi removida do evento.",
      });

      // Recalculate total_expenses in events table
      if (selectedEvent) {
        const updatedExpenses = expenses.filter(expense => expense.id !== id);
        const newTotalExpenses = updatedExpenses.reduce((acc, curr) => acc + curr.total_price!, 0);

        const { error: updateError } = await supabase
          .from('events')
          .update({ total_expenses: newTotalExpenses })
          .eq('id', selectedEvent.id);

        if (updateError) throw updateError;

        // Update local state for events
        setEvents(events.map(event =>
          event.id === selectedEvent.id ? { ...event, total_expenses: newTotalExpenses } : event
        ));

        setSelectedEvent(events.find(event => event.id === selectedEvent.id) || null);
      }

    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Erro ao excluir despesa",
        description: "Não foi possível excluir a despesa.",
        variant: "destructive"
      });
    }
  };

  const updateEventStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: status })
        .eq('id', id);

      if (error) throw error;

      setEvents(events.map(event =>
        event.id === id ? { ...event, status: status } : event
      ));
      toast({
        title: "Status do evento atualizado!",
        description: "O status do evento foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: "Erro ao atualizar status do evento",
        description: "Não foi possível atualizar o status do evento.",
        variant: "destructive"
      });
    } finally {
      setStatusDialog(false);
      setSelectedEventForStatus(null);
      setNewStatus('');
    }
  };

  // Helper functions for status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'active':
        return 'Em Andamento';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchBankAccounts();
    fetchClients();
    fetchCollaborators();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando eventos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!canViewRentals) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Acesso Negado</h3>
            <p className="text-muted-foreground">Você não tem permissão para visualizar locações.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Locações</h2>
          <p className="text-muted-foreground">Gerencie eventos e locações</p>
        </div>
        {canEditRentals && (
          <Button onClick={() => setEventDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        )}
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
              {generateYearsAndMonths().map(({ year }) => (
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
            {generateYearsAndMonths()
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
          
          {generateYearsAndMonths()
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
                        Nenhum evento encontrado para este mês
                      </div>
                    ) : (
                      filteredEvents.map((event) => (
                        <Card key={event.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="flex items-center gap-2">
                                  <CalendarIcon className="h-5 w-5 text-primary" />
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
                                    <CalendarIcon className="h-4 w-4" />
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
                                <Badge className={getStatusColor(event.status)}>
                                  {getStatusText(event.status)}
                                </Badge>
                                {event.is_paid && (
                                  <Badge className="bg-green-100 text-green-800">
                                    Pago
                                  </Badge>
                                )}
                                {canEditRentals && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEventForEdit(event);
                                        setEditEventDialog(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteEvent(event.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          
                          {canViewFinancials && (
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <div>
                                    <p className="text-sm font-medium">Orçamento</p>
                                    <p className="text-lg font-bold text-green-600">
                                      R$ {event.total_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-red-600" />
                                  <div>
                                    <p className="text-sm font-medium">Despesas</p>
                                    <p className="text-lg font-bold text-red-600">
                                      R$ {event.total_expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calculator className="h-4 w-4 text-blue-600" />
                                  <div>
                                    <p className="text-sm font-medium">Lucro</p>
                                    <p className={`text-lg font-bold ${event.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      R$ {event.profit_margin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
        </Tabs>
      </div>
    </div>
  );
};
