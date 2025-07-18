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
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      
      const formattedCollaborators = (data || []).map(collaborator => ({
        id: collaborator.id,
        name: collaborator.name,
        email: collaborator.email,
        phone: collaborator.phone,
        role: collaborator.role,
        status: collaborator.status as 'active' | 'inactive',
        createdAt: collaborator.created_at
      }));
      
      setCollaborators(formattedCollaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      toast({
        title: "Erro ao carregar colaboradores",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive"
      });
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
        <Button onClick={() => setEventDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEvent(event);
                                        fetchExpenses(event.id);
                                      }}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Despesas
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

      {/* Dialog para Criar Novo Evento */}
      <Dialog open={eventDialog} onOpenChange={setEventDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Evento</DialogTitle>
            <DialogDescription>
              Preencha os dados do evento
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Evento *</Label>
                <Input
                  id="name"
                  value={newEvent.name || ''}
                  onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                  placeholder="Nome do evento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_name">Cliente *</Label>
                <div className="space-y-2">
                  <Input
                    id="client_name"
                    list="clients-list"
                    value={newEvent.client_name || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const selectedClient = clients.find(client => client.name === value);
                      if (selectedClient) {
                        setNewEvent({
                          ...newEvent,
                          client_name: selectedClient.name,
                          client_email: selectedClient.email || '',
                          client_phone: selectedClient.phone || ''
                        });
                      } else {
                        setNewEvent({
                          ...newEvent,
                          client_name: value,
                          client_email: '',
                          client_phone: ''
                        });
                      }
                    }}
                    placeholder="Digite ou selecione um cliente"
                  />
                  <datalist id="clients-list">
                    {clients.map((client) => (
                      <option key={client.id} value={client.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_email">Email do Cliente</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={newEvent.client_email || ''}
                  onChange={(e) => setNewEvent({...newEvent, client_email: e.target.value})}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_phone">Telefone do Cliente</Label>
                <Input
                  id="client_phone"
                  value={newEvent.client_phone || ''}
                  onChange={(e) => setNewEvent({...newEvent, client_phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Data do Evento *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={newEvent.event_date || ''}
                  onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_time">Horário do Evento</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={newEvent.event_time || ''}
                  onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="setup_start_date">Data de Montagem</Label>
              <Input
                id="setup_start_date"
                type="date"
                value={newEvent.setup_start_date || ''}
                onChange={(e) => setNewEvent({...newEvent, setup_start_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Local do Evento</Label>
              <Input
                id="location"
                value={newEvent.location || ''}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                placeholder="Endereço do evento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_budget">Orçamento Total</Label>
              <Input
                id="total_budget"
                type="number"
                step="0.01"
                value={newEvent.total_budget || ''}
                onChange={(e) => setNewEvent({...newEvent, total_budget: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newEvent.description || ''}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Detalhes do evento..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEventDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createEvent(newEvent)}>
              Criar Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Evento */}
      <Dialog open={editEventDialog} onOpenChange={setEditEventDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Modifique os dados do evento
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nome do Evento *</Label>
                <Input
                  id="edit_name"
                  value={selectedEventForEdit?.name || ''}
                  onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, name: e.target.value} : null)}
                  placeholder="Nome do evento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_client_name">Cliente *</Label>
                <div className="space-y-2">
                  <Input
                    id="edit_client_name"
                    list="edit-clients-list"
                    value={selectedEventForEdit?.client_name || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const selectedClient = clients.find(client => client.name === value);
                      if (selectedClient && selectedEventForEdit) {
                        setSelectedEventForEdit({
                          ...selectedEventForEdit,
                          client_name: selectedClient.name,
                          client_email: selectedClient.email || '',
                          client_phone: selectedClient.phone || ''
                        });
                      } else if (selectedEventForEdit) {
                        setSelectedEventForEdit({
                          ...selectedEventForEdit,
                          client_name: value
                        });
                      }
                    }}
                    placeholder="Digite ou selecione um cliente"
                  />
                  <datalist id="edit-clients-list">
                    {clients.map((client) => (
                      <option key={client.id} value={client.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_client_email">Email do Cliente</Label>
                <Input
                  id="edit_client_email"
                  type="email"
                  value={selectedEventForEdit?.client_email || ''}
                  onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, client_email: e.target.value} : null)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_client_phone">Telefone do Cliente</Label>
                <Input
                  id="edit_client_phone"
                  value={selectedEventForEdit?.client_phone || ''}
                  onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, client_phone: e.target.value} : null)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_event_date">Data do Evento *</Label>
                <Input
                  id="edit_event_date"
                  type="date"
                  value={selectedEventForEdit?.event_date || ''}
                  onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, event_date: e.target.value} : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_event_time">Horário do Evento</Label>
                <Input
                  id="edit_event_time"
                  type="time"
                  value={selectedEventForEdit?.event_time || ''}
                  onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, event_time: e.target.value} : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_setup_start_date">Data de Montagem</Label>
              <Input
                id="edit_setup_start_date"
                type="date"
                value={selectedEventForEdit?.setup_start_date || ''}
                onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, setup_start_date: e.target.value} : null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_location">Local do Evento</Label>
              <Input
                id="edit_location"
                value={selectedEventForEdit?.location || ''}
                onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, location: e.target.value} : null)}
                placeholder="Endereço do evento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_total_budget">Orçamento Total</Label>
              <Input
                id="edit_total_budget"
                type="number"
                step="0.01"
                value={selectedEventForEdit?.total_budget || ''}
                onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, total_budget: parseFloat(e.target.value) || 0} : null)}
                placeholder="0.00"
              />
            </div>

            {/* Seção de Pagamento */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_paid"
                  checked={selectedEventForEdit?.is_paid || false}
                  onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, is_paid: e.target.checked} : null)}
                  className="rounded"
                />
                <Label htmlFor="edit_is_paid" className="font-medium">Marcar como Pago</Label>
              </div>

              {selectedEventForEdit?.is_paid && (
                <div className="grid gap-4 pl-6 border-l-2 border-green-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_payment_type">Tipo de Pagamento</Label>
                      <Select
                        value={selectedEventForEdit?.payment_type || 'total'}
                        onValueChange={(value) => setSelectedEventForEdit(prev => prev ? {...prev, payment_type: value} : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="total">Valor Total</SelectItem>
                          <SelectItem value="entrada">Entrada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_payment_amount">Valor Pago</Label>
                      <Input
                        id="edit_payment_amount"
                        type="number"
                        step="0.01"
                        value={selectedEventForEdit?.payment_amount || ''}
                        onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, payment_amount: parseFloat(e.target.value) || 0} : null)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_payment_bank_account">Conta de Recebimento</Label>
                      <Select
                        value={selectedEventForEdit?.payment_bank_account || ''}
                        onValueChange={(value) => setSelectedEventForEdit(prev => prev ? {...prev, payment_bank_account: value} : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.name}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_payment_date">Data do Pagamento</Label>
                      <Input
                        id="edit_payment_date"
                        type="date"
                        value={selectedEventForEdit?.payment_date || ''}
                        onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, payment_date: e.target.value} : null)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Descrição</Label>
              <Textarea
                id="edit_description"
                value={selectedEventForEdit?.description || ''}
                onChange={(e) => setSelectedEventForEdit(prev => prev ? {...prev, description: e.target.value} : null)}
                placeholder="Detalhes do evento..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_status">Status do Evento</Label>
              <Select
                value={selectedEventForEdit?.status || 'pending'}
                onValueChange={(value) => setSelectedEventForEdit(prev => prev ? {...prev, status: value} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="active">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditEventDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => selectedEventForEdit && updateEvent(selectedEventForEdit.id, selectedEventForEdit)}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Gerenciar Despesas */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Despesas do Evento: {selectedEvent.name}</DialogTitle>
              <DialogDescription>
                Gerencie as despesas deste evento
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Lista de Despesas</h3>
                <Button onClick={() => setExpenseDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Despesa
                </Button>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma despesa cadastrada para este evento
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.quantity}</TableCell>
                        <TableCell>R$ {expense.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>R$ {expense.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{expense.supplier}</TableCell>
                        <TableCell>{expense.expense_bank_account || 'Não informado'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedExpenseForEdit(expense);
                                setEditExpenseDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-semibold">
                  Total das Despesas: R$ {expenses.reduce((acc, exp) => acc + exp.total_price, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog para Criar Nova Despesa */}
      <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>
              Adicione uma nova despesa ao evento
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense_description">Descrição *</Label>
                <Input
                  id="expense_description"
                  value={newExpense.description || ''}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="Descrição da despesa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_category">Categoria *</Label>
                <Select
                  value={newExpense.category || ''}
                  onValueChange={(value) => setNewExpense({...newExpense, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Iluminação">Iluminação</SelectItem>
                    <SelectItem value="Som">Som</SelectItem>
                    <SelectItem value="Cenografia">Cenografia</SelectItem>
                    <SelectItem value="Transporte">Transporte</SelectItem>
                    <SelectItem value="Alimentação">Alimentação</SelectItem>
                    <SelectItem value="Material">Material</SelectItem>
                    <SelectItem value="Colaborador">Colaborador</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campo para selecionar colaborador quando categoria é "Colaborador" */}
            {newExpense.category === 'Colaborador' && (
              <div className="space-y-2">
                <Label htmlFor="expense_collaborator">Colaborador</Label>
                <Select
                  value={newExpense.supplier || ''}
                  onValueChange={(value) => {
                    const selectedCollaborator = collaborators.find(c => c.name === value);
                    if (selectedCollaborator) {
                      setNewExpense({
                        ...newExpense, 
                        supplier: selectedCollaborator.name,
                        description: `Pagamento - ${selectedCollaborator.name}`
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {collaborators.map((collaborator) => (
                      <SelectItem key={collaborator.id} value={collaborator.name}>
                        {collaborator.name} - {collaborator.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense_quantity">Quantidade</Label>
                <Input
                  id="expense_quantity"
                  type="number"
                  min="1"
                  value={newExpense.quantity || 1}
                  onChange={(e) => {
                    const quantity = parseInt(e.target.value) || 1;
                    const unit_price = newExpense.unit_price || 0;
                    setNewExpense({
                      ...newExpense, 
                      quantity,
                      total_price: quantity * unit_price
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_unit_price">Valor Unitário</Label>
                <Input
                  id="expense_unit_price"
                  type="number"
                  step="0.01"
                  value={newExpense.unit_price || ''}
                  onChange={(e) => {
                    const unit_price = parseFloat(e.target.value) || 0;
                    const quantity = newExpense.quantity || 1;
                    setNewExpense({
                      ...newExpense, 
                      unit_price,
                      total_price: quantity * unit_price
                    });
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_total_price">Valor Total</Label>
                <Input
                  id="expense_total_price"
                  type="number"
                  step="0.01"
                  value={newExpense.total_price || ''}
                  onChange={(e) => setNewExpense({...newExpense, total_price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense_supplier">Fornecedor</Label>
                <Input
                  id="expense_supplier"
                  value={newExpense.supplier || ''}
                  onChange={(e) => setNewExpense({...newExpense, supplier: e.target.value})}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_bank_account">Conta de Débito</Label>
                <Select
                  value={newExpense.expense_bank_account || ''}
                  onValueChange={(value) => setNewExpense({...newExpense, expense_bank_account: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.name}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_date">Data da Despesa</Label>
              <Input
                id="expense_date"
                type="date"
                value={newExpense.expense_date || ''}
                onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_notes">Observações</Label>
              <Textarea
                id="expense_notes"
                value={newExpense.notes || ''}
                onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                placeholder="Observações adicionais..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExpenseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createExpense(newExpense)}>
              Criar Despesa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Despesa */}
      <Dialog open={editExpenseDialog} onOpenChange={setEditExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>
              Modifique os dados da despesa
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_expense_description">Descrição *</Label>
                <Input
                  id="edit_expense_description"
                  value={selectedExpenseForEdit?.description || ''}
                  onChange={(e) => setSelectedExpenseForEdit(prev => prev ? {...prev, description: e.target.value} : null)}
                  placeholder="Descrição da despesa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_expense_category">Categoria *</Label>
                <Select
                  value={selectedExpenseForEdit?.category || ''}
                  onValueChange={(value) => setSelectedExpenseForEdit(prev => prev ? {...prev, category: value} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Iluminação">Iluminação</SelectItem>
                    <SelectItem value="Som">Som</SelectItem>
                    <SelectItem value="Cenografia">Cenografia</SelectItem>
                    <SelectItem value="Transporte">Transporte</SelectItem>
                    <SelectItem value="Alimentação">Alimentação</SelectItem>
                    <SelectItem value="Material">Material</SelectItem>
                    <SelectItem value="Colaborador">Colaborador</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campo para selecionar colaborador quando categoria é "Colaborador" */}
            {selectedExpenseForEdit?.category === 'Colaborador' && (
              <div className="space-y-2">
                <Label htmlFor="edit_expense_collaborator">Colaborador</Label>
                <Select
                  value={selectedExpenseForEdit?.supplier || ''}
                  onValueChange={(value) => {
                    const selectedCollaborator = collaborators.find(c => c.name === value);
                    if (selectedCollaborator && selectedExpenseForEdit) {
                      setSelectedExpenseForEdit({
                        ...selectedExpenseForEdit, 
                        supplier: selectedCollaborator.name,
                        description: `Pagamento - ${selectedCollaborator.name}`
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {collaborators.map((collaborator) => (
                      <SelectItem key={collaborator.id} value={collaborator.name}>
                        {collaborator.name} - {collaborator.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_expense_quantity">Quantidade</Label>
                <Input
                  id="edit_expense_quantity"
                  type="number"
                  min="1"
                  value={selectedExpenseForEdit?.quantity || 1}
                  onChange={(e) => {
                    const quantity = parseInt(e.target.value) || 1;
                    const unit_price = selectedExpenseForEdit?.unit_price || 0;
                    setSelectedExpenseForEdit(prev => prev ? {
                      ...prev, 
                      quantity,
                      total_price: quantity * unit_price
                    } : null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_expense_unit_price">Valor Unitário</Label>
                <Input
                  id="edit_expense_unit_price"
                  type="number"
                  step="0.01"
                  value={selectedExpenseForEdit?.unit_price || ''}
                  onChange={(e) => {
                    const unit_price = parseFloat(e.target.value) || 0;
                    const quantity = selectedExpenseForEdit?.quantity || 1;
                    setSelectedExpenseForEdit(prev => prev ? {
                      ...prev, 
                      unit_price,
                      total_price: quantity * unit_price
                    } : null);
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_expense_total_price">Valor Total</Label>
                <Input
                  id="edit_expense_total_price"
                  type="number"
                  step="0.01"
                  value={selectedExpenseForEdit?.total_price || ''}
                  onChange={(e) => setSelectedExpenseForEdit(prev => prev ? {...prev, total_price: parseFloat(e.target.value) || 0} : null)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_expense_supplier">Fornecedor</Label>
                <Input
                  id="edit_expense_supplier"
                  value={selectedExpenseForEdit?.supplier || ''}
                  onChange={(e) => setSelectedExpenseForEdit(prev => prev ? {...prev, supplier: e.target.value} : null)}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_expense_bank_account">Conta de Débito</Label>
                <Select
                  value={selectedExpenseForEdit?.expense_bank_account || ''}
                  onValueChange={(value) => setSelectedExpenseForEdit(prev => prev ? {...prev, expense_bank_account: value} : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.name}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_expense_date">Data da Despesa</Label>
              <Input
                id="edit_expense_date"
                type="date"
                value={selectedExpenseForEdit?.expense_date || ''}
                onChange={(e) => setSelectedExpenseForEdit(prev => prev ? {...prev, expense_date: e.target.value} : null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_expense_notes">Observações</Label>
              <Textarea
                id="edit_expense_notes"
                value={selectedExpenseForEdit?.notes || ''}
                onChange={(e) => setSelectedExpenseForEdit(prev => prev ? {...prev, notes: e.target.value} : null)}
                placeholder="Observações adicionais..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditExpenseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => selectedExpenseForEdit && updateExpense(selectedExpenseForEdit.id, selectedExpenseForEdit)}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
