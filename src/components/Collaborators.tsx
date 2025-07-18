import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, UserCheck, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";

interface Collaborator {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Event {
  id: string;
  name: string;
  client_name: string;
  event_date: string;
  status: string;
}

export const Collaborators = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState({
    name: "",
    email: "",
    phone: "",
    role: "funcionario"
  });
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const { toast } = useToast();
  const { user } = useCustomAuth();

  useEffect(() => {
    fetchEvents();
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collaborators:', error);
        return;
      }

      const formattedCollaborators = data?.map(collab => ({
        id: collab.id,
        name: collab.name,
        email: collab.email,
        phone: collab.phone,
        role: collab.role === 'admin' ? 'Administrador' : 'Funcionário',
        status: collab.status as 'active' | 'inactive',
        createdAt: collab.created_at.split('T')[0]
      })) || [];

      setCollaborators(formattedCollaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, client_name, event_date, status')
        .eq('status', 'confirmed')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleAddCollaborator = async () => {
    if (!newCollaborator.name || !newCollaborator.email) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('collaborators')
        .insert({
          name: newCollaborator.name,
          email: newCollaborator.email,
          phone: newCollaborator.phone || null,
          role: newCollaborator.role,
          status: 'active',
          created_by: user.id
        })
        .select();

      if (error) {
        console.error('Error adding collaborator:', error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar colaborador",
          variant: "destructive",
        });
        return;
      }

      // Refresh the list
      await fetchCollaborators();
      
      setNewCollaborator({ name: "", email: "", phone: "", role: "funcionario" });
      setIsDialogOpen(false);
      
      toast({
        title: "Sucesso",
        description: "Colaborador adicionado com sucesso",
      });
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar colaborador",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCollaborators = collaborators.filter(collaborator =>
    collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collaborator.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (collaborator: Collaborator) => {
    // Por enquanto apenas mostra toast - implementar edição completa depois
    toast({
      title: "Editar Colaborador",
      description: `Editando: ${collaborator.name}`,
    });
  };

  const handleDelete = async (collaborator: Collaborator) => {
    if (!confirm(`Tem certeza que deseja excluir ${collaborator.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaborator.id);

      if (error) {
        console.error('Error deleting collaborator:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir colaborador",
          variant: "destructive",
        });
        return;
      }

      // Refresh the list
      await fetchCollaborators();
      
      toast({
        title: "Sucesso",
        description: `${collaborator.name} foi excluído com sucesso`,
      });
    } catch (error) {
      console.error('Error deleting collaborator:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir colaborador",
        variant: "destructive",
      });
    }
  };

  const handleAddToEvent = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setIsEventDialogOpen(true);
  };

  const handleAddCollaboratorToEvent = async () => {
    if (!selectedCollaborator || !selectedEventId) {
      toast({
        title: "Erro",
        description: "Selecione um evento",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('event_collaborators')
        .insert({
          event_id: selectedEventId,
          collaborator_name: selectedCollaborator.name,
          collaborator_email: selectedCollaborator.email,
          role: selectedCollaborator.role.toLowerCase() === 'administrador' ? 'admin' : 'funcionario',
          assigned_by: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (error) {
        console.error('Error adding collaborator to event:', error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar colaborador ao evento",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: `${selectedCollaborator.name} adicionado ao evento com sucesso`,
      });

      setIsEventDialogOpen(false);
      setSelectedCollaborator(null);
      setSelectedEventId("");
    } catch (error) {
      console.error('Error adding collaborator to event:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar colaborador ao evento",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground">Gerencie os colaboradores do sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Colaborador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do colaborador"
                  value={newCollaborator.name}
                  onChange={(e) => setNewCollaborator({...newCollaborator, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newCollaborator.email}
                  onChange={(e) => setNewCollaborator({...newCollaborator, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={newCollaborator.phone}
                  onChange={(e) => setNewCollaborator({...newCollaborator, phone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="role">Função</Label>
                <Select value={newCollaborator.role} onValueChange={(value) => setNewCollaborator({...newCollaborator, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funcionario">Funcionário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddCollaborator} disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Lista de Colaboradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar colaboradores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredCollaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{collaborator.name}</h3>
                      <Badge variant={collaborator.status === 'active' ? 'default' : 'secondary'}>
                        {collaborator.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{collaborator.email}</p>
                    {collaborator.phone && (
                      <p className="text-sm text-muted-foreground">{collaborator.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {collaborator.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddToEvent(collaborator)}
                    title="Adicionar ao evento"
                  >
                    <Calendar className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(collaborator)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(collaborator)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredCollaborators.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum colaborador encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Colaborador ao Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Colaborador</Label>
              <Input
                value={selectedCollaborator?.name || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="event">Evento</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {event.client_name} ({new Date(event.event_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsEventDialogOpen(false);
                setSelectedCollaborator(null);
                setSelectedEventId("");
              }}>
                Cancelar
              </Button>
              <Button onClick={handleAddCollaboratorToEvent}>
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};