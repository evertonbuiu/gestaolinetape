import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Users, 
  Edit3, 
  Shield, 
  Loader2, 
  Save, 
  X, 
  User,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  name: string;
  is_active: boolean;
  created_at: string;
  role?: 'admin' | 'funcionario' | 'financeiro' | 'deposito';
}

interface UserPermission {
  permission_id: string;
  permission_name: string;
  permission_category: string;
  can_view: boolean;
  can_edit: boolean;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [permissionChanges, setPermissionChanges] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { toast } = useToast();
  const { userRole } = useCustomAuth();
  const { permissions } = usePermissions();

  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'funcionario' as 'admin' | 'funcionario' | 'financeiro' | 'deposito',
    is_active: true
  });

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get user credentials
      const { data: credentials, error: credError } = await supabase
        .from('user_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (credError) throw credError;

      // Get user roles
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (roleError) throw roleError;

      // Combine data
      const usersWithRoles = credentials.map(user => ({
        ...user,
        role: roles.find(r => r.user_id === user.id)?.role || 'funcionario'
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch user permissions
  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permission_id,
          can_view,
          can_edit,
          permission:permissions(name, category)
        `)
        .eq('role', users.find(u => u.id === userId)?.role || 'funcionario');

      if (error) throw error;

      const formattedPermissions = data.map(item => ({
        permission_id: item.permission_id,
        permission_name: item.permission.name,
        permission_category: item.permission.category,
        can_view: item.can_view,
        can_edit: item.can_edit
      }));

      setUserPermissions(formattedPermissions);
      setPermissionChanges({});
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      toast({
        title: "Erro ao carregar permissões",
        description: "Não foi possível carregar as permissões do usuário.",
        variant: "destructive"
      });
    }
  };

  // Update user data
  const updateUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      // Update user credentials
      const updateData: any = {
        name: editForm.name,
        username: editForm.username,
        is_active: editForm.is_active
      };

      if (editForm.password) {
        updateData.password_hash = editForm.password;
      }

      const { error: credError } = await supabase
        .from('user_credentials')
        .update(updateData)
        .eq('id', editingUser.id);

      if (credError) throw credError;

      // Update user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editForm.role })
        .eq('user_id', editingUser.id);

      if (roleError) throw roleError;

      await fetchUsers();
      setEditingUser(null);
      
      toast({
        title: "Usuário atualizado",
        description: "Os dados do usuário foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro ao atualizar usuário",
        description: "Não foi possível atualizar os dados do usuário.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Save permission changes
  const savePermissionChanges = async () => {
    if (!editingPermissions) return;

    setSaving(true);
    try {
      const promises = Object.entries(permissionChanges).map(([permissionId, values]) => {
        return supabase
          .from('role_permissions')
          .update({
            can_view: values.can_view,
            can_edit: values.can_edit
          })
          .eq('role', editingPermissions.role)
          .eq('permission_id', permissionId);
      });

      await Promise.all(promises);
      
      toast({
        title: "Permissões atualizadas",
        description: "As permissões foram atualizadas com sucesso.",
      });
      
      setEditingPermissions(null);
      setPermissionChanges({});
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Erro ao atualizar permissões",
        description: "Não foi possível atualizar as permissões.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role || 'funcionario',
      is_active: user.is_active
    });
  };

  // Handle edit permissions
  const handleEditPermissions = async (user: User) => {
    setEditingPermissions(user);
    await fetchUserPermissions(user.id);
  };

  // Handle permission change
  const handlePermissionChange = (permissionId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setPermissionChanges(prev => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        [field]: value
      }
    }));
  };

  // Get current permission value
  const getCurrentPermissionValue = (permission: UserPermission, field: 'can_view' | 'can_edit') => {
    return permissionChanges[permission.permission_id]?.[field] ?? permission[field];
  };

  // Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'financeiro': return 'Financeiro';
      case 'funcionario': return 'Funcionário';
      case 'deposito': return 'Depósito';
      default: return role;
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'financeiro': return 'default';
      case 'funcionario': return 'secondary';
      case 'deposito': return 'outline';
      default: return 'secondary';
    }
  };

  // Group permissions by category
  const groupedPermissions = userPermissions.reduce((acc, perm) => {
    if (!acc[perm.permission_category]) {
      acc[perm.permission_category] = [];
    }
    acc[perm.permission_category].push(perm);
    return acc;
  }, {} as Record<string, UserPermission[]>);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole]);

  if (userRole !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mr-2" />
              <p>Apenas administradores podem gerenciar usuários.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gerenciar Usuários
          </h2>
          <p className="text-muted-foreground">
            Gerencie usuários cadastrados e suas permissões
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleColor(user.role || 'funcionario')}>
                        {getRoleLabel(user.role || 'funcionario')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'destructive'}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPermissions(user)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Permissões
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-username">Nome de Usuário</Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-password">Nova Senha (deixe vazio para manter atual)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-role">Função</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: 'admin' | 'funcionario' | 'financeiro' | 'deposito') => 
                  setEditForm({ ...editForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
              <Label htmlFor="edit-active">Usuário ativo</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button onClick={updateUser} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingPermissions} onOpenChange={() => setEditingPermissions(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Permissões - {editingPermissions?.name} ({getRoleLabel(editingPermissions?.role || 'funcionario')})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold">{category}</h3>
                <div className="space-y-2">
                  {perms.map((permission) => (
                    <div key={permission.permission_id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{permission.permission_name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`view-${permission.permission_id}`}
                            checked={getCurrentPermissionValue(permission, 'can_view')}
                            onCheckedChange={(checked) => handlePermissionChange(permission.permission_id, 'can_view', checked)}
                          />
                          <Label htmlFor={`view-${permission.permission_id}`}>Visualizar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`edit-${permission.permission_id}`}
                            checked={getCurrentPermissionValue(permission, 'can_edit')}
                            onCheckedChange={(checked) => handlePermissionChange(permission.permission_id, 'can_edit', checked)}
                          />
                          <Label htmlFor={`edit-${permission.permission_id}`}>Editar</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setEditingPermissions(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={savePermissionChanges} 
              disabled={saving || Object.keys(permissionChanges).length === 0}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Permissões
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};