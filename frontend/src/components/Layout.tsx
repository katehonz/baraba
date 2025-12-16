import { Link as RouterLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  IconButton,
  useColorMode,
  useColorModeValue,
  Link,
  Heading,
  Badge,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';

// Simple icons as SVG
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
  </svg>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();

  const sidebarBg = useColorModeValue('gray.800', 'gray.900');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      as={RouterLink}
      to={to}
      display="block"
      px={6}
      py={3}
      color={isActive(to) ? 'white' : 'gray.400'}
      bg={isActive(to) ? 'gray.700' : 'transparent'}
      _hover={{ bg: 'gray.700', color: 'white' }}
      transition="all 0.2s"
      fontWeight={isActive(to) ? '500' : 'normal'}
    >
      {children}
    </Link>
  );

  return (
    <Flex minH="100vh">
      {/* Sidebar */}
      <Box w="240px" bg={sidebarBg} color="white" position="fixed" h="100vh">
        <VStack align="stretch" h="full">
          {/* Logo */}
          <Box px={6} py={5} borderBottom="1px" borderColor="gray.700">
            <Heading size="md" fontWeight="600">Baraba</Heading>
            {currentCompany && (
              <Badge mt={2} colorScheme="blue" fontSize="xs">
                {currentCompany.name}
              </Badge>
            )}
          </Box>

          {/* Navigation */}
          <VStack align="stretch" flex="1" py={4} spacing={0}>
            <NavLink to="/">Начало</NavLink>
            <NavLink to="/companies">Фирми</NavLink>
            <NavLink to="/accounts">Сметки</NavLink>
            <NavLink to="/counterparts">Контрагенти</NavLink>
            <NavLink to="/journal">Дневник</NavLink>
            <NavLink to="/vat/entry">ДДС Операция</NavLink>
            <NavLink to="/vat/returns">ДДС Дневници</NavLink>
            <NavLink to="/fixed-assets">ДМА</NavLink>
            <NavLink to="/banks">Банки</NavLink>
            <NavLink to="/scanner">AI Скенер</NavLink>
            <NavLink to="/scanner/invoices">Сканирани</NavLink>
            <NavLink to="/reports">Отчети</NavLink>
            <NavLink to="/settings">Настройки</NavLink>
          </VStack>

          {/* Footer */}
          <Box px={6} py={4} borderTop="1px" borderColor="gray.700">
            <HStack justify="space-between" mb={3}>
              <Text fontSize="sm" color="gray.400">{user?.username}</Text>
              <IconButton
                aria-label="Toggle color mode"
                icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                size="sm"
                variant="ghost"
                color="gray.400"
                _hover={{ color: 'white', bg: 'gray.700' }}
              />
            </HStack>
            <Button
              w="full"
              size="sm"
              variant="outline"
              colorScheme="gray"
              onClick={handleLogout}
              _hover={{ bg: 'gray.700' }}
            >
              Изход
            </Button>
          </Box>
        </VStack>
      </Box>

      {/* Main content */}
      <Box ml="240px" flex="1" bg={useColorModeValue('gray.50', 'gray.900')}>
        <Box p={8} maxW="1400px" mx="auto">
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
