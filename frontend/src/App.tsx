import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import HomePage from './pages/HomePage';
import CompaniesPage from './pages/companies/CompaniesPage';
import AccountsPage from './pages/accounts/AccountsPage';
import CounterpartsPage from './pages/counterparts/CounterpartsPage';
import JournalPage from './pages/journal/JournalPage';

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
        <Route path="journal" element={<JournalPage />} />
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
