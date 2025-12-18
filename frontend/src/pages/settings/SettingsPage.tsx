import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  VStack,
  HStack,
  useColorModeValue,
  Link,
  Select,
  SimpleGrid,
  useToast,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Alert,
  AlertIcon,
  Spinner,
  Icon,
  Radio,
  RadioGroup,
  Stack,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { settingsApi, type SmtpSettings, type SaltEdgeSettings } from '../../api/settings';
import { vatApi } from '../../api/vat';
import type { DefaultAccounts } from '../../api/settings';
import { accountsApi } from '../../api/accounts';
import { currenciesApi } from '../../api/currencies';
import { useCompany } from '../../contexts/CompanyContext';
import type { Account, Currency } from '../../types';

// Icons
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
  </svg>
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('accounting');
  const { companyId } = useCompany();
  const toast = useToast();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultAccounts, setDefaultAccounts] = useState<DefaultAccounts>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // VAT state
  const [vatPeriod, setVatPeriod] = useState('');
  const [generatingVat, setGeneratingVat] = useState(false);

  // SMTP state
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpFromName: '',
    smtpUseTls: true,
    smtpUseSsl: false,
    smtpEnabled: false,
  });
  const [testEmail, setTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Salt Edge state
  const [saltEdgeSettings, setSaltEdgeSettings] = useState<SaltEdgeSettings>({
    saltEdgeAppId: '',
    saltEdgeSecret: '',
    saltEdgeEnabled: false,
  });
  const [savingSaltEdge, setSavingSaltEdge] = useState(false);
  const [showSaltEdgeSecret, setShowSaltEdgeSecret] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.700', 'blue.200');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    // Set default VAT period to last month
    const today = new Date();
    today.setMonth(today.getMonth() - 1);
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    setVatPeriod(`${year}-${month}`);

    currenciesApi.getAll().then(setCurrencies);
    loadSystemSettings();
    if (companyId) {
      accountsApi.getByCompany(companyId).then(setAccounts);
      loadCompanySettings();
    }
  }, [companyId]);

  const loadSystemSettings = async () => {
    try {
      const data = await settingsApi.getSystemSettings();
      setSmtpSettings({
        smtpHost: data.smtpHost || '',
        smtpPort: data.smtpPort || 587,
        smtpUsername: data.smtpUsername || '',
        smtpPassword: '',
        smtpFromEmail: data.smtpFromEmail || '',
        smtpFromName: data.smtpFromName || '',
        smtpUseTls: data.smtpUseTls ?? true,
        smtpUseSsl: data.smtpUseSsl ?? false,
        smtpEnabled: data.smtpEnabled ?? false,
      });
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  const loadCompanySettings = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await settingsApi.getCompanySettings(companyId);
      setDefaultAccounts({
        defaultCashAccountId: (data as any).defaultCashAccount?.id,
        defaultCustomersAccountId: (data as any).defaultCustomersAccount?.id,
        defaultSuppliersAccountId: (data as any).defaultSuppliersAccount?.id,
        defaultSalesRevenueAccountId: (data as any).defaultSalesRevenueAccount?.id,
        defaultVatPurchaseAccountId: (data as any).defaultVatPurchaseAccount?.id,
        defaultVatSalesAccountId: (data as any).defaultVatSalesAccount?.id,
        defaultCardPaymentPurchaseAccountId: (data as any).defaultCardPaymentPurchaseAccount?.id,
        defaultCardPaymentSalesAccountId: (data as any).defaultCardPaymentSalesAccount?.id,
      });
      setSaltEdgeSettings({
        saltEdgeAppId: (data as any).saltEdgeAppId || '',
        saltEdgeSecret: '',
        saltEdgeEnabled: (data as any).saltEdgeEnabled ?? false,
      });
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const baseCurrency = currencies.find((c: Currency) => c.isBaseCurrency);

  const filterAccountsByCode = (prefix: string) => {
    return accounts.filter((acc: Account) => acc.code.startsWith(prefix));
  };

  const handleSaveDefaultAccounts = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      await settingsApi.updateDefaultAccounts(companyId, defaultAccounts);
      toast({ title: 'Настройките са запазени', status: 'success' });
    } catch (error) {
      toast({ title: 'Грешка при запазване', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateVat = async () => {
    if (!companyId || !vatPeriod) return;
    setGeneratingVat(true);
    try {
      const period = vatPeriod.replace('-', '');
      const result = await vatApi.generate(companyId, period);

      // Create a link and click it to download each file
      for (const fileName of Object.keys(result.rawFiles) as Array<keyof typeof result.rawFiles>) {
        const content = result.rawFiles[fileName];
        const blob = new Blob([content as BlobPart], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({ title: 'VAT файловете са генерирани', status: 'success' });
    } catch (error) {
      toast({ title: 'Грешка при генериране на VAT файлове', status: 'error' });
    } finally {
      setGeneratingVat(false);
    }
  };

  const handleSaveSmtpSettings = async () => {
    setSavingSmtp(true);
    try {
      await settingsApi.updateSmtpSettings(smtpSettings);
      toast({ title: 'SMTP настройките са запазени', status: 'success' });
      setSmtpSettings(prev => ({ ...prev, smtpPassword: '' }));
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при запазване', status: 'error' });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      toast({ title: 'Въведете имейл за тест', status: 'warning' });
      return;
    }
    setTestingSmtp(true);
    try {
      await settingsApi.testSmtpConnection(testEmail);
      toast({ title: `Тестов имейл изпратен на ${testEmail}`, status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при изпращане', status: 'error' });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveSaltEdgeSettings = async () => {
    if (!companyId) return;
    setSavingSaltEdge(true);
    try {
      const input: Partial<SaltEdgeSettings> = {
        saltEdgeEnabled: saltEdgeSettings.saltEdgeEnabled,
      };
      if (saltEdgeSettings.saltEdgeAppId) {
        input.saltEdgeAppId = saltEdgeSettings.saltEdgeAppId;
      }
      if (saltEdgeSettings.saltEdgeSecret) {
        input.saltEdgeSecret = saltEdgeSettings.saltEdgeSecret;
      }
      await settingsApi.updateSaltEdgeSettings(companyId, input);
      toast({ title: 'Salt Edge настройките са запазени', status: 'success' });
      setSaltEdgeSettings(prev => ({ ...prev, saltEdgeSecret: '' }));
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при запазване', status: 'error' });
    } finally {
      setSavingSaltEdge(false);
    }
  };

  const tabs = [
    { id: 'accounting', label: 'Счетоводство', icon: '📚' },
    { id: 'automation', label: 'Автоматизации', icon: '🤖' },
    { id: 'smtp', label: 'SMTP / Email', icon: '📧' },
    { id: 'integrations', label: 'Интеграции', icon: '🔗' },
    { id: 'vat', label: 'VAT / ДДС', icon: '🧾' },
    { id: 'users', label: 'Потребители', icon: '👥' },
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
      <FormControl>
        <FormLabel fontSize="sm">{label}</FormLabel>
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
        {hint && <FormHelperText>{hint}</FormHelperText>}
      </FormControl>
    );
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Настройки</Heading>
        <Text mt={1} fontSize="sm" color="gray.500">
          Конфигурация на системата и предпочитания
        </Text>
      </Box>

      <Flex gap={6} direction={{ base: 'column', md: 'row' }}>
        {/* Sidebar */}
        <Box w={{ base: 'full', md: '220px' }} flexShrink={0}>
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
          {/* Accounting Tab */}
          {activeTab === 'accounting' && (
            <Card bg={cardBg}>
              <CardHeader>
                <Heading size="md">Счетоводни настройки</Heading>
                <Text fontSize="sm" color="gray.500">Основни настройки за счетоводството</Text>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="stretch" spacing={4}>
                  <Flex align="center" p={3} bg="green.50" border="1px" borderColor="green.200" borderRadius="md" _dark={{ bg: 'green.900', borderColor: 'green.700' }}>
                    <Text fontSize="2xl" mr={3}>💶</Text>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">Базова валута: {baseCurrency?.code || 'BGN'}</Text>
                      <Text fontSize="xs" color="gray.500">Фиксирана базова валута</Text>
                    </Box>
                  </Flex>

                  <Link as={RouterLink} to="/settings/currencies" _hover={{ textDecoration: 'none' }}>
                    <Flex align="center" p={3} bg="blue.50" border="1px" borderColor="blue.200" borderRadius="md" _hover={{ bg: 'blue.100' }} _dark={{ bg: 'blue.900', borderColor: 'blue.700' }}>
                      <Text fontSize="2xl" mr={3}>💱</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">Валути и курсове</Text>
                        <Text fontSize="xs" color="gray.500">Управление на валути и обменни курсове от ЕЦБ</Text>
                      </Box>
                    </Flex>
                  </Link>

                  <Link as={RouterLink} to="/settings/vat-rates" _hover={{ textDecoration: 'none' }}>
                    <Flex align="center" p={3} bg="blue.50" border="1px" borderColor="blue.200" borderRadius="md" _hover={{ bg: 'blue.100' }} _dark={{ bg: 'blue.900', borderColor: 'blue.700' }}>
                      <Text fontSize="2xl" mr={3}>📊</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">ДДС Ставки</Text>
                        <Text fontSize="xs" color="gray.500">Управление на ставките по ЗДДС</Text>
                      </Box>
                    </Flex>
                  </Link>

                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="medium">Фиксиран курс BGN/EUR</Text>
                      <Text fontSize="sm">По силата на валутен борд: 1 EUR = 1.95583 BGN</Text>
                    </Box>
                  </Alert>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <Card bg={cardBg}>
              <CardHeader>
                <Heading size="md">Автоматизации</Heading>
                <Text fontSize="sm" color="gray.500">
                  Default сметки за AI обработка на фактури и автоматични плащания
                </Text>
              </CardHeader>
              <CardBody pt={0}>
                {!companyId ? (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    Моля, изберете компания от менюто горе.
                  </Alert>
                ) : loading ? (
                  <Flex justify="center" py={8}><Spinner /></Flex>
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
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultCashAccountId: parseInt(v) || undefined }))}
                          filterPrefix="50"
                          hint="Обикновено 501"
                        />
                        <AccountSelect
                          label="Плащания с карта (покупки)"
                          value={defaultAccounts.defaultCardPaymentPurchaseAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultCardPaymentPurchaseAccountId: parseInt(v) || undefined }))}
                          filterPrefix="50"
                          hint="POS терминал за плащане"
                        />
                        <AccountSelect
                          label="Плащания с карта (продажби)"
                          value={defaultAccounts.defaultCardPaymentSalesAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultCardPaymentSalesAccountId: parseInt(v) || undefined }))}
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
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultCustomersAccountId: parseInt(v) || undefined }))}
                          filterPrefix="41"
                          hint="Обикновено 411"
                        />
                        <AccountSelect
                          label="Доставчици"
                          value={defaultAccounts.defaultSuppliersAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultSuppliersAccountId: parseInt(v) || undefined }))}
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
                          label="Приходи от продажби"
                          value={defaultAccounts.defaultSalesRevenueAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultSalesRevenueAccountId: parseInt(v) || undefined }))}
                          filterPrefix="70"
                          hint="Обикновено 702 или 703"
                        />
                        <AccountSelect
                          label="ДДС на покупките"
                          value={defaultAccounts.defaultVatPurchaseAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultVatPurchaseAccountId: parseInt(v) || undefined }))}
                          filterPrefix="453"
                          hint="Обикновено 4531"
                        />
                        <AccountSelect
                          label="ДДС на продажбите"
                          value={defaultAccounts.defaultVatSalesAccountId}
                          onChange={(v) => setDefaultAccounts((prev) => ({ ...prev, defaultVatSalesAccountId: parseInt(v) || undefined }))}
                          filterPrefix="453"
                          hint="Обикновено 4532"
                        />
                      </SimpleGrid>
                    </Box>

                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="medium">Как работят автоматизациите?</Text>
                        <Text fontSize="sm">AI разпознаване на фактури автоматично ще попълва тези сметки. Банковите импорти също ще използват default стойностите.</Text>
                      </Box>
                    </Alert>

                    <Flex justify="flex-end" pt={4} borderTop="1px" borderColor={borderColor}>
                      <Button colorScheme="blue" onClick={handleSaveDefaultAccounts} isLoading={saving}>
                        Запази настройките
                      </Button>
                    </Flex>
                  </VStack>
                )}
              </CardBody>
            </Card>
          )}

          {/* SMTP Tab */}
          {activeTab === 'smtp' && (
            <Card bg={cardBg}>
              <CardHeader>
                <Heading size="md">SMTP / Email настройки</Heading>
                <Text fontSize="sm" color="gray.500">Глобални настройки за изпращане на имейли</Text>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="stretch" spacing={6}>
                  {/* Enable/Disable */}
                  <Flex justify="space-between" align="center" p={4} bg={hoverBg} borderRadius="lg">
                    <Box>
                      <Text fontWeight="medium">Активиране на SMTP</Text>
                      <Text fontSize="sm" color="gray.500">Позволява изпращане на имейли от системата</Text>
                    </Box>
                    <Switch
                      isChecked={smtpSettings.smtpEnabled}
                      onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtpEnabled: e.target.checked }))}
                      colorScheme="blue"
                      size="lg"
                    />
                  </Flex>

                  {/* Server settings */}
                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottom="1px" borderColor={borderColor}>
                      Сървър настройки
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>SMTP Хост</FormLabel>
                        <Input
                          value={smtpSettings.smtpHost}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                          placeholder="smtp.example.com"
                        />
                        <FormHelperText>Direct Mail Alibaba: smtpdm.aliyun.com</FormHelperText>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Порт</FormLabel>
                        <Select
                          value={smtpSettings.smtpPort}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                        >
                          <option value={25}>25 (SMTP)</option>
                          <option value={80}>80 (HTTP/Контейнери)</option>
                          <option value={465}>465 (SSL)</option>
                          <option value={587}>587 (TLS/STARTTLS)</option>
                          <option value={2525}>2525 (Алтернативен)</option>
                        </Select>
                        <FormHelperText>Порт 80 работи добре в контейнери</FormHelperText>
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* Authentication */}
                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottom="1px" borderColor={borderColor}>
                      Автентикация
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Потребител</FormLabel>
                        <Input
                          value={smtpSettings.smtpUsername}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtpUsername: e.target.value }))}
                          placeholder="user@example.com"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Парола</FormLabel>
                        <InputGroup>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={smtpSettings.smtpPassword}
                            onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                            placeholder="••••••••"
                          />
                          <InputRightElement>
                            <IconButton
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              icon={<Icon as={showPassword ? EyeOffIcon : EyeIcon} />}
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPassword(!showPassword)}
                            />
                          </InputRightElement>
                        </InputGroup>
                        <FormHelperText>Оставете празно за да запазите текущата</FormHelperText>
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* Sender info */}
                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottom="1px" borderColor={borderColor}>
                      Данни за изпращача
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Имейл адрес</FormLabel>
                        <Input
                          type="email"
                          value={smtpSettings.smtpFromEmail}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtpFromEmail: e.target.value }))}
                          placeholder="noreply@example.com"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Име на изпращача</FormLabel>
                        <Input
                          value={smtpSettings.smtpFromName}
                          onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtpFromName: e.target.value }))}
                          placeholder="SP-AC Accounting"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* Security */}
                  <Box>
                    <Heading size="sm" mb={4} pb={2} borderBottom="1px" borderColor={borderColor}>
                      Сигурност
                    </Heading>
                    <RadioGroup
                      value={smtpSettings.smtpUseSsl ? 'ssl' : smtpSettings.smtpUseTls ? 'tls' : 'none'}
                      onChange={(value) => {
                        setSmtpSettings(prev => ({
                          ...prev,
                          smtpUseTls: value === 'tls',
                          smtpUseSsl: value === 'ssl',
                        }));
                      }}
                    >
                      <Stack direction="row" spacing={6}>
                        <Radio value="tls">STARTTLS (порт 587)</Radio>
                        <Radio value="ssl">SSL/TLS (порт 465)</Radio>
                        <Radio value="none">Без криптиране</Radio>
                      </Stack>
                    </RadioGroup>
                  </Box>

                  {/* Test connection */}
                  <Alert status="info" borderRadius="lg">
                    <AlertIcon />
                    <Box flex="1">
                      <Text fontWeight="medium" mb={2}>Тест на връзката</Text>
                      <HStack>
                        <Input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="test@example.com"
                          bg={cardBg}
                          flex="1"
                        />
                        <Button
                          onClick={handleTestSmtp}
                          isLoading={testingSmtp}
                          isDisabled={!smtpSettings.smtpHost}
                          colorScheme="blue"
                        >
                          Изпрати тест
                        </Button>
                      </HStack>
                    </Box>
                  </Alert>

                  <Flex justify="flex-end" pt={4} borderTop="1px" borderColor={borderColor}>
                    <Button colorScheme="blue" onClick={handleSaveSmtpSettings} isLoading={savingSmtp}>
                      Запази SMTP настройките
                    </Button>
                  </Flex>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <VStack spacing={6} align="stretch">
              {/* Active Integrations */}
              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="md">Активни интеграции</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align="center" p={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
                      <HStack>
                        <Text fontSize="2xl">🏛️</Text>
                        <Box>
                          <Text fontWeight="medium">Европейска централна банка (ЕЦБ)</Text>
                          <Text fontSize="sm" color="gray.500">Обменни курсове</Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="green">Активна</Badge>
                    </Flex>

                    <Flex justify="space-between" align="center" p={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
                      <HStack>
                        <Text fontSize="2xl">🏦</Text>
                        <Box>
                          <Text fontWeight="medium">Банкови импорти</Text>
                          <Text fontSize="sm" color="gray.500">MT940 / ISO 20022 / CAMT.053</Text>
                        </Box>
                      </HStack>
                      <Button as={RouterLink} to="/banks" size="sm" variant="outline">
                        Конфигурирай
                      </Button>
                    </Flex>

                    <Flex justify="space-between" align="center" p={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
                      <HStack>
                        <Text fontSize="2xl">📄</Text>
                        <Box>
                          <Text fontWeight="medium">НАП</Text>
                          <Text fontSize="sm" color="gray.500">Електронно подаване</Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="gray">Скоро</Badge>
                    </Flex>
                  </VStack>
                </CardBody>
              </Card>

              {/* Salt Edge */}
              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="md">Salt Edge Open Banking</Heading>
                  <Text fontSize="sm" color="gray.500">
                    Автоматичен импорт на банкови транзакции чрез Open Banking API
                  </Text>
                </CardHeader>
                <CardBody pt={0}>
                  {!companyId ? (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      Моля, изберете компания от менюто горе.
                    </Alert>
                  ) : (
                    <VStack align="stretch" spacing={4}>
                      <Flex justify="space-between" align="center" p={4} bg={hoverBg} borderRadius="lg">
                        <Box>
                          <Text fontWeight="medium">Активиране на Salt Edge</Text>
                          <Text fontSize="sm" color="gray.500">Позволява свързване на банкови сметки</Text>
                        </Box>
                        <Switch
                          isChecked={saltEdgeSettings.saltEdgeEnabled}
                          onChange={(e) => setSaltEdgeSettings(prev => ({ ...prev, saltEdgeEnabled: e.target.checked }))}
                          colorScheme="blue"
                          size="lg"
                        />
                      </Flex>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl>
                          <FormLabel>App ID</FormLabel>
                          <Input
                            value={saltEdgeSettings.saltEdgeAppId}
                            onChange={(e) => setSaltEdgeSettings(prev => ({ ...prev, saltEdgeAppId: e.target.value }))}
                            placeholder="Вашият Salt Edge App ID"
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Secret</FormLabel>
                          <InputGroup>
                            <Input
                              type={showSaltEdgeSecret ? 'text' : 'password'}
                              value={saltEdgeSettings.saltEdgeSecret}
                              onChange={(e) => setSaltEdgeSettings(prev => ({ ...prev, saltEdgeSecret: e.target.value }))}
                              placeholder="••••••••"
                            />
                            <InputRightElement>
                              <IconButton
                                aria-label="Toggle visibility"
                                icon={<Icon as={showSaltEdgeSecret ? EyeOffIcon : EyeIcon} />}
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSaltEdgeSecret(!showSaltEdgeSecret)}
                              />
                            </InputRightElement>
                          </InputGroup>
                          <FormHelperText>Оставете празно за да запазите текущия</FormHelperText>
                        </FormControl>
                      </SimpleGrid>

                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <Box>
                          <Text fontWeight="medium">Как да получите API ключове?</Text>
                          <Text fontSize="sm">
                            1. Регистрирайте се на saltedge.com
                            2. Създайте ново приложение в Client Dashboard
                            3. Копирайте App ID и Secret
                          </Text>
                        </Box>
                      </Alert>

                      <Flex justify="flex-end" pt={4}>
                        <Button colorScheme="blue" onClick={handleSaveSaltEdgeSettings} isLoading={savingSaltEdge}>
                          Запази Salt Edge настройките
                        </Button>
                      </Flex>
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </VStack>
          )}

          {activeTab === 'vat' && (
          <Card bg={cardBg}>
            <CardHeader>
              <Heading size="md">ДДС Декларации</Heading>
              <Text fontSize="sm" color="gray.500">
                Генериране на файлове за дневниците за покупки и продажби, и ДДС декларация
              </Text>
            </CardHeader>
            <CardBody pt={0}>
              {!companyId ? (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  Моля, изберете компания от менюто горе.
                </Alert>
              ) : (
                <VStack align="stretch" spacing={4}>
                  <FormControl>
                    <FormLabel>Период (месец)</FormLabel>
                    <Input
                      type="month"
                      value={vatPeriod}
                      onChange={(e) => setVatPeriod(e.target.value)}
                    />
                    <FormHelperText>Изберете месец и година за генериране</FormHelperText>
                  </FormControl>

                  <Flex justify="flex-end" pt={4}>
                    <Button
                      colorScheme="blue"
                      onClick={handleGenerateVat}
                      isLoading={generatingVat}
                      disabled={!vatPeriod}
                    >
                      Генерирай файлове
                    </Button>
                  </Flex>
                </VStack>
              )}
            </CardBody>
          </Card>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Card bg={cardBg}>
              <CardHeader>
                <Heading size="md">Потребители и права</Heading>
                <Text fontSize="sm" color="gray.500">
                  Управление на потребителски роли и достъп
                </Text>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="stretch" spacing={4}>
                  <Link as={RouterLink} to="/settings/users" _hover={{ textDecoration: 'none' }}>
                    <Flex align="center" p={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg" _hover={{ bg: hoverBg }}>
                      <Text fontSize="2xl" mr={3}>👤</Text>
                      <Box flex="1">
                        <Text fontWeight="medium">Управление на потребители</Text>
                        <Text fontSize="sm" color="gray.500">Добавяне, редакция и деактивиране на потребители</Text>
                      </Box>
                      <Badge colorScheme="blue">Отвори</Badge>
                    </Flex>
                  </Link>

                  <Link as={RouterLink} to="/reports/audit-logs" _hover={{ textDecoration: 'none' }}>
                    <Flex align="center" p={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg" _hover={{ bg: hoverBg }}>
                      <Text fontSize="2xl" mr={3}>📋</Text>
                      <Box flex="1">
                        <Text fontWeight="medium">Одит логове</Text>
                        <Text fontSize="sm" color="gray.500">Преглед на потребителска активност</Text>
                      </Box>
                      <Badge colorScheme="blue">Отвори</Badge>
                    </Flex>
                  </Link>

                  <Link as={RouterLink} to="/profile" _hover={{ textDecoration: 'none' }}>
                    <Flex align="center" p={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg" _hover={{ bg: hoverBg }}>
                      <Text fontSize="2xl" mr={3}>⚙️</Text>
                      <Box flex="1">
                        <Text fontWeight="medium">Моят профил</Text>
                        <Text fontSize="sm" color="gray.500">Редактиране на профилни данни и смяна на парола</Text>
                      </Box>
                      <Badge colorScheme="blue">Отвори</Badge>
                    </Flex>
                  </Link>
                </VStack>
              </CardBody>
            </Card>
          )}
        </Box>
      </Flex>
    </VStack>
  );
}
