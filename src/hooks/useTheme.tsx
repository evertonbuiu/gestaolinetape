import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarAccent: string;
}

interface ThemeContextType {
  theme: Theme;
  colorScheme: string;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: string) => void;
  availableColorSchemes: ColorScheme[];
  applyColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Dark theme color schemes
const darkColorSchemes: ColorScheme[] = [
  {
    id: 'blue',
    name: 'Azul Padrão',
    primary: '220 60% 6%',
    secondary: '220 40% 15%',
    accent: '220 40% 15%',
    background: '220 60% 6%',
    foreground: '210 40% 98%',
    card: '220 50% 8%',
    cardForeground: '210 40% 98%',
    muted: '220 40% 15%',
    mutedForeground: '215 20.2% 65.1%',
    border: '220 40% 15%',
    sidebarBackground: '220 70% 8%',
    sidebarForeground: '210 40% 95%',
    sidebarAccent: '220 50% 12%',
  },
  {
    id: 'green',
    name: 'Verde Escuro',
    primary: '120 60% 6%',
    secondary: '120 40% 15%',
    accent: '120 40% 15%',
    background: '120 60% 6%',
    foreground: '120 40% 98%',
    card: '120 50% 8%',
    cardForeground: '120 40% 98%',
    muted: '120 40% 15%',
    mutedForeground: '115 20.2% 65.1%',
    border: '120 40% 15%',
    sidebarBackground: '120 70% 8%',
    sidebarForeground: '120 40% 95%',
    sidebarAccent: '120 50% 12%',
  },
  {
    id: 'purple',
    name: 'Roxo Escuro',
    primary: '270 60% 6%',
    secondary: '270 40% 15%',
    accent: '270 40% 15%',
    background: '270 60% 6%',
    foreground: '270 40% 98%',
    card: '270 50% 8%',
    cardForeground: '270 40% 98%',
    muted: '270 40% 15%',
    mutedForeground: '265 20.2% 65.1%',
    border: '270 40% 15%',
    sidebarBackground: '270 70% 8%',
    sidebarForeground: '270 40% 95%',
    sidebarAccent: '270 50% 12%',
  },
  {
    id: 'red',
    name: 'Vermelho Escuro',
    primary: '0 60% 6%',
    secondary: '0 40% 15%',
    accent: '0 40% 15%',
    background: '0 60% 6%',
    foreground: '0 40% 98%',
    card: '0 50% 8%',
    cardForeground: '0 40% 98%',
    muted: '0 40% 15%',
    mutedForeground: '15 20.2% 65.1%',
    border: '0 40% 15%',
    sidebarBackground: '0 70% 8%',
    sidebarForeground: '0 40% 95%',
    sidebarAccent: '0 50% 12%',
  },
  {
    id: 'orange',
    name: 'Laranja Escuro',
    primary: '30 60% 6%',
    secondary: '30 40% 15%',
    accent: '30 40% 15%',
    background: '30 60% 6%',
    foreground: '30 40% 98%',
    card: '30 50% 8%',
    cardForeground: '30 40% 98%',
    muted: '30 40% 15%',
    mutedForeground: '25 20.2% 65.1%',
    border: '30 40% 15%',
    sidebarBackground: '30 70% 8%',
    sidebarForeground: '30 40% 95%',
    sidebarAccent: '30 50% 12%',
  },
  {
    id: 'slate',
    name: 'Cinza Escuro',
    primary: '222.2 84% 4.9%',
    secondary: '217.2 32.6% 17.5%',
    accent: '217.2 32.6% 17.5%',
    background: '222.2 84% 4.9%',
    foreground: '210 40% 98%',
    card: '222.2 84% 4.9%',
    cardForeground: '210 40% 98%',
    muted: '217.2 32.6% 17.5%',
    mutedForeground: '215 20.2% 65.1%',
    border: '217.2 32.6% 17.5%',
    sidebarBackground: '240 5.9% 10%',
    sidebarForeground: '240 4.8% 95.9%',
    sidebarAccent: '240 3.7% 15.9%',
  },
];

// Light theme color schemes
const lightColorSchemes: ColorScheme[] = [
  {
    id: 'blue',
    name: 'Azul Padrão',
    primary: '222.2 47.4% 11.2%',
    secondary: '210 40% 96.1%',
    accent: '210 40% 96.1%',
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    card: '0 0% 100%',
    cardForeground: '222.2 84% 4.9%',
    muted: '210 40% 96.1%',
    mutedForeground: '215.4 16.3% 46.9%',
    border: '214.3 31.8% 91.4%',
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '240 5.3% 26.1%',
    sidebarAccent: '240 4.8% 95.9%',
  },
  {
    id: 'green',
    name: 'Verde Claro',
    primary: '142.1 76.2% 36.3%',
    secondary: '120 16.7% 97.6%',
    accent: '120 16.7% 97.6%',
    background: '0 0% 100%',
    foreground: '120 10% 4%',
    card: '0 0% 100%',
    cardForeground: '120 10% 4%',
    muted: '120 16.7% 97.6%',
    mutedForeground: '120 3.7% 45.1%',
    border: '120 5.9% 90%',
    sidebarBackground: '120 33% 98%',
    sidebarForeground: '120 5.3% 26.1%',
    sidebarAccent: '120 4.8% 95.9%',
  },
  {
    id: 'purple',
    name: 'Roxo Claro',
    primary: '262.1 83.3% 57.8%',
    secondary: '270 20% 96%',
    accent: '270 20% 96%',
    background: '0 0% 100%',
    foreground: '224 71.4% 4.1%',
    card: '0 0% 100%',
    cardForeground: '224 71.4% 4.1%',
    muted: '270 20% 96%',
    mutedForeground: '220 8.9% 46.1%',
    border: '220 13% 91%',
    sidebarBackground: '266 83% 99%',
    sidebarForeground: '224 10% 25%',
    sidebarAccent: '270 20% 96%',
  },
  {
    id: 'red',
    name: 'Vermelho Claro',
    primary: '0 72.2% 50.6%',
    secondary: '0 96% 89%',
    accent: '0 96% 89%',
    background: '0 0% 100%',
    foreground: '0 0% 9%',
    card: '0 0% 100%',
    cardForeground: '0 0% 9%',
    muted: '0 96% 89%',
    mutedForeground: '0 10% 44%',
    border: '0 91% 82%',
    sidebarBackground: '0 100% 98%',
    sidebarForeground: '0 20% 30%',
    sidebarAccent: '0 96% 89%',
  },
  {
    id: 'orange',
    name: 'Laranja Claro',
    primary: '24.6 95% 53.1%',
    secondary: '30 100% 97%',
    accent: '30 100% 97%',
    background: '0 0% 100%',
    foreground: '20 14.3% 4.1%',
    card: '0 0% 100%',
    cardForeground: '20 14.3% 4.1%',
    muted: '30 100% 97%',
    mutedForeground: '20 5.9% 44.1%',
    border: '20 5.9% 90%',
    sidebarBackground: '30 50% 98%',
    sidebarForeground: '20 10% 30%',
    sidebarAccent: '30 100% 97%',
  },
  {
    id: 'slate',
    name: 'Cinza Claro',
    primary: '222.2 47.4% 11.2%',
    secondary: '210 40% 96.1%',
    accent: '210 40% 96.1%',
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    card: '0 0% 100%',
    cardForeground: '222.2 84% 4.9%',
    muted: '210 40% 96.1%',
    mutedForeground: '215.4 16.3% 46.9%',
    border: '214.3 31.8% 91.4%',
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '240 5.3% 26.1%',
    sidebarAccent: '240 4.8% 95.9%',
  },
];

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [colorScheme, setColorScheme] = useState<string>('blue');

  // Get active color schemes based on current theme
  const getActiveSchemes = () => {
    return theme === 'dark' ? darkColorSchemes : lightColorSchemes;
  };

  const applyColorScheme = (scheme: ColorScheme) => {
    const root = document.documentElement;
    
    // Apply color scheme regardless of theme
    root.style.setProperty('--background', scheme.background);
    root.style.setProperty('--foreground', scheme.foreground);
    root.style.setProperty('--card', scheme.card);
    root.style.setProperty('--card-foreground', scheme.cardForeground);
    root.style.setProperty('--secondary', scheme.secondary);
    root.style.setProperty('--secondary-foreground', scheme.foreground);
    root.style.setProperty('--muted', scheme.muted);
    root.style.setProperty('--muted-foreground', scheme.mutedForeground);
    root.style.setProperty('--accent', scheme.accent);
    root.style.setProperty('--accent-foreground', scheme.foreground);
    root.style.setProperty('--border', scheme.border);
    root.style.setProperty('--input', scheme.border);
    root.style.setProperty('--sidebar-background', scheme.sidebarBackground);
    root.style.setProperty('--sidebar-foreground', scheme.sidebarForeground);
    root.style.setProperty('--sidebar-accent', scheme.sidebarAccent);
    root.style.setProperty('--sidebar-accent-foreground', scheme.sidebarForeground);
    root.style.setProperty('--sidebar-border', scheme.sidebarAccent);
    
    // Also apply primary since it's important for the theme
    root.style.setProperty('--primary', scheme.primary);
    root.style.setProperty('--primary-foreground', scheme.foreground);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    
    // Apply current color scheme to new theme, using the appropriate theme-specific scheme
    const schemes = newTheme === 'dark' ? darkColorSchemes : lightColorSchemes;
    const currentScheme = schemes.find(s => s.id === colorScheme);
    
    if (currentScheme) {
      applyColorScheme(currentScheme);
    }
  };

  const handleColorSchemeChange = (schemeId: string) => {
    setColorScheme(schemeId);
    const schemes = theme === 'dark' ? darkColorSchemes : lightColorSchemes;
    const scheme = schemes.find(s => s.id === schemeId);
    
    if (scheme) {
      applyColorScheme(scheme);
    }
  };

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'dark';
    const savedColorScheme = localStorage.getItem('colorScheme') || 'blue';
    
    setTheme(savedTheme);
    setColorScheme(savedColorScheme);
    
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    
    const schemes = savedTheme === 'dark' ? darkColorSchemes : lightColorSchemes;
    const scheme = schemes.find(s => s.id === savedColorScheme);
    
    if (scheme) {
      applyColorScheme(scheme);
    }
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorScheme,
        setTheme: handleThemeChange,
        setColorScheme: handleColorSchemeChange,
        availableColorSchemes: getActiveSchemes(),
        applyColorScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};