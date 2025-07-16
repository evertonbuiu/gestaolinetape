import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanySettings {
  id: string;
  company_name: string;
  tagline: string;
}

export const useCompanySettings = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      // Se não houver configurações, criar uma default
      setSettings({
        id: '',
        company_name: 'Luz Locação',
        tagline: 'Controle de Estoque'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (companyName: string, tagline: string) => {
    try {
      // Verificar se já existe uma configuração
      const { data: existing, error: fetchError } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Atualizar existente
        const { error } = await supabase
          .from('company_settings')
          .update({
            company_name: companyName,
            tagline: tagline
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from('company_settings')
          .insert({
            company_name: companyName,
            tagline: tagline
          });

        if (error) throw error;
      }

      await fetchSettings();
      return true;
    } catch (error) {
      console.error('Error updating company settings:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, isLoading, updateSettings, refreshSettings: fetchSettings };
};