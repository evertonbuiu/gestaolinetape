import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Equipment {
  id: string;
  name: string;
  category: string;
  total_stock: number;
  available: number;
  rented: number;
  price_per_day: number;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useEquipment = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast({
        title: "Erro ao carregar equipamentos",
        description: "Não foi possível carregar os equipamentos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();

    // Set up real-time subscription for equipment changes
    const equipmentChannel = supabase
      .channel('equipment-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment'
        },
        (payload) => {
          console.log('Equipment change detected:', payload);
          fetchEquipment(); // Refetch data when changes occur
        }
      )
      .subscribe();

    // Also listen for event_equipment changes to update stock
    const eventEquipmentChannel = supabase
      .channel('event-equipment-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_equipment'
        },
        (payload) => {
          console.log('Event equipment change detected:', payload);
          fetchEquipment(); // Refetch to update available/rented counts
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(eventEquipmentChannel);
    };
  }, []);

  // Calculate totals for inventory dashboard
  const totals = {
    totalItems: equipment.reduce((sum, item) => sum + item.total_stock, 0),
    criticalItems: equipment.filter(item => item.status === 'out_of_stock' || item.status === 'low_stock').length,
    totalValue: equipment.reduce((sum, item) => sum + (item.total_stock * item.price_per_day * 30), 0)
  };

  return {
    equipment,
    loading,
    totals,
    fetchEquipment
  };
};