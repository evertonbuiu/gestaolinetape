import { useState, useEffect } from 'react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
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
import { Calendar, Clock, MapPin, User, Package, Plus, Edit, Trash2, Printer, Users } from 'lucide-react';
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

interface EventCollaborator {
  id: string;
  event_id: string;
  collaborator_name: string;
  collaborator_email: string;
  role: string;
  assigned_by: string;
  created_at: string;
}

export const EventEquipment = () => {
  const { user } = useCustomAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [events, setEvents] = useState<Event[]>([]);
  const [equipment, setEquipment] = useState<EventEquipment[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [equipmentDialog, setEquipmentDialog] = useState(false);
  const [editEquipmentDialog, setEditEquipmentDialog] = useState(false);
  const [returnedEquipmentDialog, setReturnedEquipmentDialog] = useState(false);
  const [collaboratorDialog, setCollaboratorDialog] = useState(false);
  const [missingEquipmentDialog, setMissingEquipmentDialog] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('/logo-empresa.png');
  const [collaborators, setCollaborators] = useState<EventCollaborator[]>([]);
  const [availableCollaborators, setAvailableCollaborators] = useState<any[]>([]);
  const [selectedEquipmentForEdit, setSelectedEquipmentForEdit] = useState<EventEquipment | null>(null);
  const [missingEquipmentList, setMissingEquipmentList] = useState<any[]>([]);
  const [allocatedEquipmentForReturn, setAllocatedEquipmentForReturn] = useState<any[]>([]);
  const [newEquipment, setNewEquipment] = useState<Partial<EventEquipment>>({
    equipment_name: '',
    quantity: 1,
    description: '',
    status: 'pending'
  });
  const [newCollaborator, setNewCollaborator] = useState({
    collaborator_name: '',
    collaborator_email: '',
    role: 'funcionario',
    selectedCollaboratorId: ''
  });
  const [isNewCollaborator, setIsNewCollaborator] = useState(false);

  // Add realtime updates
  useEffect(() => {
    const eventsChannel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          console.log('Events data updated, refreshing...');
          fetchEvents();
        }
      )
      .subscribe();

    const equipmentChannel = supabase
      .channel('event-equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_equipment'
        },
        () => {
          console.log('Event equipment data updated, refreshing...');
          if (selectedEvent) {
            fetchEquipment(selectedEvent.id);
          }
        }
      )
      .subscribe();

    // Add listener for equipment table changes to update available equipment
    const availableEquipmentChannel = supabase
      .channel('available-equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment'
        },
        (payload) => {
          console.log('Equipment data updated, refreshing available equipment...', payload);
          // Force refresh with a slight delay to ensure database consistency
          setTimeout(() => {
            fetchAvailableEquipment(true);
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(availableEquipmentChannel);
    };
  }, [selectedEvent]);

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
      console.log('Fetching equipment for event:', eventId);
      const { data, error } = await supabase
        .from('event_equipment')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Equipment data loaded:', data);
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
    console.log('Attempting to add equipment:', {
      selectedEvent: selectedEvent?.id,
      equipment_name: newEquipment.equipment_name,
      user: user?.id,
      quantity: newEquipment.quantity,
      status: newEquipment.status
    });

    if (!selectedEvent || !newEquipment.equipment_name || !user) {
      console.log('Validation failed:', {
        hasSelectedEvent: !!selectedEvent,
        hasEquipmentName: !!newEquipment.equipment_name,
        hasUser: !!user
      });
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

      if (error) {
        console.error('Supabase error details:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Equipment added successfully');
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
        description: `Não foi possível adicionar o equipamento. ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };

  // Edit equipment
  const updateEquipment = async () => {
    if (!selectedEquipmentForEdit || !newEquipment.equipment_name || !user) {
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
        .update({
          equipment_name: newEquipment.equipment_name,
          quantity: newEquipment.quantity || 1,
          description: newEquipment.description || '',
          status: newEquipment.status || 'pending'
        })
        .eq('id', selectedEquipmentForEdit.id);

      if (error) throw error;

      await fetchEquipment(selectedEvent!.id);
      setNewEquipment({
        equipment_name: '',
        quantity: 1,
        description: '',
        status: 'pending'
      });
      setEditEquipmentDialog(false);
      setSelectedEquipmentForEdit(null);

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

  // Add returned equipment
  const addReturnedEquipment = async () => {
    if (!selectedEvent || !newEquipment.equipment_name || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do equipamento.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Add the returned equipment to event_equipment
      // The database trigger will automatically update the equipment stock
      const { error } = await supabase
        .from('event_equipment')
        .insert({
          event_id: selectedEvent.id,
          equipment_name: newEquipment.equipment_name,
          quantity: newEquipment.quantity || 1,
          description: newEquipment.description || '',
          status: 'returned',
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
      setReturnedEquipmentDialog(false);

      toast({
        title: "Equipamento devolvido e estoque atualizado",
        description: "O equipamento foi adicionado à lista de devolvidos e o estoque foi atualizado automaticamente.",
      });
    } catch (error) {
      console.error('Error adding returned equipment:', error);
      toast({
        title: "Erro ao adicionar equipamento devolvido",
        description: "Não foi possível adicionar o equipamento devolvido.",
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

  // Calculate missing equipment for an event
  const calculateMissingEquipment = (eventEquipment: EventEquipment[]) => {
    const equipmentMap = new Map<string, { allocated: number; returned: number }>();
    
    // Group equipment by name and calculate totals
    eventEquipment.forEach(item => {
      if (!equipmentMap.has(item.equipment_name)) {
        equipmentMap.set(item.equipment_name, { allocated: 0, returned: 0 });
      }
      
      const current = equipmentMap.get(item.equipment_name)!;
      if (item.status === 'returned') {
        current.returned += item.quantity;
      } else {
        current.allocated += item.quantity;
      }
    });
    
    // Calculate missing equipment
    const missingEquipment = [];
    for (const [name, quantities] of equipmentMap) {
      const missing = quantities.allocated - quantities.returned;
      if (missing > 0) {
        missingEquipment.push({
          equipment_name: name,
          allocated: quantities.allocated,
          returned: quantities.returned,
          missing: missing
        });
      }
    }
    
    return missingEquipment;
  };

  // Generate missing equipment report for all completed events
  const generateMissingEquipmentReport = async () => {
    try {
      const { data: completedEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'completed')
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      const missingReport = [];
      
      for (const event of completedEvents || []) {
        const { data: eventEquipment, error: equipmentError } = await supabase
          .from('event_equipment')
          .select('*')
          .eq('event_id', event.id);

        if (equipmentError) throw equipmentError;

        const missingEquipment = calculateMissingEquipment(eventEquipment || []);
        
        if (missingEquipment.length > 0) {
          missingReport.push({
            event: event,
            missingEquipment: missingEquipment
          });
        }
      }

      setMissingEquipmentList(missingReport);
      setMissingEquipmentDialog(true);
    } catch (error) {
      console.error('Error generating missing equipment report:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório de equipamentos faltantes.",
        variant: "destructive"
      });
    }
  };

  // Update stock when event is completed
  const markEventAsCompleted = async (eventId: string) => {
    try {
      // First, get all equipment for this event
      const { data: eventEquipment, error: equipmentError } = await supabase
        .from('event_equipment')
        .select('*')
        .eq('event_id', eventId);

      if (equipmentError) throw equipmentError;

      // Update event status to completed
      const { error: updateError } = await supabase
        .from('events')
        .update({ status: 'completed' })
        .eq('id', eventId);

      if (updateError) throw updateError;

      // Calculate missing equipment
      const missingEquipment = calculateMissingEquipment(eventEquipment || []);
      
      if (missingEquipment.length > 0) {
        toast({
          title: "Evento concluído com pendências",
          description: `O evento foi marcado como concluído, mas há ${missingEquipment.length} equipamento(s) faltante(s).`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Evento concluído",
          description: "O evento foi marcado como concluído com sucesso.",
        });
      }

      // Refresh events list
      await fetchEvents();
    } catch (error) {
      console.error('Error marking event as completed:', error);
      toast({
        title: "Erro ao concluir evento",
        description: "Não foi possível marcar o evento como concluído.",
        variant: "destructive"
      });
    }
  };

  // Fetch collaborators for selected event
  const fetchCollaborators = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_collaborators')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      toast({
        title: "Erro ao carregar colaboradores",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive"
      });
    }
  };

  // Add collaborator to event
  const addCollaborator = async () => {
    if (!selectedEvent || !newCollaborator.collaborator_name || !newCollaborator.collaborator_email || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e email do colaborador.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('event_collaborators')
        .insert({
          event_id: selectedEvent.id,
          collaborator_name: newCollaborator.collaborator_name,
          collaborator_email: newCollaborator.collaborator_email,
          role: newCollaborator.role,
          assigned_by: user.id
        });

      if (error) throw error;

      await fetchCollaborators(selectedEvent.id);
      setNewCollaborator({
        collaborator_name: '',
        collaborator_email: '',
        role: 'funcionario',
        selectedCollaboratorId: ''
      });
      setCollaboratorDialog(false);
      setIsNewCollaborator(false);

      toast({
        title: "Colaborador adicionado",
        description: "O colaborador foi adicionado com sucesso.",
      });
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast({
        title: "Erro ao adicionar colaborador",
        description: "Não foi possível adicionar o colaborador.",
        variant: "destructive"
      });
    }
  };

  // Remove collaborator from event
  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from('event_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      await fetchCollaborators(selectedEvent!.id);

      toast({
        title: "Colaborador removido",
        description: "O colaborador foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast({
        title: "Erro ao remover colaborador",
        description: "Não foi possível remover o colaborador.",
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
      case 'returned': return 'bg-green-100 text-green-800';
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
  const fetchAvailableEquipment = async (forceRefresh = false) => {
    try {
      console.log('Fetching available equipment...', { forceRefresh });
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;
      console.log('Available equipment loaded:', data?.length || 0, 'items');
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

  // Fetch allocated equipment for the selected event for return purposes
  const fetchAllocatedEquipmentForReturn = async (eventId: string) => {
    try {
      console.log('Fetching allocated equipment for return...', { eventId });
      
      // Get all equipment allocated in this event (not returned yet)
      const { data: eventEquipment, error: equipmentError } = await supabase
        .from('event_equipment')
        .select('equipment_name, quantity, status')
        .eq('event_id', eventId)
        .in('status', ['confirmed', 'in_progress', 'pending', 'allocated']);

      if (equipmentError) throw equipmentError;

      // Group by equipment name and sum quantities
      const equipmentMap = new Map<string, { allocated: number; returned: number }>();
      
      // Get allocated equipment
      eventEquipment?.forEach(item => {
        if (!equipmentMap.has(item.equipment_name)) {
          equipmentMap.set(item.equipment_name, { allocated: 0, returned: 0 });
        }
        equipmentMap.get(item.equipment_name)!.allocated += item.quantity;
      });

      // Get returned equipment to subtract from available for return
      const { data: returnedEquipment, error: returnedError } = await supabase
        .from('event_equipment')
        .select('equipment_name, quantity')
        .eq('event_id', eventId)
        .eq('status', 'returned');

      if (returnedError) throw returnedError;

      returnedEquipment?.forEach(item => {
        if (equipmentMap.has(item.equipment_name)) {
          equipmentMap.get(item.equipment_name)!.returned += item.quantity;
        }
      });

      // Create list of equipment available for return (allocated - returned > 0)
      const availableForReturn = [];
      for (const [equipmentName, quantities] of equipmentMap) {
        const availableQty = quantities.allocated - quantities.returned;
        if (availableQty > 0) {
          availableForReturn.push({
            name: equipmentName,
            availableForReturn: availableQty,
            allocated: quantities.allocated,
            returned: quantities.returned
          });
        }
      }

      console.log('Equipment available for return:', availableForReturn);
      setAllocatedEquipmentForReturn(availableForReturn);
    } catch (error) {
      console.error('Error fetching allocated equipment for return:', error);
      toast({
        title: "Erro ao carregar equipamentos",
        description: "Não foi possível carregar os equipamentos alocados.",
        variant: "destructive"
      });
    }
  };

  // Fetch available collaborators
  const fetchAvailableCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAvailableCollaborators(data || []);
    } catch (error) {
      console.error('Error fetching available collaborators:', error);
      // Fallback para mock data se não conseguir buscar
      setAvailableCollaborators([]);
    }
  };

  // Handle collaborator selection
  const handleCollaboratorSelect = (collaboratorId: string) => {
    const selectedCollaborator = availableCollaborators.find(c => c.id === collaboratorId);
    if (selectedCollaborator) {
      setNewCollaborator(prev => ({
        ...prev,
        collaborator_name: selectedCollaborator.name,
        collaborator_email: selectedCollaborator.email,
        selectedCollaboratorId: collaboratorId
      }));
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
                background-position: center calc(50% + 400px);
                background-size: 250%;
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
              <img src="${logoUrl}" alt="Logo da Empresa" style="height: 150px; margin-bottom: 15px;" />
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
    fetchAvailableCollaborators();
    fetchLogo();
  }, []);

  // Fetch equipment and collaborators when dialogs open
  useEffect(() => {
    if (equipmentDialog) {
      console.log('Equipment dialog opened, refreshing available equipment...');
      fetchAvailableEquipment(true);
    }
  }, [equipmentDialog]);

  useEffect(() => {
    if (collaboratorDialog) {
      fetchAvailableCollaborators();
    }
  }, [collaboratorDialog]);

  useEffect(() => {
    if (returnedEquipmentDialog && selectedEvent) {
      console.log('Return equipment dialog opened, fetching allocated equipment...');
      fetchAllocatedEquipmentForReturn(selectedEvent.id);
    }
  }, [returnedEquipmentDialog, selectedEvent]);

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generateMissingEquipmentReport}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Relatório de Faltantes
          </Button>
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
                                    fetchCollaborators(event.id);
                                  }}
                                >
                                  <Package className="h-4 w-4 mr-2" />
                                  Equipamentos
                                </Button>
                                {event.status !== 'completed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markEventAsCompleted(event.id)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    Concluir
                                  </Button>
                                )}
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
                <h3 className="text-lg font-semibold">Controle de Equipamentos</h3>
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
                             <div className="flex items-center justify-between">
                               <Label htmlFor="equipment_name">Nome do Equipamento *</Label>
                               <Button 
                                 type="button" 
                                 variant="ghost" 
                                 size="sm"
                                 onClick={() => fetchAvailableEquipment(true)}
                                 className="text-xs"
                               >
                                 🔄 Atualizar Lista
                               </Button>
                             </div>
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

              {/* Equipment Lists - Separate Active and Returned */}
              <div className="space-y-6">
                {/* Active Equipment Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-foreground">Equipamentos Ativos</h4>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {equipment.filter(item => ['pending', 'confirmed', 'allocated', 'active'].includes(item.status)).length} ativo(s)
                    </Badge>
                  </div>
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
                          {(() => {
                            const activeEquipment = equipment.filter(item => 
                              ['pending', 'confirmed', 'allocated', 'active'].includes(item.status)
                            );
                            console.log('Active equipment:', activeEquipment);
                            console.log('All equipment:', equipment);
                           
                           if (activeEquipment.length === 0) {
                             return (
                               <TableRow>
                                 <TableCell colSpan={5} className="text-center text-muted-foreground">
                                   Nenhum equipamento ativo
                                 </TableCell>
                               </TableRow>
                             );
                           }
                           
                           return activeEquipment.map((item) => (
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
                                   <div className="flex gap-2">
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => {
                                         setSelectedEquipmentForEdit(item);
                                         setNewEquipment({
                                           equipment_name: item.equipment_name,
                                           quantity: item.quantity,
                                           description: item.description,
                                           status: item.status
                                         });
                                         setEditEquipmentDialog(true);
                                       }}
                                       className="text-blue-600 hover:text-blue-800"
                                     >
                                       <Edit className="h-4 w-4" />
                                     </Button>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => deleteEquipment(item.id)}
                                       className="text-red-600 hover:text-red-800"
                                     >
                                       <Trash2 className="h-4 w-4" />
                                     </Button>
                                   </div>
                                </TableCell>
                             </TableRow>
                           ));
                         })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Returned Equipment Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-foreground">Equipamentos Devolvidos ao Estoque</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {equipment.filter(item => item.status === 'returned').length} devolvido(s)
                      </Badge>
                      <Dialog open={returnedEquipmentDialog} onOpenChange={setReturnedEquipmentDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Devolvido
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Equipamento Devolvido</DialogTitle>
                            <DialogDescription>
                              Adicione um equipamento que foi devolvido ao estoque
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                             <div>
                               <Label htmlFor="returned_equipment_name">Nome do Equipamento Alocado *</Label>
                               <Select value={newEquipment.equipment_name} onValueChange={(value) => setNewEquipment(prev => ({ ...prev, equipment_name: value }))}>
                                 <SelectTrigger>
                                   <SelectValue placeholder="Selecione um equipamento alocado" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   {allocatedEquipmentForReturn.map((item) => (
                                     <SelectItem key={item.name} value={item.name}>
                                       {item.name} - {item.availableForReturn} unidade(s) para devolver
                                     </SelectItem>
                                   ))}
                                   {allocatedEquipmentForReturn.length === 0 && (
                                     <div className="p-2 text-sm text-muted-foreground">
                                       Nenhum equipamento alocado para devolver
                                     </div>
                                   )}
                                 </SelectContent>
                               </Select>
                             </div>
                            
                             <div>
                               <Label htmlFor="returned_equipment_quantity">
                                 Quantidade * 
                                 {newEquipment.equipment_name && (
                                   <span className="text-sm text-muted-foreground ml-2">
                                     (Máx: {allocatedEquipmentForReturn.find(item => item.name === newEquipment.equipment_name)?.availableForReturn || 0})
                                   </span>
                                 )}
                               </Label>
                               <Input
                                 id="returned_equipment_quantity"
                                 type="number"
                                 min="1"
                                 max={allocatedEquipmentForReturn.find(item => item.name === newEquipment.equipment_name)?.availableForReturn || 1}
                                 value={newEquipment.quantity || ''}
                                 onChange={(e) => {
                                   const maxAvailable = allocatedEquipmentForReturn.find(item => item.name === newEquipment.equipment_name)?.availableForReturn || 1;
                                   const inputValue = parseInt(e.target.value) || 1;
                                   const validQuantity = Math.min(inputValue, maxAvailable);
                                   setNewEquipment(prev => ({ ...prev, quantity: validQuantity }));
                                 }}
                                 placeholder="Digite a quantidade"
                               />
                             </div>
                            
                            <div>
                              <Label htmlFor="returned_equipment_description">Descrição</Label>
                              <Textarea
                                id="returned_equipment_description"
                                value={newEquipment.description || ''}
                                onChange={(e) => setNewEquipment(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Digite uma descrição (opcional)"
                                rows={3}
                              />
                            </div>

                            <div className="flex justify-end gap-3">
                              <Button variant="outline" onClick={() => {
                                setReturnedEquipmentDialog(false);
                                setNewEquipment({
                                  equipment_name: '',
                                  quantity: 1,
                                  description: '',
                                  status: 'pending'
                                });
                              }}>
                                Cancelar
                              </Button>
                              <Button onClick={addReturnedEquipment}>
                                Adicionar Devolvido
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
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
                        {equipment.filter(item => item.status === 'returned').length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Nenhum equipamento devolvido
                            </TableCell>
                          </TableRow>
                        ) : (
                          equipment.filter(item => item.status === 'returned').map((item) => (
                            <TableRow key={item.id} className="bg-green-50/50">
                              <TableCell className="font-medium">{item.equipment_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(item.status)}>
                                  {getStatusText(item.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.description || '-'}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEquipmentForEdit(item);
                                      setNewEquipment({
                                        equipment_name: item.equipment_name,
                                        quantity: item.quantity,
                                        description: item.description,
                                        status: item.status
                                      });
                                      setEditEquipmentDialog(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteEquipment(item.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Missing Equipment Alert */}
                {(() => {
                  const missingEquipment = calculateMissingEquipment(equipment);
                  if (missingEquipment.length > 0) {
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-red-600" />
                          <h4 className="font-semibold text-red-800">Equipamentos Faltantes</h4>
                        </div>
                        <div className="space-y-2">
                          {missingEquipment.map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="font-medium">{item.equipment_name}</span>
                              <Badge variant="destructive" className="text-xs">
                                {item.missing} faltando
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Summary */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {equipment.filter(item => ['pending', 'confirmed', 'allocated', 'active'].includes(item.status)).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Equipamentos Pendentes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {equipment.filter(item => item.status === 'returned').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Equipamentos Devolvidos</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {equipment.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total de Equipamentos</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collaborators Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Colaboradores do Evento</h3>
                  <Dialog open={collaboratorDialog} onOpenChange={setCollaboratorDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Colaborador
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Colaborador</DialogTitle>
                        <DialogDescription>
                          Adicione um colaborador ao evento
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Toggle para selecionar da lista ou adicionar novo */}
                        <div className="flex gap-4 p-4 border rounded-lg">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="collaborator_type"
                              checked={!isNewCollaborator}
                              onChange={() => setIsNewCollaborator(false)}
                            />
                            <span>Selecionar da lista</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="collaborator_type"
                              checked={isNewCollaborator}
                              onChange={() => setIsNewCollaborator(true)}
                            />
                            <span>Adicionar novo</span>
                          </label>
                        </div>

                        {/* Seleção da lista de colaboradores */}
                        {!isNewCollaborator && (
                          <div>
                            <Label htmlFor="select_collaborator">Selecionar Colaborador</Label>
                            <Select value={newCollaborator.selectedCollaboratorId} onValueChange={handleCollaboratorSelect}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um colaborador" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCollaborators.map((collaborator) => (
                                  <SelectItem key={collaborator.id} value={collaborator.id}>
                                    {collaborator.name} ({collaborator.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Campos manuais para novo colaborador */}
                        {isNewCollaborator && (
                          <>
                            <div>
                              <Label htmlFor="collaborator_name">Nome do Colaborador *</Label>
                              <Input
                                id="collaborator_name"
                                value={newCollaborator.collaborator_name}
                                onChange={(e) => setNewCollaborator(prev => ({ ...prev, collaborator_name: e.target.value }))}
                                placeholder="Digite o nome do colaborador"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="collaborator_email">Email do Colaborador *</Label>
                              <Input
                                id="collaborator_email"
                                type="email"
                                value={newCollaborator.collaborator_email}
                                onChange={(e) => setNewCollaborator(prev => ({ ...prev, collaborator_email: e.target.value }))}
                                placeholder="email@exemplo.com"
                              />
                            </div>
                          </>
                        )}

                        {/* Função sempre disponível */}
                        <div>
                          <Label htmlFor="collaborator_role">Função</Label>
                          <Select value={newCollaborator.role} onValueChange={(value) => setNewCollaborator(prev => ({ ...prev, role: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="funcionario">Funcionário</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="coordenador">Coordenador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => {
                            setCollaboratorDialog(false);
                            setNewCollaborator({
                              collaborator_name: '',
                              collaborator_email: '',
                              role: 'funcionario',
                              selectedCollaboratorId: ''
                            });
                            setIsNewCollaborator(false);
                          }}>
                            Cancelar
                          </Button>
                          <Button onClick={addCollaborator}>
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Collaborators List */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collaborators.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum colaborador adicionado
                          </TableCell>
                        </TableRow>
                      ) : (
                        collaborators.map((collaborator) => (
                          <TableRow key={collaborator.id}>
                            <TableCell className="font-medium">{collaborator.collaborator_name}</TableCell>
                            <TableCell>{collaborator.collaborator_email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {collaborator.role === 'funcionario' ? 'Funcionário' : 
                                 collaborator.role === 'admin' ? 'Administrador' : 
                                 collaborator.role === 'coordenador' ? 'Coordenador' : 
                                 collaborator.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCollaborator(collaborator.id)}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Equipment Dialog */}
      <Dialog open={editEquipmentDialog} onOpenChange={setEditEquipmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Equipamento</DialogTitle>
            <DialogDescription>
              Edite as informações do equipamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_equipment_name">Nome do Equipamento *</Label>
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
                <Label htmlFor="edit_quantity">Quantidade</Label>
                <Input
                  id="edit_quantity"
                  type="number"
                  min="1"
                  value={newEquipment.quantity || 1}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                />
              </div>
              
              <div>
                <Label htmlFor="edit_status">Status</Label>
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
              <Label htmlFor="edit_description">Descrição</Label>
              <Textarea
                id="edit_description"
                value={newEquipment.description || ''}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes sobre o equipamento..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditEquipmentDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={updateEquipment}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Missing Equipment Report Dialog */}
      <Dialog open={missingEquipmentDialog} onOpenChange={setMissingEquipmentDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório de Equipamentos Faltantes</DialogTitle>
            <DialogDescription>
              Eventos concluídos com equipamentos não devolvidos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {missingEquipmentList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>Nenhum equipamento faltante encontrado!</p>
                <p className="text-sm">Todos os eventos concluídos têm equipamentos devolvidos.</p>
              </div>
            ) : (
              missingEquipmentList.map((item, index) => (
                <Card key={index} className="border-red-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.event.name}</CardTitle>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {item.missingEquipment.length} item(s) faltando
                      </Badge>
                    </div>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{item.event.client_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(item.event.event_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                      {item.event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{item.event.location}</span>
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Equipamento</TableHead>
                            <TableHead>Alocado</TableHead>
                            <TableHead>Devolvido</TableHead>
                            <TableHead>Faltando</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {item.missingEquipment.map((equipment, equipIndex) => (
                            <TableRow key={equipIndex} className="bg-red-50/50">
                              <TableCell className="font-medium">{equipment.equipment_name}</TableCell>
                              <TableCell>{equipment.allocated}</TableCell>
                              <TableCell>{equipment.returned}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {equipment.missing}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setMissingEquipmentDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};