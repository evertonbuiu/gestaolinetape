import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Download, Calendar, Edit, Trash2, FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCustomAuth } from "@/hooks/useCustomAuth";

interface DailyExpense {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  expense_bank_account?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

interface ExpenseCategory {
  name: string;
  budget: number;
  spent: number;
}

export const ExpenseSpreadsheet = () => {
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(null);
  const { toast } = useToast();
  const { user } = useCustomAuth();

  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "",
    amount: 0,
    expense_bank_account: "",
    notes: ""
  });

  const expenseCategories = [
    "Equipamentos",
    "Despesas Operacionais", 
    "Pessoal",
    "Marketing",
    "Alimentação",
    "Transporte",
    "Outros"
  ];

  useEffect(() => {
    loadExpenses();
    loadBankAccounts();
    
    // Configurar real-time updates para company_expenses e event_expenses
    const channel = supabase
      .channel('expense-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_expenses'
        },
        async (payload) => {
          console.log('Company expense change detected, syncing:', payload);
          // Sincronizar transações e recarregar
          await supabase.rpc('sync_bank_transactions');
          loadExpenses();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_expenses'
        },
        async (payload) => {
          console.log('Event expense change detected, syncing:', payload);
          // Sincronizar transações e recarregar
          await supabase.rpc('sync_bank_transactions');
          loadExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMonth, selectedYear, selectedDay]);

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('name')
        .order('name');

      if (error) throw error;

      setBankAccounts(data?.map(account => account.name) || []);
    } catch (error) {
      console.error("Error loading bank accounts:", error);
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`;

      // Buscar despesas da empresa (company_expenses)
      let companyQuery = supabase
        .from('company_expenses')
        .select('*');

      if (selectedDay) {
        companyQuery = companyQuery.eq('expense_date', selectedDay);
      } else {
        companyQuery = companyQuery
          .gte('expense_date', startDate)
          .lte('expense_date', endDate);
      }

      // Buscar despesas dos eventos (event_expenses)
      let eventQuery = supabase
        .from('event_expenses')
        .select('*');

      if (selectedDay) {
        eventQuery = eventQuery.eq('expense_date', selectedDay);
      } else {
        eventQuery = eventQuery
          .gte('expense_date', startDate)
          .lte('expense_date', endDate);
      }

      const [companyResult, eventResult] = await Promise.all([
        companyQuery.order('expense_date', { ascending: false }),
        eventQuery.order('expense_date', { ascending: false })
      ]);

      if (companyResult.error) throw companyResult.error;
      if (eventResult.error) throw eventResult.error;

      // Mapear despesas da empresa
      const companyExpenses: DailyExpense[] = companyResult.data?.map(expense => ({
        id: expense.id,
        date: expense.expense_date || expense.created_at.split('T')[0],
        description: expense.description,
        category: expense.category,
        amount: expense.total_price,
        expense_bank_account: expense.expense_bank_account,
        notes: expense.notes,
        created_by: expense.created_by,
        created_at: expense.created_at
      })) || [];

      // Mapear despesas dos eventos
      const eventExpenses: DailyExpense[] = eventResult.data?.map(expense => ({
        id: expense.id,
        date: expense.expense_date || expense.created_at.split('T')[0],
        description: `[Evento] ${expense.description}`,
        category: expense.category,
        amount: expense.total_price,
        expense_bank_account: expense.expense_bank_account,
        notes: expense.notes,
        created_by: expense.created_by,
        created_at: expense.created_at
      })) || [];

      // Combinar todas as despesas e ordenar por data
      const allExpenses = [...companyExpenses, ...eventExpenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setExpenses(allExpenses);

      // Calcular categorias com gastos (incluindo ambas as fontes)
      const categorySpending = allExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const calculatedCategories: ExpenseCategory[] = expenseCategories.map(category => ({
        name: category,
        budget: getCategoryBudget(category),
        spent: categorySpending[category] || 0
      }));

      setCategories(calculatedCategories);

    } catch (error) {
      console.error("Error loading expenses:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as despesas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBudget = (category: string): number => {
    // Carregar orçamento salvo no localStorage da gestão financeira
    const budgetKey = `company_budget_${selectedMonth}_${selectedYear}`;
    const savedBudget = localStorage.getItem(budgetKey);
    
    if (savedBudget) {
      try {
        const budgetData = JSON.parse(savedBudget);
        const budgetItem = budgetData.find((item: any) => item.category === category);
        if (budgetItem) {
          return budgetItem.budgeted;
        }
      } catch (error) {
        console.error("Error parsing saved budget:", error);
      }
    }
    
    // Valores padrão se não houver orçamento salvo
    const defaultBudgets: Record<string, number> = {
      "Equipamentos": 5000,
      "Despesas Operacionais": 3000,
      "Pessoal": 2000,
      "Marketing": 1000,
      "Alimentação": 1500,
      "Transporte": 800,
      "Outros": 500
    };
    return defaultBudgets[category] || 500;
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.category || newExpense.amount <= 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Salvar despesa na tabela company_expenses (despesas da empresa)
      const { error } = await supabase
        .from('company_expenses')
        .insert({
          description: newExpense.description,
          category: newExpense.category,
          total_price: newExpense.amount,
          unit_price: newExpense.amount,
          quantity: 1,
          expense_bank_account: newExpense.expense_bank_account || null,
          notes: newExpense.notes || null,
          expense_date: newExpense.date,
          created_by: user?.id || ''
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Despesa adicionada com sucesso.",
      });

      // Atualizar filtros para mostrar o mês/ano da despesa adicionada
      const expenseDate = new Date(newExpense.date);
      const expenseMonth = expenseDate.getMonth() + 1;
      const expenseYear = expenseDate.getFullYear();
      
      setSelectedMonth(expenseMonth);
      setSelectedYear(expenseYear);

      setNewExpense({
        date: new Date().toISOString().split('T')[0],
        description: "",
        category: "",
        amount: 0,
        expense_bank_account: "",
        notes: ""
      });
      setIsAddingExpense(false);
      
      // Forçar atualização imediata
      loadExpenses();

    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a despesa.",
        variant: "destructive",
      });
    }
  };

  const handleEditExpense = async () => {
    if (!editingExpense) return;

    try {
      const { error } = await supabase
        .from('company_expenses')
        .update({
          description: editingExpense.description,
          category: editingExpense.category,
          total_price: editingExpense.amount,
          unit_price: editingExpense.amount,
          expense_bank_account: editingExpense.expense_bank_account || null,
          notes: editingExpense.notes || null,
          expense_date: editingExpense.date,
        })
        .eq('id', editingExpense.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Despesa atualizada com sucesso.",
      });

      // Se a data da despesa mudou, atualizar os filtros para mostrar o período correto
      const expenseDate = new Date(editingExpense.date);
      const expenseMonth = expenseDate.getMonth() + 1;
      const expenseYear = expenseDate.getFullYear();
      
      if (expenseMonth !== selectedMonth || expenseYear !== selectedYear) {
        setSelectedMonth(expenseMonth);
        setSelectedYear(expenseYear);
      }

      setEditingExpense(null);
      loadExpenses();

    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a despesa.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Despesa removida com sucesso.",
      });

      loadExpenses();

    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a despesa.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    // Calcular totais por categoria
    const totalsByCategory = categories.reduce((acc, cat) => {
      acc[cat.name] = {
        budget: cat.budget,
        spent: cat.spent,
        remaining: cat.budget - cat.spent
      };
      return acc;
    }, {} as Record<string, { budget: number; spent: number; remaining: number }>);

    const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0);
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalBudget - totalSpent;

    // Criar workbook
    const workbook = XLSX.utils.book_new();

    // Dashboard sheet
    const dashboardData = [
      ['RELATÓRIO FINANCEIRO - DESPESAS DA EMPRESA', '', '', ''],
      [`Período: ${selectedMonth}/${selectedYear}`, '', '', ''],
      ['', '', '', ''],
      ['RESUMO GERAL', '', '', ''],
      ['Total Orçado:', totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '', ''],
      ['Total Gasto:', totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '', ''],
      ['Saldo Restante:', totalRemaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '', ''],
      ['', '', '', ''],
      ['RESUMO POR CATEGORIA', '', '', ''],
      ['Categoria', 'Orçado', 'Gasto', 'Restante'],
      ...Object.entries(totalsByCategory).map(([cat, data]) => [
        cat,
        data.budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        data.spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        data.remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ])
    ];

    const dashboardSheet = XLSX.utils.aoa_to_sheet(dashboardData);
    
    // Formatar dashboard
    dashboardSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Título
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }  // Período
    ];
    
    dashboardSheet['!cols'] = [
      { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    // Despesas detalhadas sheet
    const expensesData = [
      ['Data', 'Descrição', 'Categoria', 'Valor', 'Conta Bancária', 'Observações'],
      ...expenses.map(expense => [
        expense.date,
        expense.description,
        expense.category,
        expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        expense.expense_bank_account || '',
        expense.notes || ''
      ]),
      ['', '', '', '', '', ''],
      ['TOTAL:', '', '', expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '', '']
    ];

    const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
    
    // Formatar planilha de despesas
    expensesSheet['!cols'] = [
      { width: 12 }, { width: 30 }, { width: 20 }, { width: 15 }, { width: 20 }, { width: 30 }
    ];

    // Tabela dinâmica sheet
    const pivotData = [
      ['TABELA DINÂMICA - ANÁLISE DE DESPESAS', '', '', '', ''],
      ['', '', '', '', ''],
      ['DESPESAS POR CATEGORIA E CONTA BANCÁRIA', '', '', '', ''],
      ['Categoria', 'Conta Bancária', 'Quantidade', 'Total (R$)', 'Média (R$)'],
    ];

    // Agrupar dados para tabela dinâmica
    const pivotGroups = expenses.reduce((acc, expense) => {
      const key = `${expense.category}_${expense.expense_bank_account || 'Não informado'}`;
      if (!acc[key]) {
        acc[key] = {
          category: expense.category,
          bank_account: expense.expense_bank_account || 'Não informado',
          count: 0,
          total: 0
        };
      }
      acc[key].count++;
      acc[key].total += expense.amount;
      return acc;
    }, {} as Record<string, { category: string; bank_account: string; count: number; total: number }>);

    // Adicionar dados agrupados à tabela dinâmica
    Object.values(pivotGroups).forEach(group => {
      pivotData.push([
        group.category,
        group.bank_account,
        group.count.toString(),
        group.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        (group.total / group.count).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);
    });

    // Adicionar totais gerais
    pivotData.push(['', '', '', '', '']);
    pivotData.push([
      'TOTAIS GERAIS',
      '',
      expenses.length.toString(),
      expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      (expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]);

    const pivotSheet = XLSX.utils.aoa_to_sheet(pivotData);
    
    // Formatar tabela dinâmica
    pivotSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Título
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }  // Subtítulo
    ];
    
    pivotSheet['!cols'] = [
      { width: 20 }, { width: 20 }, { width: 12 }, { width: 15 }, { width: 15 }
    ];

    // Adicionar sheets ao workbook
    XLSX.utils.book_append_sheet(workbook, dashboardSheet, "Dashboard");
    XLSX.utils.book_append_sheet(workbook, expensesSheet, "Despesas Detalhadas");
    XLSX.utils.book_append_sheet(workbook, pivotSheet, "Tabela Dinâmica");

    // Exportar arquivo
    const fileName = `relatorio_despesas_empresa_${selectedMonth}_${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Sucesso",
      description: "Relatório financeiro exportado com sucesso.",
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Configurar fonte e título
    doc.setFontSize(18);
    doc.text('RELATÓRIO DE DESPESAS DA EMPRESA', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Período: ${selectedMonth}/${selectedYear}`, 105, 30, { align: 'center' });
    
    // Resumo geral
    const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0);
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    
    let yPosition = 45;
    
    doc.setFontSize(14);
    doc.text('RESUMO GERAL', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.text(`Total Orçado: ${totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Total Gasto: ${totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Saldo Restante: ${totalRemaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPosition);
    yPosition += 15;
    
    // Tabela de categorias
    doc.setFontSize(14);
    doc.text('RESUMO POR CATEGORIA', 20, yPosition);
    yPosition += 10;
    
    const categoryTableData = categories.map(cat => [
      cat.name,
      cat.budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      cat.spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      (cat.budget - cat.spent).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]);
    
    (doc as any).autoTable({
      head: [['Categoria', 'Orçado', 'Gasto', 'Restante']],
      body: categoryTableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] },
      styles: { fontSize: 10 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Nova página se necessário
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Tabela de despesas detalhadas
    doc.setFontSize(14);
    doc.text('DESPESAS DETALHADAS', 20, yPosition);
    yPosition += 10;
    
    const expenseTableData = expenses.map(expense => [
      expense.date,
      expense.description,
      expense.category,
      expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      expense.expense_bank_account || ''
    ]);
    
    (doc as any).autoTable({
      head: [['Data', 'Descrição', 'Categoria', 'Valor', 'Conta']],
      body: expenseTableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { cellWidth: 50 },
        3: { cellWidth: 25 }
      }
    });
    
    // Salvar o PDF
    const fileName = `relatorio_despesas_empresa_${selectedMonth}_${selectedYear}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Sucesso",
      description: "Relatório PDF gerado com sucesso.",
    });
  };

  const getDailySpreadsheetData = () => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map(day => {
      const dayString = format(day, 'yyyy-MM-dd');
      const dayExpenses = expenses.filter(expense => expense.date === dayString);
      const totalDay = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      return {
        day: format(day, 'dd/MM/yyyy', { locale: ptBR }),
        dayOfWeek: format(day, 'EEEE', { locale: ptBR }),
        expenses: dayExpenses,
        total: totalDay
      };
    });
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0);

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Carregando planilha de gastos...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Planilha de Gastos da Empresa</h1>
          <p className="text-muted-foreground">Controle de despesas empresariais diárias e mensais</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddingExpense} onOpenChange={setIsAddingExpense}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Despesa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={newExpense.category} onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="Descrição da despesa"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_bank_account">Conta Bancária</Label>
                    <Select value={newExpense.expense_bank_account} onValueChange={(value) => setNewExpense({ ...newExpense, expense_bank_account: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map(account => (
                          <SelectItem key={account} value={account}>{account}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    placeholder="Observações adicionais"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingExpense(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddExpense}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button onClick={generatePDF} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Gerar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros de período */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2">
              <Label>Filtro por Dia Específico</Label>
              <Input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                placeholder="Filtrar por dia"
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
                disabled={!!selectedDay}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
                disabled={!!selectedDay}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {selectedDay && (
              <Button 
                variant="outline" 
                onClick={() => setSelectedDay('')}
                className="h-10"
              >
                Limpar Filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orçado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalBudget)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBudget - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBudget - totalExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Visão Mensal</TabsTrigger>
          <TabsTrigger value="daily">Planilha Diária</TabsTrigger>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Despesas do Mês</CardTitle>
              <CardDescription>
                {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta Bancária</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.date.split('-').reverse().join('/')}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>{expense.expense_bank_account || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingExpense(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma despesa encontrada para este período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Planilha Diária</CardTitle>
              <CardDescription>Despesas organizadas por dia do mês</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Dia da Semana</TableHead>
                    <TableHead>Qtd. Despesas</TableHead>
                    <TableHead className="text-right">Total do Dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getDailySpreadsheetData().map((day, index) => (
                    <TableRow key={index}>
                      <TableCell>{day.day}</TableCell>
                      <TableCell className="capitalize">{day.dayOfWeek}</TableCell>
                      <TableCell>{day.expenses.length}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(day.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoria</CardTitle>
              <CardDescription>Comparação entre orçado e gasto por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Orçado</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">% Usado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => {
                    const percentage = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
                    const remaining = category.budget - category.spent;
                    
                    return (
                      <TableRow key={category.name}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.budget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.spent)}</TableCell>
                        <TableCell className={`text-right ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={percentage > 100 ? "destructive" : percentage > 80 ? "secondary" : "default"}>
                            {percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de edição */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Data</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select value={editingExpense.category} onValueChange={(value) => setEditingExpense({ ...editingExpense, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Valor</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expense_bank_account">Conta Bancária</Label>
                  <Select value={editingExpense.expense_bank_account || ''} onValueChange={(value) => setEditingExpense({ ...editingExpense, expense_bank_account: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(account => (
                        <SelectItem key={account} value={account}>{account}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Observações</Label>
                <Input
                  id="edit-notes"
                  value={editingExpense.notes || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingExpense(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditExpense}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};