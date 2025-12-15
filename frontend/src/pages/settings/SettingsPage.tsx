import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  VStack,
  useColorModeValue,
  Link,
  Select,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import { settingsApi } from '../../api/settings';
import type { DefaultAccounts } from '../../api/settings';
import { accountsApi } from '../../api/accounts';
import { currenciesApi } from '../../api/currencies';
import { useCompany } from '../../contexts/CompanyContext';
import type { Account, Currency } from '../../types';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('accounting');
  const { companyId } = useCompany();
  const toast = useToast();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultAccounts, setDefaultAccounts] = useState<DefaultAccounts>({});
  const [saving, setSaving] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.700', 'blue.200');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    currenciesApi.getAll().then(setCurrencies);
    if (companyId) {
      accountsApi.getByCompany(companyId).then(setAccounts);
      settingsApi.getCompanySettings(companyId).then((data: any) => {
        setDefaultAccounts({
          defaultCashAccountId: data.defaultCashAccount?.id,
          defaultCustomersAccountId: data.defaultCustomersAccount?.id,
          defaultSuppliersAccountId: data.defaultSuppliersAccount?.id,
          defaultSalesRevenueAccountId: data.defaultSalesRevenueAccount?.id,
          defaultVatPurchaseAccountId: data.defaultVatPurchaseAccount?.id,
          defaultVatSalesAccountId: data.defaultVatSalesAccount?.id,
          defaultCardPaymentPurchaseAccountId: data.defaultCardPaymentPurchaseAccount?.id,
          defaultCardPaymentSalesAccountId: data.defaultCardPaymentSalesAccount?.id,
        });
      });
    }
  }, [companyId]);

  const baseCurrency = currencies.find((c: Currency) => c.isBaseCurrency);

  const filterAccountsByCode = (prefix: string) => {
    return accounts.filter((acc: Account) => acc.code.startsWith(prefix));
  };

  const handleSaveDefaultAccounts = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      await settingsApi.updateDefaultAccounts(companyId, defaultAccounts);
      toast({
        title: 'Успех',
        description: 'Настройките са запазени успешно!',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving default accounts:', error);
      toast({
        title: 'Грешка',
        description: 'Грешка при запазване на настройките',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'accounting', label: 'Счетоводство', icon: '=' },
    { id: 'automation', label: 'Автоматизации', icon: '*' },
    { id: 'users', label: 'Потребители и права', icon: '@' },
  ];

  const AccountSelect = ({
    label,
    value,
    onChange,
    filterPrefix,
    hint,
  }: {
    label: string;
    value: number | undefined;
    onChange: (value: string) => void;
    filterPrefix?: string;
    hint?: string;
  }) => {
    const filteredAccounts = filterPrefix ? filterAccountsByCode(filterPrefix) : accounts;
    return (
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>{label}</Text>
        <Select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          size="sm"
        >
          <option value="">-- Изберете сметка --</option>
          {filteredAccounts.map((acc: Account) => (
            <option key={acc.id} value={acc.id}>
              {acc.code} - {acc.name}
            </option>
          ))}
        </Select>
        {hint && <Text mt={1} fontSize="xs" color="gray.500">{hint}</Text>}
      </Box>
    );
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box>
        <Heading size="lg">Настройки</Heading>
        <Text mt={1} fontSize="sm" color="gray.500">
          Конфигурация на системата и предпочитания
        </Text>
      </Box>

      <Flex gap={6}>
        {/* Sidebar Tabs */}
        <Box w="200px" flexShrink={0}>
          <VStack align="stretch" spacing={1}>
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant="ghost"
                justifyContent="flex-start"
                bg={activeTab === tab.id ? activeBg : 'transparent'}
                color={activeTab === tab.id ? activeColor : 'gray.600'}
                _hover={{ bg: activeTab === tab.id ? activeBg : hoverBg }}
                fontWeight={activeTab === tab.id ? 'medium' : 'normal'}
                size="sm"
                leftIcon={<Text>{tab.icon}</Text>}
              >
                {tab.label}
              </Button>
            ))}
          </VStack>
        </Box>

        {/* Content */}
        <Box flex="1">
          {activeTab === 'accounting' && (
            <Box bg={cardBg} shadow="sm" borderRadius="lg" border="1px" borderColor={borderColor} p={6}>
              <VStack align="stretch" spacing={6}>
                <Box>
                  <Heading size="md">Счетоводни настройки</Heading>
                  <Text mt={1} fontSize="sm" color="gray.500">
                    Основни настройки за счетоводството
                  </Text>
                </Box>

                <VStack align="stretch" spacing={4}>
                  <Flex align="center" p={3} bg="green.50" border="1px" borderColor="green.200" borderRadius="md">
                    <Text fontSize="2xl" mr={3}>$</Text>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="green.900">
                        Базова валута: {baseCurrency?.code || 'EUR'}
                      </Text>
                      <Text fontSize="xs" color="green.700">Фиксирана базова валута</Text>
                    </Box>
                  </Flex>

                  <Link as={RouterLink} to="/settings/currencies" _hover={{ textDecoration: 'none' }}>
                    <Flex align="center" p={3} bg="blue.50" border="1px" borderColor="blue.200" borderRadius="md" _hover={{ bg: 'blue.100' }}>
                      <Text fontSize="2xl" mr={3}>%</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" color="blue.900">Валути и курсове</Text>
                        <Text fontSize="xs" color="blue.700">Управление на валути и обменни курсове</Text>
                      </Box>
                    </Flex>
                  </Link>

                  <Link as={RouterLink} to="/settings/vat-rates" _hover={{ textDecoration: 'none' }}>
                    <Flex align="center" p={3} bg="blue.50" border="1px" borderColor="blue.200" borderRadius="md" _hover={{ bg: 'blue.100' }}>
                      <Text fontSize="2xl" mr={3}>&</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" color="blue.900">ДДС Ставки</Text>
                        <Text fontSize="xs" color="blue.700">Управление на ставките по ЗДДС</Text>
                      </Box>
                    </Flex>
                  </Link>
                </VStack>
              </VStack>
            </Box>
          )}

          {activeTab === 'automation' && (
            <Box bg={cardBg} shadow="sm" borderRadius="lg" border="1px" borderColor={borderColor} p={6}>
              <VStack align="stretch" spacing={6}>
                <Box>
                  <Heading size="md">Автоматизации</Heading>
                  <Text mt={1} fontSize="sm" color="gray.500">
                    Настройте default сметки за автоматични плащания и AI обработка на фактури
                  </Text>
                </Box>

                {!companyId ? (
                  <Box textAlign="center" py={8} color="gray.500">
                    Моля, изберете компания от менюто горе.
                  </Box>
                ) : (
                  <VStack align="stretch" spacing={6}>
                    {/* Разплащания */}
                    <Box>
                      <Heading size="sm" mb={4} pb={2} borderBottom="1px" borderColor={borderColor}>
                        Сметки за разплащания
                      </Heading>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <AccountSelect
                          label="Каса (плащания в брой)"
                          value={defaultAccounts.defaultCashAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultCashAccountId: parseInt(v) }))}
                          filterPrefix="50"
                          hint="Обикновено 501"
                        />
                        <AccountSelect
                          label="Плащания с карта (покупки)"
                          value={defaultAccounts.defaultCardPaymentPurchaseAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultCardPaymentPurchaseAccountId: parseInt(v) }))}
                          filterPrefix="50"
                          hint="POS терминал за плащане"
                        />
                        <AccountSelect
                          label="Плащания с карта (продажби)"
                          value={defaultAccounts.defaultCardPaymentSalesAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultCardPaymentSalesAccountId: parseInt(v) }))}
                          filterPrefix="50"
                          hint="POS терминал за приемане"
                        />
                      </SimpleGrid>
                    </Box>

                    {/* Контрагенти */}
                    <Box>
                      <Heading size="sm" mb={4} pb={2} borderBottom="1px" borderColor={borderColor}>
                        Сметки на контрагенти
                      </Heading>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <AccountSelect
                          label="Клиенти"
                          value={defaultAccounts.defaultCustomersAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultCustomersAccountId: parseInt(v) }))}
                          filterPrefix="41"
                          hint="Обикновено 411"
                        />
                        <AccountSelect
                          label="Доставчици"
                          value={defaultAccounts.defaultSuppliersAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultSuppliersAccountId: parseInt(v) }))}
                          filterPrefix="40"
                          hint="Обикновено 401"
                        />
                      </SimpleGrid>
                    </Box>

                    {/* Приходи и ДДС */}
                    <Box>
                      <Heading size="sm" mb={4} pb={2} borderBottom="1px" borderColor={borderColor}>
                        Приходи и ДДС
                      </Heading>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <AccountSelect
                          label="Приходи от продажби (default)"
                          value={defaultAccounts.defaultSalesRevenueAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultSalesRevenueAccountId: parseInt(v) }))}
                          filterPrefix="70"
                          hint="Обикновено 702 или 703"
                        />
                        <AccountSelect
                          label="ДДС на покупките"
                          value={defaultAccounts.defaultVatPurchaseAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultVatPurchaseAccountId: parseInt(v) }))}
                          filterPrefix="453"
                          hint="Обикновено 4531"
                        />
                        <AccountSelect
                          label="ДДС на продажбите"
                          value={defaultAccounts.defaultVatSalesAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultVatSalesAccountId: parseInt(v) }))}
                          filterPrefix="453"
                          hint="Обикновено 4532"
                        />
                      </SimpleGrid>
                    </Box>

                    <Flex justify="flex-end" pt={4} borderTop="1px" borderColor={borderColor}>
                      <Button
                        colorScheme="blue"
                        onClick={handleSaveDefaultAccounts}
                        isLoading={saving}
                      >
                        Запази настройките
                      </Button>
                    </Flex>
                  </VStack>
                )}
              </VStack>
            </Box>
          )}

          {activeTab === 'users' && (
            <Box bg={cardBg} shadow="sm" borderRadius="lg" border="1px" borderColor={borderColor} p={6}>
              <Heading size="md">Потребители и права</Heading>
              <Text mt={1} fontSize="sm" color="gray.600">
                Управление на потребителски роли и техните достъпи до различните модули на системата.
              </Text>
              <Box mt={4}>
                <Button as={RouterLink} to="/settings/users" colorScheme="blue">
                  Управление на потребители
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Flex>
    </VStack>
  );
}
