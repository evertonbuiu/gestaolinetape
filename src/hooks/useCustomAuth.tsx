import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Hook customizado de autenticação - versão 2.0

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'funcionario' | 'financeiro' | 'deposito';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userRole: 'admin' | 'funcionario' | 'financeiro' | 'deposito' | null;
  hasPermission: (permissionName: string, accessType?: 'view' | 'edit') => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const CustomAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const storedUser = localStorage.getItem('custom_auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('custom_auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      console.log('Tentando fazer login com:', username);
      
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: username,
        p_password: password
      });

      console.log('Resposta da autenticação:', { data, error });

      if (error) {
        console.error('Erro na autenticação:', error);
        return { error };
      }

      if (!data || data.length === 0) {
        console.log('Nenhum usuário encontrado ou credenciais inválidas');
        return { error: { message: 'Credenciais inválidas' } };
      }

      const userData = data[0];
      console.log('Dados do usuário autenticado:', userData);
      
      const userSession = {
        id: userData.user_id,
        username: userData.username,
        name: userData.name,
        role: userData.role
      };

      setUser(userSession);
      localStorage.setItem('custom_auth_user', JSON.stringify(userSession));
      
      console.log('Login realizado com sucesso:', userSession);
      return { error: null };
    } catch (error) {
      console.error('Erro no processo de login:', error);
      return { error: { message: 'Erro ao fazer login' } };
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('custom_auth_user');
  };

  const hasPermission = async (permissionName: string, accessType: 'view' | 'edit' = 'view') => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase.rpc('has_permission', {
        _user_id: user.id,
        _permission_name: permissionName,
        _access_type: accessType
      });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  };

  const value = {
    user,
    isLoading,
    signIn,
    signOut,
    userRole: user?.role || null,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useCustomAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useCustomAuth must be used within a CustomAuthProvider');
  }
  return context;
};