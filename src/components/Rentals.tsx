import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
import { AlertCircle, Calendar, Clock, MapPin, User, DollarSign, FileText, Plus, Edit, Trash2, Calculator, Shield, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths } from 'date-fns';

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
  const { userRole, user } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
    notes: ''
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

  // Fetch bank accounts
  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  // Fetch clients
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      // Silently fail for clients, as it's optional
    }
  };

  // Fetch collaborators
  const fetchCollaborators = async () => {
    try {
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
        },
        {
          id: "3",
          name: "Carlos Oliveira",
          email: "carlos@empresa.com",
          phone: "(11) 77777-7777",
          role: "Motorista",
          status: "active" as const,
          createdAt: "2024-01-05"
        }
      ];
      setCollaborators(mockCollaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  // Add new event
  const addEvent = async () => {
    if (!newEvent.name || !newEvent.client_name || !newEvent.event_date || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome do evento, cliente e data.",
        variant: "destructive"
      });
      return;
    }

    try {
      const eventData: any = {
        name: newEvent.name,
        client_name: newEvent.client_name,
        client_email: newEvent.client_email || '',
        client_phone: newEvent.client_phone || '',
        setup_start_date: newEvent.setup_start_date || null,
        event_date: newEvent.event_date,
        event_time: newEvent.event_time || '',
        location: newEvent.location || '',
        description: newEvent.description || '',
        total_budget: newEvent.total_budget || 0,
        status: newEvent.status || 'pending',
        created_by: user.id
      };

      // Remove old payment bank account check

      const { error } = await supabase
        .from('events')
        .insert(eventData);

      if (error) throw error;

      await fetchEvents();
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
      setEventDialog(false);

      toast({
        title: "Evento criado",
        description: "O evento foi criado com sucesso.",
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Erro ao criar evento",
        description: "Não foi possível criar o evento.",
        variant: "destructive"
      });
    }
  };

  // Edit event
  const updateEvent = async () => {
    if (!selectedEventForEdit || !newEvent.name || !newEvent.client_name || !newEvent.event_date || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome do evento, cliente e data.",
        variant: "destructive"
      });
      return;
    }

    try {
      const eventData = {
        name: newEvent.name,
        client_name: newEvent.client_name,
        client_email: newEvent.client_email || '',
        client_phone: newEvent.client_phone || '',
        setup_start_date: newEvent.setup_start_date || null,
        event_date: newEvent.event_date,
        event_time: newEvent.event_time || '',
        location: newEvent.location || '',
        description: newEvent.description || '',
        total_budget: newEvent.total_budget || 0,
        status: newEvent.status || 'pending',
        is_paid: newEvent.is_paid || false,
        payment_date: newEvent.payment_date || null,
        payment_bank_account: newEvent.payment_bank_account || null,
        payment_amount: newEvent.payment_amount || 0,
        payment_type: newEvent.payment_type || 'total'
      };

      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', selectedEventForEdit.id);

      if (error) throw error;

      await fetchEvents();
      setEditEventDialog(false);
      setSelectedEventForEdit(null);
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

      toast({
        title: "Evento atualizado",
        description: "O evento foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Erro ao atualizar evento",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive"
      });
    }
  };

  // Remove event
  const removeEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`Tem certeza que deseja remover o evento "${eventName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      // Get event details before removal to calculate account balance changes
      const { data: eventData, error: eventFetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventFetchError) throw eventFetchError;

      // First remove all related expenses
      const { error: expensesError } = await supabase
        .from('event_expenses')
        .delete()
        .eq('event_id', eventId);

      if (expensesError) throw expensesError;

      // Remove event collaborators
      const { error: collaboratorsError } = await supabase
        .from('event_collaborators')
        .delete()
        .eq('event_id', eventId);

      if (collaboratorsError) throw collaboratorsError;

      // Remove event equipment
      const { error: equipmentError } = await supabase
        .from('event_equipment')
        .delete()
        .eq('event_id', eventId);

      if (equipmentError) throw equipmentError;

      // Update bank account balance if event was paid
      if (eventData.is_paid && eventData.payment_amount > 0 && eventData.payment_bank_account) {
        // Find the bank account and subtract the payment amount
        const { data: bankAccount, error: bankFetchError } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('name', eventData.payment_bank_account)
          .single();

        if (!bankFetchError && bankAccount) {
          const newBalance = (bankAccount.balance || 0) - eventData.payment_amount;
          
          const { error: bankUpdateError } = await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', bankAccount.id);

          if (bankUpdateError) {
            console.error('Error updating bank account balance:', bankUpdateError);
            // Don't throw here, continue with event removal
          }
        }
      }

      // Finally remove the event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      await fetchEvents();
      toast({
        title: "Evento removido",
        description: "O evento e os saldos das contas foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error('Error removing event:', error);
      toast({
        title: "Erro ao remover evento",
        description: "Não foi possível remover o evento.",
        variant: "destructive"
      });
    }
  };

  // Toggle payment status
  const togglePaymentStatus = async (event: Event) => {
    try {
      const newPaidStatus = !event.is_paid;
      const paymentAmount = Number(event.payment_amount) || Number(event.total_budget) || 0;
      const paymentAccount = event.payment_bank_account || "Conta Corrente Principal";

      console.log(`Toggling payment status for event ${event.name}: ${event.is_paid} -> ${newPaidStatus}, amount: ${paymentAmount}, account: ${paymentAccount}`);

      // Check if this toggle would create a duplicate operation
      if (paymentAmount <= 0) {
        console.warn('No payment amount found for event:', event.name);
      }

      // Update event payment status first
      const { error } = await supabase
        .from('events')
        .update({ 
          is_paid: newPaidStatus,
          payment_date: newPaidStatus ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', event.id);

      if (error) throw error;

      await fetchEvents();
      toast({
        title: event.is_paid ? "Marcado como não pago" : "Marcado como pago",
        description: "Status de pagamento atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Erro ao atualizar pagamento",
        description: "Não foi possível atualizar o status de pagamento.",
        variant: "destructive"
      });
    }
  };

  // Fetch expenses for selected event
  const fetchExpenses = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_expenses')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

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

  // Add new expense
  const addExpense = async () => {
    if (!selectedEvent || !newExpense.category || !newExpense.description || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha categoria e descrição.",
        variant: "destructive"
      });
      return;
    }

    try {
      const expenseData: any = {
        event_id: selectedEvent.id,
        category: newExpense.category,
        description: newExpense.description,
        quantity: newExpense.quantity || 1,
        unit_price: newExpense.unit_price || 0,
        total_price: (newExpense.quantity || 1) * (newExpense.unit_price || 0),
        supplier: newExpense.supplier || '',
        notes: newExpense.notes || '',
        created_by: user.id
      };

      // Add bank account if selected
      if (newExpense.expense_bank_account) {
        expenseData.expense_bank_account = newExpense.expense_bank_account;
      }

      const { error } = await supabase
        .from('event_expenses')
        .insert(expenseData);

      if (error) throw error;

      await fetchExpenses(selectedEvent.id);
      await fetchEvents(); // Refresh to update totals
      setNewExpense({
        category: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        supplier: '',
        notes: ''
      });
      setSelectedCollaborator('');
      setExpenseDialog(false);

      toast({
        title: "Despesa adicionada",
        description: "A despesa foi adicionada com sucesso.",
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Erro ao adicionar despesa",
        description: "Não foi possível adicionar a despesa.",
        variant: "destructive"
      });
    }
  };

  // Edit expense
  const updateExpense = async () => {
    if (!selectedExpenseForEdit || !newExpense.category || !newExpense.description || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha categoria e descrição.",
        variant: "destructive"
      });
      return;
    }

    try {
      const expenseData: any = {
        category: newExpense.category,
        description: newExpense.description,
        quantity: newExpense.quantity || 1,
        unit_price: newExpense.unit_price || 0,
        total_price: (newExpense.quantity || 1) * (newExpense.unit_price || 0),
        supplier: newExpense.supplier || '',
        notes: newExpense.notes || ''
      };

      // Add bank account if selected
      if (newExpense.expense_bank_account) {
        expenseData.expense_bank_account = newExpense.expense_bank_account;
      }

      const { error } = await supabase
        .from('event_expenses')
        .update(expenseData)
        .eq('id', selectedExpenseForEdit.id);

      if (error) throw error;

      await fetchExpenses(selectedEvent!.id);
      await fetchEvents(); // Refresh to update totals
      setNewExpense({
        category: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        supplier: '',
        notes: ''
      });
      setSelectedCollaborator('');
      setEditExpenseDialog(false);
      setSelectedExpenseForEdit(null);

      toast({
        title: "Despesa atualizada",
        description: "A despesa foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Erro ao atualizar despesa",
        description: "Não foi possível atualizar a despesa.",
        variant: "destructive"
      });
    }
  };

  // Delete expense
  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('event_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      await fetchExpenses(selectedEvent!.id);
      await fetchEvents(); // Refresh to update totals

      toast({
        title: "Despesa removida",
        description: "A despesa foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Erro ao remover despesa",
        description: "Não foi possível remover a despesa.",
        variant: "destructive"
      });
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
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
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  // Update event status
  const updateEventStatus = async () => {
    if (!selectedEventForStatus || !newStatus) {
      toast({
        title: "Erro",
        description: "Selecione um status válido.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', selectedEventForStatus.id);

      if (error) throw error;

      await fetchEvents();
      setStatusDialog(false);
      setSelectedEventForStatus(null);
      setNewStatus('');

      toast({
        title: "Status atualizado",
        description: "O status do evento foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do evento.",
        variant: "destructive"
      });
    }
  };

  // Calculate unit price when quantity changes
  const handleQuantityChange = (quantity: number) => {
    setNewExpense(prev => ({
      ...prev,
      quantity,
      total_price: quantity * (prev.unit_price || 0)
    }));
  };

  // Calculate total price when unit price changes
  const handleUnitPriceChange = (unitPrice: number) => {
    setNewExpense(prev => ({
      ...prev,
      unit_price: unitPrice,
      total_price: (prev.quantity || 1) * unitPrice
    }));
  };

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(client => client.id === clientId);
    if (selectedClient) {
      setNewEvent(prev => ({
        ...prev,
        client_name: selectedClient.name,
        client_email: selectedClient.email || '',
        client_phone: selectedClient.phone || ''
      }));
    }
  };

  // Generate years and months for tabs
  const generateYearsAndMonths = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Generate 2 years before and 2 years after current year
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

  useEffect(() => {
    fetchEvents();
    fetchClients();
    fetchCollaborators();
    fetchBankAccounts();

    // Set up real-time subscription for bank accounts
    const channel = supabase
      .channel('rentals-bank-accounts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts'
        },
        (payload) => {
          console.log('Bank account change detected in Rentals:', payload);
          // Refresh bank accounts when changes are detected
          fetchBankAccounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('Event change detected in Rentals:', payload);
          // Refresh events when changes are detected
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const yearsAndMonths = generateYearsAndMonths();
  
  // Update selectedMonth when year changes
  useEffect(() => {
    setSelectedMonth(new Date(selectedYear, selectedMonth.getMonth(), 1));
  }, [selectedYear]);

  if (loading) {
    return <div className="p-6">Carregando eventos...</div>;
  }

  // Show permission warning if user has no view access
  if (!canViewRentals) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Você não tem permissão para visualizar informações de eventos.
            </p>
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
                                 <Badge className={getStatusColor(event.status)}>
                                   {getStatusText(event.status)}
                                 </Badge>
                                  {event.is_paid && (
                                    <Badge className="bg-green-100 text-green-800" title={`${event.payment_type === 'entrada' ? 'Entrada' : 'Valor Total'}: R$ ${event.payment_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
                                      {event.payment_type === 'entrada' ? 'Entrada Paga' : 'Pago'}
                                    </Badge>
                                  )}
                                  {canEditRentals && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedEventForEdit(event);
                                          setNewEvent(event);
                                          setEditEventDialog(true);
                                        }}
                                        title="Editar evento"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedEventForStatus(event);
                                          setNewStatus(event.status);
                                          setStatusDialog(true);
                                        }}
                                        title="Alterar status"
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeEvent(event.id, event.name)}
                                        title="Remover evento"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                   )}
                                  {canViewFinancials && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedEvent(event);
                                        fetchExpenses(event.id);
                                      }}
                                    >
                                      <Calculator className="h-4 w-4 mr-2" />
                                      Despesas
                                    </Button>
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
                                  <AlertCircle className={`h-4 w-4 ${event.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`} />
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

      {/* Expense Management Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => {
        if (!open) {
          setSelectedEvent(null);
          setExpenses([]);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planilha de Despesas - {selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              Gerencie as despesas relacionadas a este evento
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-6">
              {/* Event Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Orçamento Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {selectedEvent.total_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Despesas</p>
                  <p className="text-2xl font-bold text-red-600">
                    R$ {selectedEvent.total_expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lucro Projetado</p>
                  <p className={`text-2xl font-bold ${selectedEvent.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {selectedEvent.profit_margin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Add Expense Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Despesas do Evento</h3>
                <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Despesa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Despesa</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova despesa ao evento
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                           <Label htmlFor="category">Categoria</Label>
                            <Select value={newExpense.category} onValueChange={(value) => {
                              setNewExpense(prev => ({ ...prev, category: value }));
                              if (value !== 'Colaborador') {
                                setSelectedCollaborator('');
                              }
                            }}>
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione a categoria" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Iluminação">Iluminação</SelectItem>
                               <SelectItem value="Som">Som</SelectItem>
                               <SelectItem value="Estrutura">Estrutura</SelectItem>
                               <SelectItem value="Transporte">Transporte</SelectItem>
                               <SelectItem value="Pessoal">Pessoal</SelectItem>
                               <SelectItem value="Colaborador">Colaborador</SelectItem>
                               <SelectItem value="Material">Material</SelectItem>
                               <SelectItem value="Outros">Outros</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         
                         <div>
                           <Label htmlFor="supplier">Fornecedor</Label>
                           <Input
                             id="supplier"
                             value={newExpense.supplier || ''}
                             onChange={(e) => setNewExpense(prev => ({ ...prev, supplier: e.target.value }))}
                             placeholder="Nome do fornecedor"
                             disabled={newExpense.category === 'Colaborador'}
                           />
                         </div>
                       </div>
                       
                       {/* Collaborator Selection - only shown when category is "Colaborador" */}
                       {newExpense.category === 'Colaborador' && (
                         <div>
                           <Label htmlFor="collaborator">Colaborador</Label>
                           <Select 
                             value={selectedCollaborator} 
                             onValueChange={(value) => {
                               setSelectedCollaborator(value);
                               const selected = collaborators.find(c => c.id === value);
                               if (selected) {
                                 setNewExpense(prev => ({ 
                                   ...prev, 
                                   supplier: selected.name,
                                   description: `Serviço - ${selected.name} (${selected.role})`
                                 }));
                               }
                             }}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione um colaborador" />
                             </SelectTrigger>
                             <SelectContent>
                               {collaborators.map((collaborator) => (
                                 <SelectItem key={collaborator.id} value={collaborator.id}>
                                   {collaborator.name} - {collaborator.role}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                       )}
                       
                       <div>
                         <Label htmlFor="description">Descrição</Label>
                         <Input
                           id="description"
                           value={newExpense.description || ''}
                           onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                           placeholder="Descrição do item/serviço"
                           disabled={newExpense.category === 'Colaborador'}
                         />
                       </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="quantity">Quantidade</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={newExpense.quantity || 1}
                            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="unit_price">Preço Unitário</Label>
                          <Input
                            id="unit_price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={newExpense.unit_price || 0}
                            onChange={(e) => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="total_price">Total</Label>
                          <Input
                            id="total_price"
                            type="number"
                            value={newExpense.total_price || 0}
                            disabled
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={newExpense.notes || ''}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Observações adicionais"
                        />
                       </div>
                       
                       <div>
                         <Label htmlFor="expense_bank_account">Conta Bancária</Label>
                         <Select value={newExpense.expense_bank_account} onValueChange={(value) => setNewExpense(prev => ({ ...prev, expense_bank_account: value }))}>
                           <SelectTrigger>
                             <SelectValue placeholder="Selecione a conta bancária" />
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
                       
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => {
                            setExpenseDialog(false);
                            setSelectedCollaborator('');
                          }}>
                            Cancelar
                          </Button>
                          <Button onClick={addExpense}>
                            Adicionar Despesa
                          </Button>
                        </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Expenses Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{expense.quantity}</TableCell>
                        <TableCell>
                          R$ {expense.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {expense.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{expense.supplier || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedExpenseForEdit(expense);
                                setNewExpense({
                                  category: expense.category,
                                  description: expense.description,
                                  quantity: expense.quantity,
                                  unit_price: expense.unit_price,
                                  total_price: expense.total_price,
                                  supplier: expense.supplier,
                                  notes: expense.notes,
                                  expense_bank_account: expense.expense_bank_account
                                });
                                setEditExpenseDialog(true);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma despesa cadastrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={eventDialog} onOpenChange={setEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
            <DialogDescription>
              Crie um novo evento para locação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_name">Nome do Evento *</Label>
                <Input
                  id="event_name"
                  value={newEvent.name || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Casamento Silva"
                />
              </div>
              <div>
                <Label htmlFor="client_select">Selecionar Cliente</Label>
                <Select onValueChange={handleClientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente cadastrado" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name">Cliente *</Label>
                <Input
                  id="client_name"
                  value={newEvent.client_name || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="client_email">Email do Cliente</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={newEvent.client_email || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, client_email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_phone">Telefone do Cliente</Label>
                <Input
                  id="client_phone"
                  value={newEvent.client_phone || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, client_phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="setup_start_date">Data de Início de Montagem</Label>
                <Input
                  id="setup_start_date"
                  type="date"
                  value={newEvent.setup_start_date || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, setup_start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="event_date">Data do Evento *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={newEvent.event_date || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="event_time">Horário</Label>
              <Input
                id="event_time"
                type="time"
                value={newEvent.event_time || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, event_time: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={newEvent.location || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Local do evento"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_budget">Orçamento Total</Label>
                <Input
                  id="total_budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newEvent.total_budget || 0}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, total_budget: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={newEvent.status} onValueChange={(value) => setNewEvent(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="pending">Pendente</SelectItem>
                     <SelectItem value="confirmed">Confirmado</SelectItem>
                     <SelectItem value="in_progress">Em Andamento</SelectItem>
                     <SelectItem value="completed">Concluído</SelectItem>
                     <SelectItem value="cancelled">Cancelado</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
             
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newEvent.description || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do evento"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEventDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={addEvent}>
                Criar Evento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editEventDialog} onOpenChange={setEditEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Edite as informações do evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Nome do Evento</Label>
                <Input
                  id="edit_name"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit_client">Cliente</Label>
                <Input
                  id="edit_client"
                  value={newEvent.client_name}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, client_name: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_event_date">Data do Evento</Label>
                <Input
                  id="edit_event_date"
                  type="date"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit_event_time">Horário</Label>
                <Input
                  id="edit_event_time"
                  type="time"
                  value={newEvent.event_time}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, event_time: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit_location">Local</Label>
              <Input
                id="edit_location"
                value={newEvent.location}
                onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_total_budget">Orçamento Total</Label>
              <Input
                id="edit_total_budget"
                type="number"
                value={newEvent.total_budget}
                onChange={(e) => setNewEvent(prev => ({ ...prev, total_budget: Number(e.target.value) }))}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_status">Status</Label>
              <Select value={newEvent.status} onValueChange={(value) => setNewEvent(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="pending">Pendente</SelectItem>
                   <SelectItem value="confirmed">Confirmado</SelectItem>
                   <SelectItem value="in_progress">Em Andamento</SelectItem>
                   <SelectItem value="completed">Concluído</SelectItem>
                   <SelectItem value="cancelled">Cancelado</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <Separator />
             
             <div className="space-y-4">
               <h3 className="text-lg font-semibold">Pagamento</h3>
               
               <div className="flex items-center space-x-2">
                 <input
                   type="checkbox"
                   id="is_paid"
                   checked={newEvent.is_paid || false}
                   onChange={(e) => setNewEvent(prev => ({ 
                     ...prev, 
                     is_paid: e.target.checked,
                     payment_date: e.target.checked ? (prev.payment_date || new Date().toISOString().split('T')[0]) : ''
                   }))}
                   className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                 />
                 <Label htmlFor="is_paid">Evento pago</Label>
               </div>
               
               {newEvent.is_paid && (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="payment_date">Data do Pagamento</Label>
                     <Input
                       id="payment_date"
                       type="date"
                       value={newEvent.payment_date || ''}
                       onChange={(e) => setNewEvent(prev => ({ ...prev, payment_date: e.target.value }))}
                     />
                   </div>
                   <div>
                     <Label htmlFor="payment_bank_account">Conta Bancária</Label>
                     <Select value={newEvent.payment_bank_account || ''} onValueChange={(value) => setNewEvent(prev => ({ ...prev, payment_bank_account: value }))}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione a conta" />
                       </SelectTrigger>
                       <SelectContent>
                         {bankAccounts.map((account) => (
                           <SelectItem key={account.id} value={account.name}>
                             {account.name} - {account.account_type}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
               )}
               
               {newEvent.is_paid && (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="payment_type">Tipo de Pagamento</Label>
                     <Select value={newEvent.payment_type || 'total'} onValueChange={(value) => setNewEvent(prev => ({ ...prev, payment_type: value }))}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione o tipo" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="entrada">Entrada</SelectItem>
                         <SelectItem value="total">Valor Total</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div>
                     <Label htmlFor="payment_amount">Valor Pago</Label>
                     <Input
                       id="payment_amount"
                       type="number"
                       min="0"
                       step="0.01"
                       value={newEvent.payment_amount || 0}
                       onChange={(e) => setNewEvent(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
                       placeholder="0.00"
                     />
                   </div>
                 </div>
               )}
             </div>
             
             <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditEventDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={updateEvent}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Expense Dialog */}
      <Dialog open={editExpenseDialog} onOpenChange={setEditExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>
              Edite as informações da despesa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="edit_category">Categoria</Label>
                  <Select value={newExpense.category} onValueChange={(value) => {
                    setNewExpense(prev => ({ ...prev, category: value }));
                    if (value !== 'Colaborador') {
                      setSelectedCollaborator('');
                    }
                  }}>
                   <SelectTrigger>
                     <SelectValue placeholder="Selecione a categoria" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Iluminação">Iluminação</SelectItem>
                     <SelectItem value="Som">Som</SelectItem>
                     <SelectItem value="Estrutura">Estrutura</SelectItem>
                     <SelectItem value="Transporte">Transporte</SelectItem>
                     <SelectItem value="Pessoal">Pessoal</SelectItem>
                     <SelectItem value="Colaborador">Colaborador</SelectItem>
                     <SelectItem value="Material">Material</SelectItem>
                     <SelectItem value="Outros">Outros</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               
               <div>
                 <Label htmlFor="edit_supplier">Fornecedor</Label>
                 <Input
                   id="edit_supplier"
                   value={newExpense.supplier || ''}
                   onChange={(e) => setNewExpense(prev => ({ ...prev, supplier: e.target.value }))}
                   placeholder="Nome do fornecedor"
                   disabled={newExpense.category === 'Colaborador'}
                 />
               </div>
             </div>
             
             {/* Collaborator Selection - only shown when category is "Colaborador" */}
             {newExpense.category === 'Colaborador' && (
               <div>
                 <Label htmlFor="edit_collaborator">Colaborador</Label>
                 <Select 
                   value={selectedCollaborator} 
                   onValueChange={(value) => {
                     setSelectedCollaborator(value);
                     const selected = collaborators.find(c => c.id === value);
                     if (selected) {
                       setNewExpense(prev => ({ 
                         ...prev, 
                         supplier: selected.name,
                         description: `Serviço - ${selected.name} (${selected.role})`
                       }));
                     }
                   }}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Selecione um colaborador" />
                   </SelectTrigger>
                   <SelectContent>
                     {collaborators.map((collaborator) => (
                       <SelectItem key={collaborator.id} value={collaborator.id}>
                         {collaborator.name} - {collaborator.role}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             )}
             
             <div>
               <Label htmlFor="edit_description">Descrição</Label>
               <Input
                 id="edit_description"
                 value={newExpense.description || ''}
                 onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                 placeholder="Descrição do item/serviço"
                 disabled={newExpense.category === 'Colaborador'}
               />
             </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_quantity">Quantidade</Label>
                <Input
                  id="edit_quantity"
                  type="number"
                  min="1"
                  value={newExpense.quantity || 1}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div>
                <Label htmlFor="edit_unit_price">Preço Unitário</Label>
                <Input
                  id="edit_unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newExpense.unit_price || 0}
                  onChange={(e) => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="edit_total_price">Total</Label>
                <Input
                  id="edit_total_price"
                  type="number"
                  value={newExpense.total_price || 0}
                  disabled
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit_notes">Observações</Label>
              <Textarea
                id="edit_notes"
                value={newExpense.notes || ''}
                onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais"
              />
             </div>
             
             <div>
               <Label htmlFor="edit_expense_bank_account">Conta Bancária</Label>
               <Select value={newExpense.expense_bank_account || ''} onValueChange={(value) => setNewExpense(prev => ({ ...prev, expense_bank_account: value }))}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione a conta bancária" />
                 </SelectTrigger>
                 <SelectContent>
                   {bankAccounts.map((account) => (
                     <SelectItem key={account.id} value={account.name}>
                       {account.name} - {account.account_type}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             
             <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={() => setEditExpenseDialog(false)}>
                 Cancelar
               </Button>
               <Button onClick={updateExpense}>
                 Salvar Alterações
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
    </div>
  );
};