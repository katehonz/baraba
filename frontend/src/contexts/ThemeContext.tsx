import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('baraba-theme-mode');
    return (saved as ThemeMode) || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateResolvedTheme = () => {
      let mode: 'light' | 'dark';
      if (themeMode === 'system') {
        mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        mode = themeMode;
      }
      setResolvedTheme(mode);
      
      // Sync with Chakra UI v3
      document.documentElement.dataset.mode = mode;
      document.documentElement.style.colorScheme = mode;
    };

    updateResolvedTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateResolvedTheme);
      return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
    }
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('baraba-theme-mode', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(current => current === 'light' ? 'dark' : 'light');
  };

  const value = {
    themeMode,
    resolvedTheme,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const eyeFriendlyTheme = {
  colors: {
    // Light theme colors - Slate palette (Soft White)
    light: {
      bg: {
        primary: '#F8FAFC',      // Slate 50
        secondary: '#F1F5F9',    // Slate 100
        tertiary: '#E2E8F0',     // Slate 200
        sidebar: '#FFFFFF',      // White
        header: '#FFFFFF',       // White
        card: '#FFFFFF',         // White
        hover: '#F1F5F9',        // Slate 100
        border: '#E2E8F0',       // Slate 200
      },
      text: {
        primary: '#334155',      // Slate 700
        secondary: '#475569',    // Slate 600
        tertiary: '#64748B',     // Slate 500
        muted: '#94A3B8',        // Slate 400
        inverse: '#FFFFFF',      // White
      },
      accent: {
        primary: '#3B82F6',      // Blue 500
        primaryHover: '#2563EB', // Blue 600
        secondary: '#10B981',    // Emerald 500
        secondaryHover: '#059669', // Emerald 600
        danger: '#EF4444',       // Red 500
        warning: '#F59E0B',      // Amber 500
      },
      shadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      }
    },
    
    // Dark theme colors - Slate palette (Deep Blue/Grey)
    dark: {
      bg: {
        primary: '#0F172A',      // Slate 900
        secondary: '#1E293B',    // Slate 800
        tertiary: '#334155',     // Slate 700
        sidebar: '#1E293B',      // Slate 800
        header: '#1E293B',       // Slate 800
        card: '#1E293B',         // Slate 800
        hover: '#334155',        // Slate 700
        border: '#334155',       // Slate 700
      },
      text: {
        primary: '#F8FAFC',      // Slate 50
        secondary: '#CBD5E1',    // Slate 300
        tertiary: '#94A3B8',     // Slate 400
        muted: '#64748B',        // Slate 500
        inverse: '#0F172A',      // Slate 900
      },
      accent: {
        primary: '#60A5FA',      // Blue 400
        primaryHover: '#3B82F6', // Blue 500
        secondary: '#34D399',    // Emerald 400
        secondaryHover: '#10B981', // Emerald 500
        danger: '#F87171',       // Red 400
        warning: '#FBBF24',      // Amber 400
      },
      shadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
      }
    }
  },
  
  // Semantic color accessors
  getColor: (theme: 'light' | 'dark', path: string) => {
    const paths = path.split('.');
    let value: any = eyeFriendlyTheme.colors[theme as keyof typeof eyeFriendlyTheme.colors];
    
    for (const p of paths) {
      value = value?.[p];
    }
    
    return value || '#000000';
  }
};

export const createThemeStyles = (resolvedTheme: 'light' | 'dark') => {
  const colors = eyeFriendlyTheme.colors[resolvedTheme as keyof typeof eyeFriendlyTheme.colors];
  
  return {
    // Background styles
    bgPage: { bg: colors.bg.primary },
    bgSecondary: { bg: colors.bg.secondary },
    bgSidebar: { bg: colors.bg.sidebar },
    bgHeader: { bg: colors.bg.header },
    bgCard: { bg: colors.bg.card, boxShadow: eyeFriendlyTheme.colors[resolvedTheme].shadow.md },
    bgHover: { bg: colors.bg.hover },
    
    // Text styles
    textPrimary: { color: colors.text.primary },
    textSecondary: { color: colors.text.secondary },
    textMuted: { color: colors.text.muted },
    textInverse: { color: colors.text.inverse },
    
    // Accent styles
    accentPrimary: { color: colors.accent.primary },
    accentPrimaryBg: { bg: colors.accent.primary, color: 'white' },
    accentSecondary: { color: colors.accent.secondary },
    
    // Border styles
    border: { borderColor: colors.bg.border },
    
    // Shadow styles
    shadow: { boxShadow: eyeFriendlyTheme.colors[resolvedTheme].shadow.md },
  } as const;
};