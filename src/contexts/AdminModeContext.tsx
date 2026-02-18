import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminModeContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  setAdminMode: (value: boolean) => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

const ADMIN_MODE_KEY = 'pmtb_admin_mode';

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    const stored = localStorage.getItem(ADMIN_MODE_KEY);
    // Default to true (admin mode on) when no value has been stored yet
    if (stored === null) return true;
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(ADMIN_MODE_KEY, String(isAdminMode));
  }, [isAdminMode]);

  const toggleAdminMode = () => {
    setIsAdminMode((prev) => !prev);
  };

  const setAdminMode = (value: boolean) => {
    setIsAdminMode(value);
  };

  return (
    <AdminModeContext.Provider value={{ isAdminMode, toggleAdminMode, setAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
}
