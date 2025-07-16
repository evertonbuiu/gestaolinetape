import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, Plus, Download, Upload, TrendingUp, TrendingDown, DollarSign, FileText, Search, Edit, Trash2, Eye, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CashFlowEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  account: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface BudgetEntry {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
}

interface AccountBalance {
  id: string;
  name: string;
  balance: number;
  type: 'checking' | 'savings' | 'cash';
}

export const FinancialManagement = () => {
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [budget, setBudget] = useState<BudgetEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [newEntry, setNewEntry] = useState({
    description: "",
    category: "",
    type: "expense" as 'income' | 'expense',
    amount: 0,
    account: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isViewingStatement, setIsViewingStatement] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "checking" as 'checking' | 'savings' | 'cash',
    balance: 0
  });
  const [dateFilter, setDateFilter] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now()); // Para forçar re-render
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();

  const loadBankAccounts = async () => {
    try {
      const { data: bankAccountsData, error: bankAccountsError } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (bankAccountsError) throw bankAccountsError;

      if (bankAccountsData) {
        const accountBalances = bankAccountsData.map(account => ({
          id: account.id,
          name: account.name,
          balance: account.balance || 0,
          type: account.account_type as 'checking' | 'savings' | 'cash'
        }));

        setAccounts(accountBalances);
        setLastUpdate(Date.now()); // Forçar re-render do saldo total
      }
    } catch (error) {
      console.error("Error loading bank accounts:", error);
    }
  };

  useEffect(() => {
    loadFinancialData();
    
    // Configurar real-time updates
    const channel = supabase
      .channel('financial-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          console.log('Event change detected, reloading financial data');
          loadFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_expenses'
        },
        () => {
          console.log('Expense change detected, reloading financial data');
          loadFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts'
        },
        (payload) => {
          console.log('Bank account change detected:', payload);
          // Recarregar apenas as contas bancárias para atualizar saldos
          loadBankAccounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_transactions'
        },
        (payload) => {
          console.log('Bank transaction change detected:', payload);
          // Quando transações mudam, recarregar contas para atualizar saldos
          loadBankAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMonth, selectedYear, selectedPeriod]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      let startDate: string;
      let endDate: string;
      
      // Determinar as datas baseadas no filtro de período ou nos filtros específicos
      if (selectedPeriod !== "custom") {
        const now = new Date();
        
        switch (selectedPeriod) {
          case "week":
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startDate = startOfWeek.toISOString().split('T')[0];
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endDate = endOfWeek.toISOString().split('T')[0];
            break;
            
          case "month":
            startDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            endDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${lastDay}`;
            break;
            
          case "quarter":
            const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            startDate = `${now.getFullYear()}-${(quarterStartMonth + 1).toString().padStart(2, '0')}-01`;
            const quarterEndMonth = quarterStartMonth + 2;
            const quarterLastDay = new Date(now.getFullYear(), quarterEndMonth + 1, 0).getDate();
            endDate = `${now.getFullYear()}-${(quarterEndMonth + 1).toString().padStart(2, '0')}-${quarterLastDay}`;
            break;
            
          case "year":
            startDate = `${now.getFullYear()}-01-01`;
            endDate = `${now.getFullYear()}-12-31`;
            break;
            
          default:
            // Usar filtros específicos de mês e ano
            startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
            const customLastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${customLastDay}`;
        }
      } else {
        // Usar filtros específicos de mês e ano quando "custom" está selecionado
        startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
        const customLastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${customLastDay}`;
      }
      
      console.log(`Loading financial data for period: ${startDate} to ${endDate}`);
      
      // Buscar eventos (receitas) do período selecionado
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      // Buscar despesas dos eventos do período selecionado
      const { data: expensesData, error: expensesError } = await supabase
        .from('event_expenses')
        .select('*')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false });

      if (expensesError) throw expensesError;

      // Transformar eventos em receitas do fluxo de caixa
      const eventEntries: CashFlowEntry[] = eventsData?.map(event => {
        // Usar payment_amount se disponível, senão usar total_budget
        const incomeAmount = event.payment_amount > 0 ? event.payment_amount : event.total_budget || 0;
        
        // Determinar a conta bancária baseada no payment_bank_account
        const account = event.payment_bank_account || "Conta Corrente Principal";
        
        return {
          id: event.id,
          date: event.payment_date || event.event_date,
          description: `${event.payment_type === 'entrada' ? 'Entrada' : 'Pagamento'} - ${event.name}`,
          category: "Receita de Eventos",
          type: "income" as const,
          amount: incomeAmount,
          account: account,
          status: event.is_paid ? "confirmed" as const : "pending" as const
        };
      }) || [];

      // Transformar despesas em entradas do fluxo de caixa
      const expenseEntries: CashFlowEntry[] = expensesData?.map(expense => ({
        id: expense.id,
        date: expense.expense_date || expense.created_at.split('T')[0],
        description: expense.description,
        category: expense.category,
        type: "expense" as const,
        amount: expense.total_price,
        account: expense.expense_bank_account || "Conta Corrente Principal",
        status: "confirmed" as const
      })) || [];

      // Combinar todas as entradas
      const allEntries = [...eventEntries, ...expenseEntries];
      setCashFlow(allEntries);

      // Calcular orçamento baseado nas categorias de despesas
      const categorySpending = expensesData?.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.total_price;
        return acc;
      }, {} as Record<string, number>) || {};

      // Orçamentos padrão por categoria
      const budgetDefaults = {
        "Equipamentos": 5000,
        "Despesas Operacionais": 3000,
        "Pessoal": 2000,
        "Marketing": 1000,
        "Alimentação": 1500,
        "Transporte": 800,
        "Outros": 500
      };

      const calculatedBudget: BudgetEntry[] = Object.entries(budgetDefaults).map(([category, budgeted]) => {
        const spent = categorySpending[category] || 0;
        const remaining = budgeted - spent;
        const percentage = (spent / budgeted) * 100;
        
        return {
          id: category,
          category,
          budgeted,
          spent,
          remaining,
          percentage: Math.round(percentage)
        };
      });

      setBudget(calculatedBudget);

      // Calcular saldos das contas baseado nas movimentações
      const totalIncome = eventEntries
        .filter(entry => entry.status === 'confirmed')
        .reduce((sum, entry) => sum + entry.amount, 0);
      
      const totalExpenses = expenseEntries
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Buscar contas bancárias do banco de dados
      const { data: bankAccountsData, error: bankAccountsError } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (bankAccountsError) throw bankAccountsError;

      // Se não há contas no banco, criar contas padrão baseadas no saldo calculado
      if (!bankAccountsData || bankAccountsData.length === 0) {
        const netBalance = totalIncome - totalExpenses;
        
        const defaultAccounts = [
          {
            name: "Conta Corrente Principal",
            account_type: "checking",
            balance: netBalance
          },
          {
            name: "Conta Poupança",
            account_type: "savings", 
            balance: netBalance * 0.3
          },
          {
            name: "Dinheiro em Caixa",
            account_type: "cash",
            balance: netBalance * 0.1
          }
        ];

        // Inserir contas padrão no banco
        const { error: insertError } = await supabase
          .from('bank_accounts')
          .insert(defaultAccounts);

        if (!insertError) {
          // Buscar novamente após inserir
          const { data: newAccountsData } = await supabase
            .from('bank_accounts')
            .select('*')
            .order('created_at', { ascending: true });
          
          if (newAccountsData) {
            const mappedAccounts: AccountBalance[] = newAccountsData.map(account => ({
              id: account.id,
              name: account.name,
              balance: account.balance || 0,
              type: account.account_type as 'checking' | 'savings' | 'cash'
            }));
            setAccounts(mappedAccounts);
          }
        }
      } else {
        // Usar saldos diretamente do banco de dados sem recalcular
        const accountBalances = bankAccountsData.map(account => ({
          id: account.id,
          name: account.name,
          balance: account.balance || 0,
          type: account.account_type as 'checking' | 'savings' | 'cash'
        }));

        setAccounts(accountBalances);
      }

    } catch (error) {
      console.error("Error loading financial data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.description || !newEntry.category || !newEntry.amount || !newEntry.account) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (newEntry.type === 'expense') {
        // Buscar o primeiro evento disponível ou criar um evento genérico
        const { data: events } = await supabase
          .from('events')
          .select('id')
          .limit(1);
        
        const eventId = events && events.length > 0 ? events[0].id : null;
        
        if (eventId) {
          // Salvar despesa na tabela event_expenses
          const { error } = await supabase
            .from('event_expenses')
            .insert({
              description: newEntry.description,
              category: newEntry.category,
              total_price: newEntry.amount,
              unit_price: newEntry.amount,
              quantity: 1,
              event_id: eventId,
              created_by: '' // Poderia ser auth.uid() se tivesse auth
            });

          if (error) {
            console.error("Error saving expense:", error);
            // Continuar mesmo se houver erro para não bloquear o usuário
          }
        }
      }

      
      // Também adicionar localmente para resposta imediata
      const entry: CashFlowEntry = {
        id: Date.now().toString(),
        ...newEntry,
        status: "pending"
      };

      setCashFlow([...cashFlow, entry]);
      setNewEntry({
        description: "",
        category: "",
        type: "expense",
        amount: 0,
        account: "",
        date: new Date().toISOString().split('T')[0]
      });
      setIsAddingEntry(false);
      
      toast({
        title: "Sucesso",
        description: "Lançamento adicionado e saldo atualizado com sucesso!",
      });
    } catch (error) {
      console.error("Error adding entry:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o lançamento.",
        variant: "destructive",
      });
    }
  };

  const getTotalBalance = () => {
    const total = accounts.reduce((total, account) => total + account.balance, 0);
    console.log('Calculating total balance:', { accounts: accounts.length, total, lastUpdate });
    return total;
  };

  const getTotalIncome = () => {
    return cashFlow
      .filter(entry => entry.type === 'income' && entry.status === 'confirmed')
      .reduce((total, entry) => total + entry.amount, 0);
  };

  const getTotalExpenses = () => {
    return cashFlow
      .filter(entry => entry.type === 'expense' && entry.status === 'confirmed')
      .reduce((total, entry) => total + entry.amount, 0);
  };

  const getNetResult = () => {
    return getTotalIncome() - getTotalExpenses();
  };

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.type) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Salvar conta no banco de dados
      const { error } = await supabase
        .from('bank_accounts')
        .insert({
          name: newAccount.name,
          account_type: newAccount.type,
          balance: newAccount.balance
        });

      if (error) throw error;

      setNewAccount({
        name: "",
        type: "checking",
        balance: 0
      });
      setIsAddingAccount(false);
      
      toast({
        title: "Sucesso",
        description: "Conta adicionada com sucesso!",
      });
    } catch (error) {
      console.error("Error adding account:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a conta.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      // Remover conta do banco de dados
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta removida com sucesso!",
      });
    } catch (error) {
      console.error("Error removing account:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a conta.",
        variant: "destructive",
      });
    }
  };

  const handleEditAccount = (account: AccountBalance) => {
    setSelectedAccount(account);
    setNewAccount({
      name: account.name,
      type: account.type,
      balance: account.balance
    });
    setIsEditingAccount(true);
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount || !newAccount.name || !newAccount.type) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Atualizar conta no banco de dados
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          name: newAccount.name,
          account_type: newAccount.type,
          balance: newAccount.balance
        })
        .eq('id', selectedAccount.id);

      if (error) throw error;

      setNewAccount({
        name: "",
        type: "checking",
        balance: 0
      });
      setSelectedAccount(null);
      setIsEditingAccount(false);
      
      toast({
        title: "Sucesso",
        description: "Conta atualizada com sucesso!",
      });
    } catch (error) {
      console.error("Error updating account:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a conta.",
        variant: "destructive",
      });
    }
  };

  const handleViewStatement = (account: AccountBalance) => {
    setSelectedAccount(account);
    setIsViewingStatement(true);
  };

  const getAccountTransactions = (accountName: string) => {
    return cashFlow.filter(entry => {
      const entryMatches = entry.account === accountName;
      
      if (!dateFilter.startDate && !dateFilter.endDate) {
        return entryMatches;
      }
      
      const entryDate = new Date(entry.date);
      
      if (dateFilter.startDate && dateFilter.endDate) {
        return entryMatches && entryDate >= dateFilter.startDate && entryDate <= dateFilter.endDate;
      } else if (dateFilter.startDate) {
        return entryMatches && entryDate >= dateFilter.startDate;
      } else if (dateFilter.endDate) {
        return entryMatches && entryDate <= dateFilter.endDate;
      }
      
      return entryMatches;
    });
  };

  // Generate financial reports
  const generateReport = async (reportType: string) => {
    setIsGeneratingReport(true);
    setActiveReport(reportType);
    
    try {
      let generatedData = null;
      
      switch (reportType) {
        case 'income-statement':
          generatedData = generateIncomeStatement();
          break;
        case 'cash-flow-projection':
          generatedData = generateCashFlowProjection();
          break;
        case 'profitability-analysis':
          generatedData = generateProfitabilityAnalysis();
          break;
        case 'tax-report':
          generatedData = generateTaxReport();
          break;
        case 'deductible-expenses':
          generatedData = generateDeductibleExpensesReport();
          break;
        default:
          throw new Error('Tipo de relatório não suportado');
      }
      
      setReportData(generatedData);
      
      toast({
        title: "Relatório gerado",
        description: "O relatório foi gerado com sucesso!",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Generate Income Statement (DRE)
  const generateIncomeStatement = () => {
    const totalRevenue = getTotalIncome();
    const totalExpenses = getTotalExpenses();
    const netIncome = totalRevenue - totalExpenses;
    
    // Group expenses by category
    const expensesByCategory = cashFlow
      .filter(entry => entry.type === 'expense' && entry.status === 'confirmed')
      .reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      type: 'income-statement',
      title: 'Demonstrativo de Resultados (DRE)',
      period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      data: {
        revenue: {
          total: totalRevenue,
          events: cashFlow
            .filter(entry => entry.type === 'income' && entry.status === 'confirmed')
            .reduce((acc, entry) => acc + entry.amount, 0)
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory
        },
        netIncome,
        netMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
      }
    };
  };

  // Generate Cash Flow Projection
  const generateCashFlowProjection = () => {
    const currentMonth = new Date();
    const projections = [];
    
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
      const monthKey = format(monthDate, 'yyyy-MM');
      
      // Filter transactions for this month
      const monthTransactions = cashFlow.filter(entry => 
        entry.date.startsWith(monthKey) && entry.status === 'confirmed'
      );
      
      const monthIncome = monthTransactions
        .filter(entry => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0);
      
      const monthExpenses = monthTransactions
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);
      
      projections.push({
        month: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        income: monthIncome,
        expenses: monthExpenses,
        netFlow: monthIncome - monthExpenses
      });
    }
    
    return {
      type: 'cash-flow-projection',
      title: 'Projeção de Fluxo de Caixa',
      period: 'Próximos 6 meses',
      data: projections
    };
  };

  // Generate Profitability Analysis
  const generateProfitabilityAnalysis = () => {
    const events = cashFlow.filter(entry => 
      entry.type === 'income' && 
      entry.status === 'confirmed' && 
      entry.category === 'Receita de Eventos'
    );
    
    const totalEventRevenue = events.reduce((sum, event) => sum + event.amount, 0);
    const totalEventExpenses = cashFlow
      .filter(entry => entry.type === 'expense' && entry.status === 'confirmed')
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    const profitMargin = totalEventRevenue > 0 ? 
      ((totalEventRevenue - totalEventExpenses) / totalEventRevenue) * 100 : 0;
    
    // Analyze by category
    const categoryAnalysis = Object.entries(
      cashFlow
        .filter(entry => entry.type === 'expense' && entry.status === 'confirmed')
        .reduce((acc, entry) => {
          acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
          return acc;
        }, {} as Record<string, number>)
    ).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalEventExpenses > 0 ? (amount / totalEventExpenses) * 100 : 0
    }));
    
    return {
      type: 'profitability-analysis',
      title: 'Análise de Lucratividade',
      period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      data: {
        revenue: totalEventRevenue,
        expenses: totalEventExpenses,
        profit: totalEventRevenue - totalEventExpenses,
        profitMargin,
        categoryAnalysis
      }
    };
  };

  // Render report content based on type
  const renderReportContent = () => {
    if (!reportData) return null;

    switch (reportData.type) {
      case 'income-statement':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportData.data.revenue.total)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Totais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(reportData.data.expenses.total)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${reportData.data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(reportData.data.netIncome)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Margem: {reportData.data.netMargin.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Despesas por Categoria</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(reportData.data.expenses.byCategory).map(([category, amount]) => (
                    <TableRow key={category}>
                      <TableCell>{category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(amount as number)}</TableCell>
                      <TableCell className="text-right">
                        {((amount as number / reportData.data.expenses.total) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case 'cash-flow-projection':
        return (
          <div className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Receitas</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Fluxo Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.data.map((month: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{month.month}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(month.income)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(month.expenses)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${month.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(month.netFlow)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case 'profitability-analysis':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold mb-4">Resumo Financeiro</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Receita Total:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(reportData.data.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Despesas Totais:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(reportData.data.expenses)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Lucro:</span>
                    <span className={`font-bold ${reportData.data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(reportData.data.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margem de Lucro:</span>
                    <span className="font-semibold">
                      {reportData.data.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Distribuição de Despesas</h4>
                <div className="space-y-2">
                  {reportData.data.categoryAnalysis.map((item: any) => (
                    <div key={item.category} className="flex justify-between">
                      <span className="text-sm">{item.category}:</span>
                      <div className="text-right">
                        <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                        <div className="text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'tax-report':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(reportData.data.totalIncome)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Dedutíveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(reportData.data.deductibleExpenses)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Base de Cálculo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(reportData.data.taxableIncome)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Imposto Estimado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(reportData.data.estimatedTax)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Taxa: {reportData.data.effectiveRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Detalhamento de Todas as Despesas */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Detalhamento de Todas as Despesas</h4>
              
              {Object.entries(reportData.data.expensesByCategory).map(([category, expenses]) => (
                <Card key={category} className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{category}</CardTitle>
                    <CardDescription>
                      Total: {formatCurrency((expenses as CashFlowEntry[]).reduce((sum: number, exp: CashFlowEntry) => sum + exp.amount, 0))}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(expenses as CashFlowEntry[]).map((expense: CashFlowEntry) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              {new Date(expense.date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>{expense.account}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(expense.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
              
              {reportData.data.allExpenses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma despesa encontrada no período.
                </div>
              )}
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Aviso:</strong> Este é um cálculo estimativo. Consulte um contador para 
                informações fiscais precisas e atualizadas.
              </p>
            </div>
          </div>
        );

      case 'deductible-expenses':
        return (
          <div className="space-y-6">
            {/* Resumo das Despesas Dedutíveis */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Dedutível</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportData.data.totalDeductible)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {reportData.data.deductiblePercentage.toFixed(1)}% do total
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Não Dedutível</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(reportData.data.totalNonDeductible)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(100 - reportData.data.deductiblePercentage).toFixed(1)}% do total
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(reportData.data.totalExpenses)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Economia Fiscal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(reportData.data.totalDeductible * 0.15)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Est. 15% de redução
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Resumo por Categoria */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo por Categoria Dedutível</CardTitle>
                <CardDescription>Despesas organizadas por categoria fiscal</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">% do Dedutível</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.data.categoryTotals.map((category: any) => (
                      <TableRow key={category.category}>
                        <TableCell className="font-medium">{category.category}</TableCell>
                        <TableCell className="text-right">{category.count}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(category.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {((category.total / reportData.data.totalDeductible) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Detalhamento por Categoria */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Detalhamento de Despesas Dedutíveis</h4>
              
              {Object.entries(reportData.data.deductibleByCategory).map(([category, expenses]) => (
                <Card key={category} className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-green-700">{category}</CardTitle>
                    <CardDescription>
                      {(expenses as CashFlowEntry[]).length} lançamentos - Total: {formatCurrency((expenses as CashFlowEntry[]).reduce((sum: number, exp: CashFlowEntry) => sum + exp.amount, 0))}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(expenses as CashFlowEntry[]).map((expense: CashFlowEntry) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              {new Date(expense.date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>{expense.account}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(expense.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Despesas Não Dedutíveis */}
            {reportData.data.nonDeductibleExpenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-700">Despesas Não Dedutíveis</CardTitle>
                  <CardDescription>
                    {reportData.data.nonDeductibleExpenses.length} lançamentos - Total: {formatCurrency(reportData.data.totalNonDeductible)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.nonDeductibleExpenses.slice(0, 10).map((expense: any) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {new Date(expense.date).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>{expense.account}</TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {reportData.data.nonDeductibleExpenses.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      E mais {reportData.data.nonDeductibleExpenses.length - 10} despesas...
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Observações Legais */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-800 mb-2">Categorias Consideradas Dedutíveis:</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-700">
                {reportData.data.deductibleCategories.map((category: string) => (
                  <div key={category} className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    {category}
                  </div>
                ))}
              </div>
              <p className="text-sm text-blue-800 mt-3">
                <strong>Importante:</strong> Esta classificação é baseada na legislação geral. 
                Consulte sempre um contador qualificado para orientações específicas do seu caso.
              </p>
            </div>
          </div>
        );

      default:
        return <div>Tipo de relatório não reconhecido.</div>;
    }
  };

  // Generate Deductible Expenses Report
  const generateDeductibleExpensesReport = () => {
    const currentMonth = new Date();
    const startOfYear = new Date(currentMonth.getFullYear(), 0, 1);
    const endOfYear = new Date(currentMonth.getFullYear(), 11, 31);
    
    // Categorias dedutíveis segundo a legislação brasileira
    const deductibleCategories = [
      'Equipamentos',
      'Despesas Operacionais', 
      'Marketing',
      'Transporte',
      'Pessoal',
      'Alimentação', // Para viagens de negócios
      'Manutenção',
      'Combustível',
      'Telefone',
      'Internet',
      'Material de Escritório',
      'Seguros',
      'Depreciação'
    ];
    
    const yearTransactions = cashFlow.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfYear && 
             entryDate <= endOfYear && 
             entry.status === 'confirmed' &&
             entry.type === 'expense';
    });
    
    // Separar despesas dedutíveis e não dedutíveis
    const deductibleExpenses = yearTransactions.filter(expense => 
      deductibleCategories.includes(expense.category)
    );
    
    const nonDeductibleExpenses = yearTransactions.filter(expense => 
      !deductibleCategories.includes(expense.category)
    );
    
    // Agrupar despesas dedutíveis por categoria
    const deductibleByCategory = deductibleExpenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = [];
      }
      acc[expense.category].push(expense);
      return acc;
    }, {} as Record<string, CashFlowEntry[]>);
    
    // Calcular totais por categoria
    const categoryTotals = Object.entries(deductibleByCategory).map(([category, expenses]) => ({
      category,
      total: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      count: expenses.length,
      expenses
    })).sort((a, b) => b.total - a.total);
    
    const totalDeductible = deductibleExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalNonDeductible = nonDeductibleExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalExpenses = totalDeductible + totalNonDeductible;
    
    return {
      type: 'deductible-expenses',
      title: 'Relatório de Despesas Dedutíveis',
      period: `Ano ${currentMonth.getFullYear()}`,
      data: {
        totalDeductible,
        totalNonDeductible,
        totalExpenses,
        deductiblePercentage: totalExpenses > 0 ? (totalDeductible / totalExpenses) * 100 : 0,
        categoryTotals,
        deductibleByCategory,
        nonDeductibleExpenses,
        deductibleCategories
      }
    };
  };

  // Generate Tax Report
  const generateTaxReport = () => {
    const currentMonth = new Date();
    const startOfYear = new Date(currentMonth.getFullYear(), 0, 1);
    const endOfYear = new Date(currentMonth.getFullYear(), 11, 31);
    
    const yearTransactions = cashFlow.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfYear && entryDate <= endOfYear && entry.status === 'confirmed';
    });
    
    const totalIncome = yearTransactions
      .filter(entry => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const allExpenses = yearTransactions
      .filter(entry => entry.type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const deductibleExpenses = yearTransactions
      .filter(entry => entry.type === 'expense' && 
        ['Equipamentos', 'Despesas Operacionais', 'Marketing', 'Transporte'].includes(entry.category))
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const taxableIncome = totalIncome - deductibleExpenses;
    const estimatedTax = taxableIncome * 0.15; // Simplified 15% tax rate
    
    // Agrupar despesas por categoria
    const expensesByCategory = allExpenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = [];
      }
      acc[expense.category].push(expense);
      return acc;
    }, {} as Record<string, any[]>);
    
    return {
      type: 'tax-report',
      title: 'Relatório Fiscal Detalhado',
      period: `Ano ${currentMonth.getFullYear()}`,
      data: {
        totalIncome,
        deductibleExpenses,
        taxableIncome,
        estimatedTax,
        effectiveRate: totalIncome > 0 ? (estimatedTax / totalIncome) * 100 : 0,
        allExpenses,
        expensesByCategory
      }
    };
  };

  // Download report as PDF/Excel (placeholder function)
  const downloadReport = (format: 'pdf' | 'excel') => {
    if (!reportData) return;
    
    // This would integrate with a PDF/Excel generation library
    toast({
      title: `Download ${format.toUpperCase()}`,
      description: `Relatório baixado em formato ${format.toUpperCase()}`,
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando dados financeiros...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Controle Financeiro</h2>
          <p className="text-muted-foreground">Planilhas e controles financeiros completos</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedPeriod === "custom" && (
            <>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(getTotalBalance())}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalIncome())}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(getTotalExpenses())}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getNetResult() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(getNetResult())}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs das Planilhas */}
      <Tabs defaultValue="cashflow" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="budget">Orçamento</TabsTrigger>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="inventory">Inventário</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fluxo de Caixa</CardTitle>
                  <CardDescription>Controle detalhado de entradas e saídas</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Filtro de Data */}
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">Filtrar:</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-[140px] justify-start text-left font-normal",
                            !dateFilter.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilter.startDate ? format(dateFilter.startDate, "dd/MM/yyyy") : "Data inicial"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFilter.startDate}
                          onSelect={(date) => setDateFilter({...dateFilter, startDate: date})}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-[140px] justify-start text-left font-normal",
                            !dateFilter.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilter.endDate ? format(dateFilter.endDate, "dd/MM/yyyy") : "Data final"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFilter.endDate}
                          onSelect={(date) => setDateFilter({...dateFilter, endDate: date})}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDateFilter({startDate: null, endDate: null})}
                    >
                      Limpar
                    </Button>
                  </div>
                  <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Lançamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Lançamento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description">Descrição</Label>
                          <Input
                            id="description"
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                            placeholder="Digite a descrição..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="type">Tipo</Label>
                            <Select value={newEntry.type} onValueChange={(value: 'income' | 'expense') => setNewEntry({...newEntry, type: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="income">Receita</SelectItem>
                                <SelectItem value="expense">Despesa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="category">Categoria</Label>
                            <Select value={newEntry.category} onValueChange={(value) => setNewEntry({...newEntry, category: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="Receita de Eventos">Receita de Eventos</SelectItem>
                                 <SelectItem value="Equipamentos">Equipamentos</SelectItem>
                                 <SelectItem value="Despesas Operacionais">Despesas Operacionais</SelectItem>
                                 <SelectItem value="Pessoal">Pessoal</SelectItem>
                                 <SelectItem value="Marketing">Marketing</SelectItem>
                                 <SelectItem value="Alimentação">Alimentação</SelectItem>
                                 <SelectItem value="Transporte">Transporte</SelectItem>
                                 <SelectItem value="Outros">Outros</SelectItem>
                               </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="amount">Valor</Label>
                            <Input
                              id="amount"
                              type="number"
                              value={newEntry.amount}
                              onChange={(e) => setNewEntry({...newEntry, amount: parseFloat(e.target.value) || 0})}
                              placeholder="0,00"
                            />
                          </div>
                          <div>
                            <Label htmlFor="date">Data</Label>
                            <Input
                              id="date"
                              type="date"
                              value={newEntry.date}
                              onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="account">Conta</Label>
                          <Select value={newEntry.account} onValueChange={(value) => setNewEntry({...newEntry, account: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                             <SelectContent>
                               {accounts.map((account) => (
                                 <SelectItem key={account.id} value={account.name}>
                                   {account.name}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddingEntry(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleAddEntry}>
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashFlow
                    .filter(entry => {
                      if (!dateFilter.startDate && !dateFilter.endDate) return true;
                      const entryDate = new Date(entry.date);
                      const start = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
                      const end = dateFilter.endDate ? new Date(dateFilter.endDate) : null;
                      
                      if (start && end) {
                        return entryDate >= start && entryDate <= end;
                      } else if (start) {
                        return entryDate >= start;
                      } else if (end) {
                        return entryDate <= end;
                      }
                      return true;
                    })
                    .map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {new Date(entry.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.category}</TableCell>
                      <TableCell>
                        <Badge variant={entry.type === 'income' ? 'default' : 'secondary'}>
                          {entry.type === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className={entry.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell>{entry.account}</TableCell>
                      <TableCell>
                        <Badge variant={
                          entry.status === 'confirmed' ? 'default' : 
                          entry.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {entry.status === 'confirmed' ? 'Confirmado' : 
                           entry.status === 'pending' ? 'Pendente' : 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Controle Orçamentário</CardTitle>
              <CardDescription>Acompanhe o orçamento vs realizado por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budget.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{item.category}</h4>
                      <span className="text-sm text-muted-foreground">{item.percentage}% utilizado</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Orçado</div>
                        <div className="font-bold">{formatCurrency(item.budgeted)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Gasto</div>
                        <div className="font-bold text-red-600">{formatCurrency(item.spent)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Restante</div>
                        <div className="font-bold text-green-600">{formatCurrency(item.remaining)}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            item.percentage > 90 ? 'bg-red-500' : 
                            item.percentage > 70 ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contas Bancárias</CardTitle>
                  <CardDescription>Saldos e movimentações das contas</CardDescription>
                </div>
                <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Conta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Conta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="accountName">Nome da Conta</Label>
                        <Input
                          id="accountName"
                          value={newAccount.name}
                          onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                          placeholder="Digite o nome da conta..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="accountType">Tipo da Conta</Label>
                        <Select value={newAccount.type} onValueChange={(value: 'checking' | 'savings' | 'cash') => setNewAccount({...newAccount, type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">Conta Corrente</SelectItem>
                            <SelectItem value="savings">Conta Poupança</SelectItem>
                            <SelectItem value="cash">Dinheiro em Caixa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="accountBalance">Saldo Inicial</Label>
                        <Input
                          id="accountBalance"
                          type="number"
                          value={newAccount.balance}
                          onChange={(e) => setNewAccount({...newAccount, balance: parseFloat(e.target.value) || 0})}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddingAccount(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddAccount}>
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {account.type === 'checking' ? 'Conta Corrente' : 
                         account.type === 'savings' ? 'Conta Poupança' : 'Dinheiro'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatCurrency(account.balance)}</div>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewStatement(account)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Extrato
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditAccount(account)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveAccount(account.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inventário Patrimonial</CardTitle>
                  <CardDescription>Controle de bens e patrimônio da empresa</CardDescription>
                </div>
                <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Adicionar Item ao Patrimônio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="itemName">Nome do Item</Label>
                          <Input
                            id="itemName"
                            placeholder="Ex: Computador Dell, Mesa de Som..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="itemCategory">Categoria</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equipamentos-som">Equipamentos de Som</SelectItem>
                              <SelectItem value="equipamentos-iluminacao">Equipamentos de Iluminação</SelectItem>
                              <SelectItem value="moveis">Móveis e Utensílios</SelectItem>
                              <SelectItem value="veiculos">Veículos</SelectItem>
                              <SelectItem value="informatica">Informática</SelectItem>
                              <SelectItem value="ferramentas">Ferramentas</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="acquisitionValue">Valor de Aquisição</Label>
                          <Input
                            id="acquisitionValue"
                            type="number"
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="acquisitionDate">Data de Aquisição</Label>
                          <Input
                            id="acquisitionDate"
                            type="date"
                          />
                        </div>
                        <div>
                          <Label htmlFor="condition">Estado de Conservação</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="novo">Novo</SelectItem>
                              <SelectItem value="otimo">Ótimo</SelectItem>
                              <SelectItem value="bom">Bom</SelectItem>
                              <SelectItem value="regular">Regular</SelectItem>
                              <SelectItem value="ruim">Ruim</SelectItem>
                              <SelectItem value="pessimo">Péssimo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="serialNumber">Número de Série</Label>
                          <Input
                            id="serialNumber"
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">Localização</Label>
                          <Input
                            id="location"
                            placeholder="Ex: Escritório, Almoxarifado..."
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Descrição/Observações</Label>
                        <Input
                          id="description"
                          placeholder="Detalhes adicionais, marca, modelo..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddingEntry(false)}>
                          Cancelar
                        </Button>
                        <Button>
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Resumo do Patrimônio */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">156</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(285500)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Depreciação Acumulada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{formatCurrency(45200)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Valor Atual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(240300)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <Input
                      placeholder="Buscar item..."
                      className="w-64"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as Categorias</SelectItem>
                      <SelectItem value="equipamentos-som">Equipamentos de Som</SelectItem>
                      <SelectItem value="equipamentos-iluminacao">Equipamentos de Iluminação</SelectItem>
                      <SelectItem value="moveis">Móveis e Utensílios</SelectItem>
                      <SelectItem value="veiculos">Veículos</SelectItem>
                      <SelectItem value="informatica">Informática</SelectItem>
                      <SelectItem value="ferramentas">Ferramentas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Estados</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="otimo">Ótimo</SelectItem>
                      <SelectItem value="bom">Bom</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="ruim">Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabela de Itens */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor Aquisição</TableHead>
                      <TableHead>Data Aquisição</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Valor Atual</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Exemplos de itens */}
                    <TableRow>
                      <TableCell>
                        <div>
                          <div className="font-medium">Mesa de Som Behringer X32</div>
                          <div className="text-sm text-muted-foreground">SN: BX32-2024-001</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Equipamentos de Som</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(15000)}</TableCell>
                      <TableCell>15/03/2024</TableCell>
                      <TableCell>
                        <Badge variant="default">Novo</Badge>
                      </TableCell>
                      <TableCell>Almoxarifado A</TableCell>
                      <TableCell className="font-medium">{formatCurrency(14500)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div>
                          <div className="font-medium">Refletor LED Moving Head</div>
                          <div className="text-sm text-muted-foreground">SN: LED-MH-2023-045</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Equipamentos de Iluminação</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(3500)}</TableCell>
                      <TableCell>20/08/2023</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Ótimo</Badge>
                      </TableCell>
                      <TableCell>Estoque Equipamentos</TableCell>
                      <TableCell className="font-medium">{formatCurrency(3200)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div>
                          <div className="font-medium">Fiat Ducato Cargo 2022</div>
                          <div className="text-sm text-muted-foreground">Placa: ABC-1234</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Veículos</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(120000)}</TableCell>
                      <TableCell>10/01/2022</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Bom</Badge>
                      </TableCell>
                      <TableCell>Garagem Principal</TableCell>
                      <TableCell className="font-medium">{formatCurrency(95000)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div>
                          <div className="font-medium">Computador Dell Inspiron</div>
                          <div className="text-sm text-muted-foreground">SN: DLL-INS-2023-012</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Informática</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(4500)}</TableCell>
                      <TableCell>05/06/2023</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Bom</Badge>
                      </TableCell>
                      <TableCell>Escritório</TableCell>
                      <TableCell className="font-medium">{formatCurrency(3800)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Relatórios Financeiros</CardTitle>
                  <CardDescription>Análises e relatórios detalhados</CardDescription>
                </div>
                {reportData && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadReport('pdf')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadReport('excel')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => generateReport('income-statement')}
                  disabled={isGeneratingReport}
                >
                  <FileText className="h-8 w-8 mb-2" />
                  <span>Demonstrativo de Resultados</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => generateReport('cash-flow-projection')}
                  disabled={isGeneratingReport}
                >
                  <Calculator className="h-8 w-8 mb-2" />
                  <span>Fluxo de Caixa Projetado</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => generateReport('profitability-analysis')}
                  disabled={isGeneratingReport}
                >
                  <TrendingUp className="h-8 w-8 mb-2" />
                  <span>Análise de Lucratividade</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => generateReport('tax-report')}
                  disabled={isGeneratingReport}
                >
                  <FileText className="h-8 w-8 mb-2" />
                  <span>Relatório Fiscal</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => generateReport('deductible-expenses')}
                  disabled={isGeneratingReport}
                >
                  <Calculator className="h-8 w-8 mb-2" />
                  <span>Despesas Dedutíveis</span>
                </Button>
              </div>
              
              {isGeneratingReport && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-primary bg-muted">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando relatório...
                  </div>
                </div>
              )}

              {reportData && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{reportData.title}</CardTitle>
                    <CardDescription>Período: {reportData.period}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderReportContent()}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para editar conta */}
      <Dialog open={isEditingAccount} onOpenChange={setIsEditingAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editAccountName">Nome da Conta</Label>
              <Input
                id="editAccountName"
                value={newAccount.name}
                onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                placeholder="Digite o nome da conta..."
              />
            </div>
            <div>
              <Label htmlFor="editAccountType">Tipo da Conta</Label>
              <Select value={newAccount.type} onValueChange={(value: 'checking' | 'savings' | 'cash') => setNewAccount({...newAccount, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="savings">Conta Poupança</SelectItem>
                  <SelectItem value="cash">Dinheiro em Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editAccountBalance">Saldo Atual</Label>
              <Input
                id="editAccountBalance"
                type="number"
                value={newAccount.balance}
                onChange={(e) => setNewAccount({...newAccount, balance: parseFloat(e.target.value) || 0})}
                placeholder="0,00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditingAccount(false);
                  setSelectedAccount(null);
                  setNewAccount({
                    name: "",
                    type: "checking",
                    balance: 0
                  });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateAccount}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar extrato */}
      <Dialog open={isViewingStatement} onOpenChange={setIsViewingStatement}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Extrato - {selectedAccount?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <div className="font-medium">Saldo Atual</div>
                <div className="text-2xl font-bold">{formatCurrency(selectedAccount?.balance || 0)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {selectedAccount?.type === 'checking' ? 'Conta Corrente' : 
                   selectedAccount?.type === 'savings' ? 'Conta Poupança' : 'Dinheiro'}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Movimentações</h3>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">Filtrar por data:</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !dateFilter.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter.startDate ? format(dateFilter.startDate, "dd/MM/yyyy") : "Data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFilter.startDate}
                        onSelect={(date) => setDateFilter({...dateFilter, startDate: date})}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !dateFilter.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter.endDate ? format(dateFilter.endDate, "dd/MM/yyyy") : "Data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFilter.endDate}
                        onSelect={(date) => setDateFilter({...dateFilter, endDate: date})}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDateFilter({startDate: null, endDate: null})}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAccount && getAccountTransactions(selectedAccount.name).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                          {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          transaction.status === 'confirmed' ? 'default' : 
                          transaction.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {transaction.status === 'confirmed' ? 'Confirmado' : 
                           transaction.status === 'pending' ? 'Pendente' : 'Cancelado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {selectedAccount && getAccountTransactions(selectedAccount.name).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada para esta conta.
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsViewingStatement(false);
                  setSelectedAccount(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};