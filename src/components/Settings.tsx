import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Settings2, Shield, Eye, Edit3, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SettingsPage = () => {
  const { userRole } = useAuth();
  const { rolePermissions, loading, updateRolePermission } = usePermissions();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});

  // Group permissions by category
  const groupedPermissions = rolePermissions.reduce((acc, rp) => {
    if (!rp.permission) return acc;
    
    const category = rp.permission.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(rp);
    return acc;
  }, {} as Record<string, typeof rolePermissions>);

  // Handle permission change
  const handlePermissionChange = (permissionId: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setChanges(prev => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        [field]: value
      }
    }));
  };

  // Get current permission value (considering pending changes)
  const getCurrentValue = (rp: any, field: 'can_view' | 'can_edit') => {
    return changes[rp.id]?.[field] ?? rp[field];
  };

  // Save all changes
  const saveChanges = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(changes).map(([permissionId, values]) => {
        const rp = rolePermissions.find(p => p.id === permissionId);
        if (!rp) return Promise.resolve();
        
        return updateRolePermission(
          permissionId,
          values.can_view ?? rp.can_view,
          values.can_edit ?? rp.can_edit
        );
      });

      await Promise.all(promises);
      setChanges({});
      
      toast({
        title: "Permissões atualizadas",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as permissões.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Check if there are pending changes
  const hasChanges = Object.keys(changes).length > 0;

  if (userRole !== 'admin') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Apenas administradores podem acessar as configurações do sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            Configurações
          </h2>
          <p className="text-muted-foreground">
            Gerencie as permissões dos funcionários
          </p>
        </div>
        
        {hasChanges && (
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissões dos Funcionários</CardTitle>
          <CardDescription>
            Configure o que os funcionários podem visualizar e editar no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedPermissions).map(([category, permissions]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{category}</h3>
                <Badge variant="outline">{permissions.length} permissões</Badge>
              </div>
              
              <div className="grid gap-4">
                {permissions
                  .filter(rp => rp.role === 'funcionario')
                  .map((rp) => (
                    <Card key={rp.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{rp.permission.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            {rp.permission.name}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Visualizar</span>
                            <Switch
                              checked={getCurrentValue(rp, 'can_view')}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(rp.id, 'can_view', checked)
                              }
                            />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Editar</span>
                            <Switch
                              checked={getCurrentValue(rp, 'can_edit')}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(rp.id, 'can_edit', checked)
                              }
                              disabled={!getCurrentValue(rp, 'can_view')}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
              
              {category !== Object.keys(groupedPermissions)[Object.keys(groupedPermissions).length - 1] && (
                <Separator />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Administradores sempre têm acesso total a todas as funcionalidades</p>
            <p>• Para editar, o funcionário precisa ter permissão de visualização</p>
            <p>• As alterações entram em vigor imediatamente após salvar</p>
            <p>• Funcionários precisam fazer logout/login para ver as novas permissões</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};