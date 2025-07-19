import { useCustomAuth } from './useCustomAuth';

/**
 * Hook para controlar a visibilidade de valores monetários
 * Usuários do tipo "deposito" não devem ver valores
 */
export const useValueVisibility = () => {
  const { userRole } = useCustomAuth();
  
  // Usuários do tipo deposito não podem ver valores monetários
  const canViewValues = userRole !== 'deposito';
  
  // Função para formatar valores ou retornar placeholder
  const formatValue = (value: number | null | undefined, currency = true): string => {
    if (!canViewValues) {
      return '---';
    }
    
    if (value === null || value === undefined) {
      return currency ? 'R$ 0,00' : '0';
    }
    
    if (currency) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    }
    
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return {
    canViewValues,
    formatValue,
    userRole
  };
};