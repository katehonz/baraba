import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Flex,
  Button,
  Badge,
  VStack,
  HStack,
  Spinner,
  useColorModeValue,
  Link,
  Divider,
} from '@chakra-ui/react';
import { companiesApi } from '../api/companies';
import { currenciesApi } from '../api/currencies';
import { fixedAssetCategoriesApi } from '../api/fixedAssetCategories';
import { useCompany } from '../contexts/CompanyContext';
import type { Company, Currency, FixedAssetCategory } from '../types';

interface SummaryCardProps {
  title: string;
  value: string | number;
  hint: string;
  colorScheme: string;
}

function SummaryCard({ title, value, hint, colorScheme }: SummaryCardProps) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  return (
    <Box
      bg={cardBg}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      px={5}
      py={4}
      shadow="sm"
    >
      <Text fontSize="sm" fontWeight="medium" color="gray.500">
        {title}
      </Text>
      <Text mt={2} fontSize="2xl" fontWeight="semibold">
        {value}
      </Text>
      <Badge mt={4} colorScheme={colorScheme} fontSize="xs">
        {hint}
      </Badge>
    </Box>
  );
}

interface QuickActionProps {
  to: string;
  icon: string;
  title: string;
  description: string;
}

function QuickAction({ to, icon, title, description }: QuickActionProps) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Link
      as={RouterLink}
      to={to}
      _hover={{ textDecoration: 'none' }}
    >
      <Flex
        align="center"
        p={3}
        borderRadius="md"
        border="1px"
        borderColor={borderColor}
        bg={cardBg}
        _hover={{ bg: hoverBg }}
        transition="all 0.2s"
      >
        <Text fontSize="2xl" mr={3}>{icon}</Text>
        <Box>
          <Text fontSize="sm" fontWeight="medium">{title}</Text>
          <Text fontSize="xs" color="gray.500">{description}</Text>
        </Box>
      </Flex>
    </Link>
  );
}

export default function HomePage() {
  const { companyId } = useCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categories, setCategories] = useState<FixedAssetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [companiesData, currenciesData] = await Promise.all([
          companiesApi.getAll(),
          currenciesApi.getAll(),
        ]);
        setCompanies(companiesData);
        setCurrencies(currenciesData);

        if (companyId) {
          const categoriesData = await fixedAssetCategoriesApi.getFixedAssetCategories(companyId);
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  const baseCurrency = currencies.find((c: Currency) => c.isBaseCurrency);

  if (loading) {
    return (
      <Flex align="center" justify="center" h="64">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Начално табло</Heading>
          <Text mt={1} fontSize="sm" color="gray.500">
            Обобщение на системата - EUR базова валута (България в еврозоната от 2025)
          </Text>
        </Box>
        <HStack spacing={3}>
          <Button
            as={RouterLink}
            to="/journal/entries/new"
            colorScheme="blue"
            size="sm"
          >
            Нов запис
          </Button>
          <Button
            as={RouterLink}
            to="/companies"
            variant="outline"
            size="sm"
          >
            Компании
          </Button>
        </HStack>
      </Flex>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={6}>
        <SummaryCard
          title="Компании"
          value={companies.length}
          hint={companies.length > 0 ? `${companies.filter((c: Company) => c.isActive).length} активни` : 'Създайте първата компания'}
          colorScheme="blue"
        />
        <SummaryCard
          title="Базова валута"
          value={baseCurrency?.code || 'EUR'}
          hint="Фиксиран курс BGN/EUR: 1.95583"
          colorScheme="green"
        />
        <SummaryCard
          title="Валути"
          value={currencies.length}
          hint="Курсове от ЕЦБ"
          colorScheme="purple"
        />
        <SummaryCard
          title="Категории ДА"
          value={categories.length}
          hint="Данъчни категории по ЗКПО"
          colorScheme="teal"
        />
      </SimpleGrid>

      {/* Main Content */}
      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6}>
        {/* Companies List */}
        <Box
          gridColumn={{ xl: 'span 2' }}
          bg={cardBg}
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={6}
          shadow="sm"
        >
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">Компании</Heading>
            <Link as={RouterLink} to="/companies" color="blue.500" fontSize="sm" fontWeight="medium">
              Управление
            </Link>
          </Flex>

          {companies.length === 0 ? (
            <VStack py={8}>
              <Text color="gray.500" mb={4}>Няма създадени компании</Text>
              <Button as={RouterLink} to="/companies" colorScheme="blue">
                Създай компания
              </Button>
            </VStack>
          ) : (
            <VStack align="stretch" divider={<Divider />} spacing={0}>
              {companies.slice(0, 5).map((company: Company) => (
                <Flex key={company.id} py={3} justify="space-between" align="center">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium">{company.name}</Text>
                    <Text fontSize="xs" color="gray.500">
                      ЕИК: {company.eik} {company.vatNumber && `| ДДС: ${company.vatNumber}`}
                      {company.city && ` | ${company.city}`}
                    </Text>
                  </Box>
                  <Badge colorScheme={company.isActive ? 'green' : 'gray'}>
                    {company.isActive ? 'Активна' : 'Неактивна'}
                  </Badge>
                </Flex>
              ))}
            </VStack>
          )}
        </Box>

        {/* Quick Actions */}
        <Box
          bg={cardBg}
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={6}
          shadow="sm"
        >
          <Heading size="md" mb={4}>Бързи действия</Heading>
          <VStack spacing={3} align="stretch">
            <QuickAction
              to="/journal/entries/new"
              icon="+"
              title="Нов счетоводен запис"
              description="Създай дневникова статия"
            />
            <QuickAction
              to="/accounts"
              icon="="
              title="Сметкоплан"
              description="Управление на сметки"
            />
            <QuickAction
              to="/counterparts"
              icon="@"
              title="Контрагенти"
              description="Клиенти и доставчици"
            />
            <QuickAction
              to="/reports"
              icon="#"
              title="Отчети"
              description="Справки и отчети"
            />
            <QuickAction
              to="/settings"
              icon="*"
              title="Настройки"
              description="Конфигурация на системата"
            />
          </VStack>
        </Box>
      </SimpleGrid>
    </VStack>
  );
}
