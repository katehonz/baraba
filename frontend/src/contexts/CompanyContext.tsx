import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Company } from '../types';

interface CompanyContextType {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  companyId: number | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(() => {
    const saved = localStorage.getItem('currentCompany');
    return saved ? JSON.parse(saved) : null;
  });

  const handleSetCompany = (company: Company | null) => {
    setCurrentCompany(company);
    if (company) {
      localStorage.setItem('currentCompany', JSON.stringify(company));
    } else {
      localStorage.removeItem('currentCompany');
    }
  };

  return (
    <CompanyContext.Provider value={{ currentCompany, setCurrentCompany: handleSetCompany, companyId: currentCompany?.id ?? null }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
