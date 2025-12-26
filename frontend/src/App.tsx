import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CompanyProvider } from './contexts/CompanyContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Toaster } from './components/ui/toaster'
import { Spinner, Flex } from '@chakra-ui/react'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CompaniesPage from './pages/CompaniesPage'
import AccountsPage from './pages/AccountsPage'
import CounterpartsPage from './pages/CounterpartsPage'
import JournalEntriesPage from './pages/JournalEntriesPage'
import FixedAssetsPage from './pages/FixedAssetsPage'
import VatRatesPage from './pages/VatRatesPage'
import VatReturnsPage from './pages/VatReturnsPage'
import VatFilesPage from './pages/VatFilesPage'
import ReportsPage from './pages/ReportsPage'
import CurrenciesPage from './pages/CurrenciesPage'
import ProductsPage from './pages/ProductsPage'
import DocumentScannerPage from './pages/DocumentScannerPage'
import ScannedInvoicesPage from './pages/ScannedInvoicesPage'
import ScannedInvoiceReviewPage from './pages/ScannedInvoiceReviewPage'
import SettingsPage from './pages/SettingsPage'
import AccountingPeriodsPage from './pages/AccountingPeriodsPage'
import CurrencyRevaluationPage from './pages/CurrencyRevaluationPage'
import BankAccountsPage from './pages/BankAccountsPage'
import BankTransactionsPage from './pages/BankTransactionsPage'
import ProfilePage from './pages/ProfilePage'
import OpeningBalancesPage from './pages/OpeningBalancesPage'
import UserCompaniesPage from './pages/UserCompaniesPage'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="xl" />
      </Flex>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Public route - redirects to dashboard if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="xl" />
      </Flex>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="bank-accounts" element={<BankAccountsPage />} />
        <Route path="bank-accounts/:id/transactions" element={<BankTransactionsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="accounting-periods" element={<AccountingPeriodsPage />} />
        <Route path="currency-revaluation" element={<CurrencyRevaluationPage />} />
        <Route path="counterparts" element={<CounterpartsPage />} />
        <Route path="journal-entries" element={<JournalEntriesPage />} />
        <Route path="opening-balances" element={<OpeningBalancesPage />} />
        <Route path="fixed-assets" element={<FixedAssetsPage />} />
        <Route path="vat-rates" element={<VatRatesPage />} />
        <Route path="vat-returns" element={<VatReturnsPage />} />
        <Route path="vat-files" element={<VatFilesPage />} />
        <Route path="scanner" element={<DocumentScannerPage />} />
        <Route path="scanned-invoices" element={<ScannedInvoicesPage />} />
        <Route path="scanned-invoices/:id/review" element={<ScannedInvoiceReviewPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="currencies" element={<CurrenciesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="user-companies" element={<UserCompaniesPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <SidebarProvider>
            <CompanyProvider>
              <Toaster />
              <AppRoutes />
            </CompanyProvider>
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
