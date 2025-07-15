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
import { Calculator, Plus, Download, Upload, TrendingUp, TrendingDown, DollarSign, FileText, Search, Edit, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

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
  const { toast } = useToast();

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // Mock data - substituir por dados reais do Supabase
      const mockCashFlow: CashFlowEntry[] = [
        {
          id: "1",
          date: "2025-01-15",
          description: "Evento Casamento Silva",
          category: "Receita de Eventos",
          type: "income",
          amount: 15000,
          account: "Conta Corrente",
          status: "confirmed"
        },
        {
          id: "2",
          date: "2025-01-14",
          description: "Compra de equipamentos",
          category: "Equipamentos",
          type: "expense",
          amount: 2500,
          account: "Conta Corrente",
          status: "confirmed"
        },
        {
          id: "3",
          date: "2025-01-13",
          description: "Aluguel do espaço",
          category: "Despesas Operacionais",
          type: "expense",
          amount: 1200,
          account: "Conta Corrente",
          status: "confirmed"
        },
        {
          id: "4",
          date: "2025-01-12",
          description: "Pagamento de colaborador",
          category: "Pessoal",
          type: "expense",
          amount: 800,
          account: "Conta Corrente",
          status: "pending"
        }
      ];

      const mockBudget: BudgetEntry[] = [
        {
          id: "1",
          category: "Equipamentos",
          budgeted: 5000,
          spent: 2500,
          remaining: 2500,
          percentage: 50
        },
        {
          id: "2",
          category: "Despesas Operacionais",
          budgeted: 3000,
          spent: 1200,
          remaining: 1800,
          percentage: 40
        },
        {
          id: "3",
          category: "Pessoal",
          budgeted: 2000,
          spent: 800,
          remaining: 1200,
          percentage: 40
        },
        {
          id: "4",
          category: "Marketing",
          budgeted: 1000,
          spent: 0,
          remaining: 1000,
          percentage: 0
        }
      ];

      const mockAccounts: AccountBalance[] = [
        {
          id: "1",
          name: "Conta Corrente Principal",
          balance: 25300,
          type: "checking"
        },
        {
          id: "2",
          name: "Conta Poupança",
          balance: 15000,
          type: "savings"
        },
        {
          id: "3",
          name: "Dinheiro em Caixa",
          balance: 2500,
          type: "cash"
        }
      ];

      setCashFlow(mockCashFlow);
      setBudget(mockBudget);
      setAccounts(mockAccounts);
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

  const handleAddEntry = () => {
    if (!newEntry.description || !newEntry.category || !newEntry.amount || !newEntry.account) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

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
      description: "Lançamento adicionado com sucesso!",
    });
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => total + account.balance, 0);
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

  const handleAddAccount = () => {
    if (!newAccount.name || !newAccount.type) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const account: AccountBalance = {
      id: Date.now().toString(),
      ...newAccount,
    };

    setAccounts([...accounts, account]);
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
  };

  const handleRemoveAccount = (accountId: string) => {
    setAccounts(accounts.filter(account => account.id !== accountId));
    toast({
      title: "Sucesso",
      description: "Conta removida com sucesso!",
    });
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

  const handleUpdateAccount = () => {
    if (!selectedAccount || !newAccount.name || !newAccount.type) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const updatedAccounts = accounts.map(account =>
      account.id === selectedAccount.id
        ? { ...account, ...newAccount }
        : account
    );

    setAccounts(updatedAccounts);
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
  };

  const handleViewStatement = (account: AccountBalance) => {
    setSelectedAccount(account);
    setIsViewingStatement(true);
  };

  const getAccountTransactions = (accountName: string) => {
    return cashFlow.filter(entry => entry.account === accountName);
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
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="budget">Orçamento</TabsTrigger>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
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
                            <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                            <SelectItem value="Conta Poupança">Conta Poupança</SelectItem>
                            <SelectItem value="Dinheiro em Caixa">Dinheiro em Caixa</SelectItem>
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
                  {cashFlow.map((entry) => (
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

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Financeiros</CardTitle>
              <CardDescription>Análises e relatórios detalhados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                  <FileText className="h-8 w-8 mb-2" />
                  <span>Demonstrativo de Resultados</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                  <Calculator className="h-8 w-8 mb-2" />
                  <span>Fluxo de Caixa Projetado</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                  <TrendingUp className="h-8 w-8 mb-2" />
                  <span>Análise de Lucratividade</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                  <Download className="h-8 w-8 mb-2" />
                  <span>Relatório Fiscal</span>
                </Button>
              </div>
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
              <h3 className="font-medium">Movimentações</h3>
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