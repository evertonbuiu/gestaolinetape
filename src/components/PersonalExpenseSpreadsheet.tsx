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
import { Plus, Download, Calendar, Edit, Trash2, FileSpreadsheet, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCustomAuth } from "@/hooks/useCustomAuth";

interface PersonalExpense {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

interface ExpenseCategory {
  name: string;
  budget: number;
  spent: number;
}

export const PersonalExpenseSpreadsheet = () => {
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null);
  const { toast } = useToast();
  const { user } = useCustomAuth();

  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "",
    amount: 0,
    paymentMethod: "",
    notes: ""
  });

  const personalExpenseCategories = [
    "Moradia",
    "Alimentação",
    "Transporte", 
    "Saúde",
    "Educação",
    "Lazer",
    "Roupas",
    "Beleza",
    "Telefone",
    "Internet",
    "Subscriptions",
    "Presentes",
    "Viagens",
    "Investimentos",
    "Outros"
  ];

  const paymentMethods = [
    "Dinheiro",
    "Cartão de Débito",
    "Cartão de Crédito",
    "PIX",
    "Transferência Bancária",
    "Outros"
  ];

  useEffect(() => {
    loadPersonalExpenses();
  }, [selectedMonth, selectedYear, selectedDay]);

  const loadPersonalExpenses = async () => {
    try {
      setLoading(true);
      
      // Para gastos pessoais, vamos usar localStorage por enquanto
      // já que não temos uma tabela específica no Supabase para isso
      let mappedExpenses: PersonalExpense[] = [];
      
      if (selectedDay) {
        // Filtrar por dia específico - buscar em todos os meses salvos
        const allKeys = Object.keys(localStorage).filter(key => key.startsWith('personal_expenses_'));
        for (const key of allKeys) {
          const expenses = JSON.parse(localStorage.getItem(key) || '[]');
          const dayExpenses = expenses.filter((exp: PersonalExpense) => exp.date === selectedDay);
          mappedExpenses.push(...dayExpenses);
        }
      } else {
        // Filtrar por mês/ano
        const storageKey = `personal_expenses_${selectedMonth}_${selectedYear}`;
        const storedExpenses = localStorage.getItem(storageKey);
        if (storedExpenses) {
          mappedExpenses = JSON.parse(storedExpenses);
        }
      }

      setExpenses(mappedExpenses);

      // Calcular categorias com gastos
      const categorySpending = mappedExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const calculatedCategories: ExpenseCategory[] = personalExpenseCategories.map(category => ({
        name: category,
        budget: getCategoryBudget(category),
        spent: categorySpending[category] || 0
      }));

      setCategories(calculatedCategories);

    } catch (error) {
      console.error("Error loading personal expenses:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as despesas pessoais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBudget = (category: string): number => {
    const budgets: Record<string, number> = {
      "Moradia": 2000,
      "Alimentação": 800,
      "Transporte": 500,
      "Saúde": 400,
      "Educação": 300,
      "Lazer": 600,
      "Roupas": 200,
      "Beleza": 150,
      "Telefone": 80,
      "Internet": 100,
      "Subscriptions": 150,
      "Presentes": 200,
      "Viagens": 1000,
      "Investimentos": 1500,
      "Outros": 300
    };
    return budgets[category] || 300;
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
      const expense: PersonalExpense = {
        id: Date.now().toString(),
        date: newExpense.date,
        description: newExpense.description,
        category: newExpense.category,
        amount: newExpense.amount,
        paymentMethod: newExpense.paymentMethod,
        notes: newExpense.notes,
        created_by: user?.id || 'anonymous',
        created_at: new Date().toISOString()
      };

      // Determinar o mês/ano correto com base na data da despesa
      const expenseDate = new Date(newExpense.date);
      const expenseMonth = expenseDate.getMonth() + 1;
      const expenseYear = expenseDate.getFullYear();

      // Salvar no localStorage da data correta
      const storageKey = `personal_expenses_${expenseMonth}_${expenseYear}`;
      const existingExpenses = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedExpenses = [...existingExpenses, expense];
      localStorage.setItem(storageKey, JSON.stringify(updatedExpenses));

      toast({
        title: "Sucesso",
        description: "Despesa pessoal adicionada com sucesso.",
      });

      // Atualizar filtros para mostrar o mês/ano da despesa adicionada
      setSelectedMonth(expenseMonth);
      setSelectedYear(expenseYear);

      setNewExpense({
        date: new Date().toISOString().split('T')[0],
        description: "",
        category: "",
        amount: 0,
        paymentMethod: "",
        notes: ""
      });
      setIsAddingExpense(false);
      
      // Como mudamos os filtros, o useEffect irá carregar automaticamente as despesas do novo período

    } catch (error) {
      console.error("Error adding personal expense:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a despesa pessoal.",
        variant: "destructive",
      });
    }
  };

  const handleEditExpense = async () => {
    if (!editingExpense) return;

    try {
      // Determinar o mês/ano correto com base na data da despesa
      const expenseDate = new Date(editingExpense.date);
      const expenseMonth = expenseDate.getMonth() + 1;
      const expenseYear = expenseDate.getFullYear();
      
      const storageKey = `personal_expenses_${expenseMonth}_${expenseYear}`;
      
      // Se a data mudou, remover da chave original e adicionar na nova
      const originalStorageKey = `personal_expenses_${selectedMonth}_${selectedYear}`;
      
      if (storageKey !== originalStorageKey) {
        // Remover da chave original
        const originalExpenses = JSON.parse(localStorage.getItem(originalStorageKey) || '[]');
        const filteredOriginalExpenses = originalExpenses.filter((exp: PersonalExpense) => exp.id !== editingExpense.id);
        localStorage.setItem(originalStorageKey, JSON.stringify(filteredOriginalExpenses));
        
        // Adicionar na nova chave
        const newExpenses = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedNewExpenses = [...newExpenses, editingExpense];
        localStorage.setItem(storageKey, JSON.stringify(updatedNewExpenses));
      } else {
        // Mesma chave, apenas atualizar
        const existingExpenses = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedExpenses = existingExpenses.map((exp: PersonalExpense) => 
          exp.id === editingExpense.id ? editingExpense : exp
        );
        localStorage.setItem(storageKey, JSON.stringify(updatedExpenses));
      }

      toast({
        title: "Sucesso",
        description: "Despesa pessoal atualizada com sucesso.",
      });

      setEditingExpense(null);
      loadPersonalExpenses();

    } catch (error) {
      console.error("Error updating personal expense:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a despesa pessoal.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const storageKey = `personal_expenses_${selectedMonth}_${selectedYear}`;
      const existingExpenses = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedExpenses = existingExpenses.filter((exp: PersonalExpense) => exp.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updatedExpenses));

      toast({
        title: "Sucesso",
        description: "Despesa pessoal removida com sucesso.",
      });

      loadPersonalExpenses();

    } catch (error) {
      console.error("Error deleting personal expense:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a despesa pessoal.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      expenses.map(expense => ({
        Data: expense.date,
        Descrição: expense.description,
        Categoria: expense.category,
        Valor: expense.amount,
        'Forma de Pagamento': expense.paymentMethod || '',
        Observações: expense.notes || ''
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas Pessoais");

    const fileName = `despesas_pessoais_${selectedMonth}_${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Sucesso",
      description: "Planilha de despesas pessoais exportada com sucesso.",
    });
  };

  const getDailySpreadsheetData = () => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map(day => {
      const dayExpenses = expenses.filter(expense => 
        isSameDay(new Date(expense.date), day)
      );
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
            <div className="text-center">Carregando planilha de gastos pessoais...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Planilha de Gastos Pessoais</h1>
          </div>
          <p className="text-muted-foreground">Controle de despesas pessoais diárias e mensais</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddingExpense} onOpenChange={setIsAddingExpense}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa Pessoal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Despesa Pessoal</DialogTitle>
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
                        {personalExpenseCategories.map(category => (
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
                    <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                    <Select value={newExpense.paymentMethod} onValueChange={(value) => setNewExpense({ ...newExpense, paymentMethod: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method} value={method}>{method}</SelectItem>
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
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
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
              <CardTitle>Despesas Pessoais do Mês</CardTitle>
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
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>{expense.paymentMethod || '-'}</TableCell>
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
                        Nenhuma despesa pessoal encontrada para este período
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
              <CardDescription>Despesas pessoais organizadas por dia do mês</CardDescription>
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
              <CardDescription>Comparação entre orçado e gasto por categoria pessoal</CardDescription>
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
            <DialogTitle>Editar Despesa Pessoal</DialogTitle>
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
                      {personalExpenseCategories.map(category => (
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
                  <Label htmlFor="edit-paymentMethod">Forma de Pagamento</Label>
                  <Select value={editingExpense.paymentMethod || ''} onValueChange={(value) => setEditingExpense({ ...editingExpense, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
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