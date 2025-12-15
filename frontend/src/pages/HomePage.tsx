import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { useCompany } from '../contexts/CompanyContext';

// Simple icons
const AccountsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
  </svg>
);

const CounterpartsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const JournalIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
  </svg>
);

interface DashboardCardProps {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function DashboardCard({ to, title, description, icon }: DashboardCardProps) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const iconColor = useColorModeValue('brand.500', 'brand.400');

  return (
    <Box
      as={RouterLink}
      to={to}
      bg={cardBg}
      p={6}
      borderRadius="xl"
      border="1px"
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        shadow: 'lg',
        borderColor: 'brand.500',
        bg: hoverBg,
      }}
    >
      <VStack align="start" spacing={3}>
        <Box color={iconColor}>{icon}</Box>
        <Heading size="md">{title}</Heading>
        <Text color="gray.500" fontSize="sm">{description}</Text>
      </VStack>
    </Box>
  );
}

export default function HomePage() {
  const { currentCompany } = useCompany();

  if (!currentCompany) {
    return (
      <VStack spacing={6} align="center" py={10}>
        <Heading size="xl">Добре дошли в Baraba</Heading>
        <Text color="gray.500" fontSize="lg">
          Моля, изберете фирма за да продължите.
        </Text>
        <Button as={RouterLink} to="/companies" colorScheme="brand" size="lg">
          Изберете фирма
        </Button>
      </VStack>
    );
  }

  return (
    <VStack spacing={8} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>{currentCompany.name}</Heading>
        <Text color="gray.500">ЕИК: {currentCompany.eik}</Text>
        {currentCompany.vatNumber && (
          <Text color="gray.500">ДДС номер: {currentCompany.vatNumber}</Text>
        )}
      </Box>

      <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={6}>
        <DashboardCard
          to="/accounts"
          title="Сметки"
          description="Сметкоплан и настройка на счетоводни сметки"
          icon={<AccountsIcon />}
        />
        <DashboardCard
          to="/counterparts"
          title="Контрагенти"
          description="Клиенти, доставчици и партньори"
          icon={<CounterpartsIcon />}
        />
        <DashboardCard
          to="/journal"
          title="Дневник"
          description="Счетоводни записи и документи"
          icon={<JournalIcon />}
        />
      </Grid>
    </VStack>
  );
}
