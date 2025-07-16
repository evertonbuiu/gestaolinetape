import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'funcionario';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userRole: 'admin' | 'funcionario' | null;
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
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: username,
        p_password: password
      });

      if (error) {
        return { error };
      }

      if (!data || data.length === 0) {
        return { error: { message: 'Credenciais inválidas' } };
      }

      const userData = data[0];
      const userSession = {
        id: userData.user_id,
        username: userData.username,
        name: userData.name,
        role: userData.role
      };

      setUser(userSession);
      localStorage.setItem('custom_auth_user', JSON.stringify(userSession));
      
      return { error: null };
    } catch (error) {
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