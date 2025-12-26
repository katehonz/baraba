import { Box, VStack, Text, Flex, IconButton } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  FiHome,
  FiUsers,
  FiUser,
  FiBook,
  FiFileText,
  FiDollarSign,
  FiTruck,
  FiPercent,
  FiClipboard,
  FiSettings,
  FiPieChart,
  FiBox,
  FiCamera,
  FiList,
  FiChevronLeft,
  FiChevronRight,
  FiSun,
  FiMoon,
  FiCalendar,
  FiRefreshCw,
  FiCreditCard,
  FiLogOut,
  FiLink
} from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useSidebar } from '../contexts/SidebarContext'
import { useTheme } from '../contexts/ThemeContext'
import { createThemeStyles } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

interface NavItemProps {
  icon: any
  labelKey: string
  to: string
  isCollapsed: boolean
}

function NavItem({ icon: Icon, labelKey, to, isCollapsed }: NavItemProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const styles = createThemeStyles(resolvedTheme)
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))

  return (
    <NavLink to={to} style={{ width: '100%', textDecoration: 'none' }}>
      <Flex
        align="center"
        px={isCollapsed ? 3 : 4}
        py={3}
        cursor="pointer"
        bg={isActive ? styles.accentPrimaryBg.bg : 'transparent'}
        color={isActive ? styles.accentPrimaryBg.color : styles.textSecondary.color}
        _hover={{ 
          bg: isActive ? styles.accentPrimaryBg.bg : styles.bgHover.bg 
        }}
        borderRadius="md"
        transition="all 0.2s"
        justify={isCollapsed ? 'center' : 'flex-start'}
      >
        <Icon style={{ 
          marginRight: isCollapsed ? '0' : '12px', 
          width: '20px', 
          height: '20px',
          flexShrink: 0
        }} />
        {!isCollapsed && (
          <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'medium'} whiteSpace="nowrap">
            {t(labelKey)}
          </Text>
        )}
      </Flex>
    </NavLink>
  )
}

interface NavSectionProps {
  titleKey: string
  children: React.ReactNode
  isCollapsed: boolean
}

function NavSection({ titleKey, children, isCollapsed }: NavSectionProps) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const styles = createThemeStyles(resolvedTheme)

  if (isCollapsed) {
    return <>{children}</>
  }

  return (
    <>
      <Text px={4} fontSize="xs" color={styles.textMuted.color} fontWeight="bold" mb={2}>
        {t(titleKey)}
      </Text>
      {children}
    </>
  )
}

function Sidebar() {
  const { t } = useTranslation()
  const { isCollapsed, toggleSidebar } = useSidebar()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const styles = createThemeStyles(resolvedTheme)

  return (
    <Box
      w={isCollapsed ? '70px' : '250px'}
      minW={isCollapsed ? '70px' : '250px'}
      {...styles.bgSidebar}
      py={4}
      px={3}
      display="flex"
      flexDirection="column"
      h="100vh"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      borderRight="1px solid"
      {...styles.border}
    >
      {/* Header with collapse toggle and theme toggle */}
      <Box px={2} mb={6}>
        <Flex justify="space-between" align="center">
          {!isCollapsed && (
            <Box>
              <Text fontSize="xl" fontWeight="bold" {...styles.accentPrimary}>
                Baraba
              </Text>
              <Text fontSize="xs" {...styles.textMuted}>
                {t('accountingSystem')}
              </Text>
            </Box>
          )}
          <VStack gap={1}>
            <IconButton
              aria-label={t('toggleSidebar')}
              size="sm"
              variant="ghost"
              onClick={toggleSidebar}
              {...styles.textSecondary}
              _hover={{ ...styles.bgHover }}
            >
              {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
            </IconButton>
            <IconButton
              aria-label={t('toggleTheme')}
              size="sm"
              variant="ghost"
              onClick={toggleTheme}
              {...styles.textSecondary}
              _hover={{ ...styles.bgHover }}
            >
              {resolvedTheme === 'light' ? <FiMoon /> : <FiSun />}
            </IconButton>
          </VStack>
        </Flex>
      </Box>

      {/* Navigation Items */}
      <VStack gap={2} align="stretch" flex="1" overflowY="auto">
        <NavSection titleKey="main" isCollapsed={isCollapsed}>
          <NavItem icon={FiHome} labelKey="dashboard" to="/" isCollapsed={isCollapsed} />
          <NavItem icon={FiUsers} labelKey="companies" to="/companies" isCollapsed={isCollapsed} />
          <NavItem icon={FiLink} labelKey="userCompaniesMenu" to="/user-companies" isCollapsed={isCollapsed} />
          <NavItem icon={FiBox} labelKey="products" to="/products" isCollapsed={isCollapsed} />
          <NavItem icon={FiCalendar} labelKey="accountingPeriods" to="/accounting-periods" isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection titleKey="accounting" isCollapsed={isCollapsed}>
          <NavItem icon={FiBook} labelKey="chartOfAccounts" to="/accounts" isCollapsed={isCollapsed} />
          <NavItem icon={FiCreditCard} labelKey="bankAccounts" to="/bank-accounts" isCollapsed={isCollapsed} />
          <NavItem icon={FiFileText} labelKey="journalEntries" to="/journal-entries" isCollapsed={isCollapsed} />
          <NavItem icon={FiList} labelKey="openingBalancesMenu" to="/opening-balances" isCollapsed={isCollapsed} />
          <NavItem icon={FiUsers} labelKey="counterparts" to="/counterparts" isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection titleKey="assetsAndVat" isCollapsed={isCollapsed}>
          <NavItem icon={FiTruck} labelKey="fixedAssets" to="/fixed-assets" isCollapsed={isCollapsed} />
          <NavItem icon={FiPercent} labelKey="vatRatesMenu" to="/vat-rates" isCollapsed={isCollapsed} />
          <NavItem icon={FiClipboard} labelKey="vatReturns" to="/vat-returns" isCollapsed={isCollapsed} />
          <NavItem icon={FiFileText} labelKey="vatFiles" to="/vat-files" isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection titleKey="aiScanning" isCollapsed={isCollapsed}>
          <NavItem icon={FiCamera} labelKey="scanner" to="/scanner" isCollapsed={isCollapsed} />
          <NavItem icon={FiList} labelKey="scannedInvoices" to="/scanned-invoices" isCollapsed={isCollapsed} />
        </NavSection>

        <NavSection titleKey="reporting" isCollapsed={isCollapsed}>
          <NavItem icon={FiPieChart} labelKey="reports" to="/reports" isCollapsed={isCollapsed} />
          <NavItem icon={FiDollarSign} labelKey="currenciesMenu" to="/currencies" isCollapsed={isCollapsed} />
          <NavItem icon={FiRefreshCw} labelKey="currencyRevaluations" to="/currency-revaluation" isCollapsed={isCollapsed} />
        </NavSection>
      </VStack>

      {/* Settings and User at bottom */}
      <Box mt="auto" pt={4} borderTop="1px solid" {...styles.border}>
        <NavItem icon={FiSettings} labelKey="settings" to="/settings" isCollapsed={isCollapsed} />
        <NavItem icon={FiUser} labelKey="profile" to="/profile" isCollapsed={isCollapsed} />

        {/* User info and logout */}
        {user && (
          <Box mt={2}>
            {!isCollapsed && (
              <Text px={4} fontSize="xs" {...styles.textMuted} mb={1}>
                {user.username}
              </Text>
            )}
            <Flex
              align="center"
              px={isCollapsed ? 3 : 4}
              py={3}
              cursor="pointer"
              color={styles.textSecondary.color}
              _hover={{ bg: styles.bgHover.bg }}
              borderRadius="md"
              transition="all 0.2s"
              justify={isCollapsed ? 'center' : 'flex-start'}
              onClick={logout}
            >
              <FiLogOut style={{
                marginRight: isCollapsed ? '0' : '12px',
                width: '20px',
                height: '20px',
                flexShrink: 0
              }} />
              {!isCollapsed && (
                <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
                  {t('logout')}
                </Text>
              )}
            </Flex>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default Sidebar
