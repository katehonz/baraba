import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RecoverPasswordPage from './pages/auth/RecoverPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import HomePage from './pages/HomePage';
import CompaniesPage from './pages/companies/CompaniesPage';
import AccountsPage from './pages/accounts/AccountsPage';
import CounterpartsPage from './pages/counterparts/CounterpartsPage';
import JournalDashboardPage from './pages/journal/JournalDashboardPage';
import JournalEntriesPage from './pages/journal/JournalEntriesPage';
import JournalEntryFormPage from './pages/journal/JournalEntryFormPage';
import ReportsPage from './pages/reports/ReportsPage';
import CounterpartyReportsPage from './pages/reports/CounterpartyReportsPage';
import AuditLogsPage from './pages/reports/AuditLogsPage';
import MonthlyStatsPage from './pages/reports/MonthlyStatsPage';
import SettingsPage from './pages/settings/SettingsPage';
import CurrenciesPage from './pages/settings/CurrenciesPage';
import VatRatesPage from './pages/settings/VatRatesPage';
import UsersPage from './pages/settings/UsersPage';
import BanksPage from './pages/banks/BanksPage';
import DocumentScannerPage from './pages/scanner/DocumentScannerPage';
import ScannedInvoicesPage from './pages/scanner/ScannedInvoicesPage';
import VATEntryPage from './pages/vat/VATEntryPage';
import VatReturnsPage from './pages/vat/VatReturnsPage';
import MyProfilePage from './pages/profile/MyProfilePage';
import FixedAssetsPage from './pages/fixed-assets/FixedAssetsPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center h="100vh">
        <VStack>
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text color="gray.500">Зареждане...</Text>
        </VStack>
      </Center>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/recover-password" element={<RecoverPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="counterparts" element={<CounterpartsPage />} />
        <Route path="journal" element={<JournalDashboardPage />} />
        <Route path="journal/entries" element={<JournalEntriesPage />} />
        <Route path="journal/entries/new" element={<JournalEntryFormPage />} />
        <Route path="journal/entries/edit/:id" element={<JournalEntryFormPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/counterparts" element={<CounterpartyReportsPage />} />
        <Route path="reports/audit-logs" element={<AuditLogsPage />} />
        <Route path="reports/monthly-stats" element={<MonthlyStatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/currencies" element={<CurrenciesPage />} />
        <Route path="settings/vat-rates" element={<VatRatesPage />} />
        <Route path="settings/users" element={<UsersPage />} />
        <Route path="banks" element={<BanksPage />} />
        <Route path="scanner" element={<DocumentScannerPage />} />
        <Route path="scanner/invoices" element={<ScannedInvoicesPage />} />
        <Route path="vat/entry" element={<VATEntryPage />} />
        <Route path="vat/entry/:id" element={<VATEntryPage />} />
        <Route path="vat/returns" element={<VatReturnsPage />} />
        <Route path="fixed-assets" element={<FixedAssetsPage />} />
        <Route path="profile" element={<MyProfilePage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <AppRoutes />
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
