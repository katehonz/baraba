import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  ButtonGroup,
  IconButton,
  Input,
  Select,
  FormControl,
  FormLabel,
  FormHelperText,
  Badge,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Divider,
  useColorModeValue,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Icon,
  Flex,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { accountsApi } from '../../api/accounts';
import { counterpartsApi } from '../../api/counterparts';
import { currenciesApi } from '../../api/currencies';
import { journalApi } from '../../api/journal';
import { viesApi } from '../../api/vies';
import type { Account, Counterpart, Currency } from '../../types';

// Bulgarian VAT document types
const VAT_DOCUMENT_TYPES = [
  { code: '01', name: 'Фактура' },
  { code: '02', name: 'Дебитно известие' },
  { code: '03', name: 'Кредитно известие' },
  { code: '04', name: 'Протокол по чл.117' },
  { code: '05', name: 'Известие към протокол по чл.117' },
  { code: '07', name: 'Митническа декларация' },
  { code: '81', name: 'Отчет за продажби' },
  { code: '82', name: 'Отчет за покупки' },
  { code: '91', name: 'Протокол за ВОП' },
  { code: '92', name: 'Протокол за услуга от ЕС' },
];

const VAT_PURCHASE_OPERATIONS = [
  { code: 'пок30', name: 'кл.30 - 20%', description: 'Покупки с право на ДК 20%' },
  { code: 'пок31', name: 'кл.31 - ДДС 20%', description: 'ДДС с право на данъчен кредит 20%' },
  { code: 'пок32', name: 'кл.32 - 9%', description: 'Покупки с право на ДК 9%' },
  { code: 'пок33', name: 'кл.33 - ДДС 9%', description: 'ДДС с право на данъчен кредит 9%' },
  { code: 'пок40', name: 'кл.40 - Без право ДК', description: 'Покупки без право на данъчен кредит' },
  { code: 'пок09', name: 'кл.09 - ВОП стоки', description: 'Вътреобщностни придобивания' },
  { code: 'пок12', name: 'кл.12 - Услуги от ЕС', description: 'Получени услуги от ЕС' },
  { code: 'пок14', name: 'кл.14 - Внос', description: 'Внос по чл.56' },
];

const VAT_SALES_OPERATIONS = [
  { code: 'про11', name: 'кл.11 - ДО 20%', description: 'Данъчна основа 20%' },
  { code: 'про12', name: 'кл.12 - ДО 9%', description: 'Данъчна основа 9%' },
  { code: 'про13', name: 'кл.13 - ДО 0%', description: 'Данъчна основа 0%' },
  { code: 'про16', name: 'кл.16 - ВОД', description: 'Вътреобщностни доставки' },
  { code: 'про15', name: 'кл.15 - Износ', description: 'Износ' },
  { code: 'про19', name: 'кл.19 - Освободени', description: 'Освободени доставки' },
];

interface EntryLine {
  id?: number;
  accountId: number;
  description: string;
  side: 'debit' | 'credit';
  amount: string;
  currencyCode: string;
  currencyAmount: string;
  exchangeRate: string;
}

interface VatOperation {
  documentType: string;
  documentNumber: string;
  documentDate: string;
  vatDate: string;
  accountingDate: string;
  counterpartId: number;
  vatDirection: 'PURCHASE' | 'SALE';
  vatOperationCode: string;
  currency: string;
  exchangeRate: string;
  baseAmount: string;
  vatRate: string;
  vatAmount: string;
  totalAmount: string;
  description: string;
}

const newEmptyLine = (currencyCode: string, side: 'debit' | 'credit' = 'debit'): EntryLine => ({
  accountId: 0,
  description: '',
  side,
  amount: '',
  currencyCode,
  currencyAmount: '',
  exchangeRate: '1',
});

// Icons
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

export default function VATEntryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { companyId } = useCompany();
  const toast = useToast();
  const isEdit = !!id;

  const baseCurrency = 'BGN';

  const counterpartModal = useDisclosure();
  const accountModal = useDisclosure();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [counterparts, setCounterparts] = useState<Counterpart[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [selectedCounterpart, setSelectedCounterpart] = useState<Counterpart | null>(null);
  const [counterpartSearch, setCounterpartSearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountLineIndex, setAccountLineIndex] = useState<number | null>(null);

  const [showNewCounterpartForm, setShowNewCounterpartForm] = useState(false);
  const [newCounterpart, setNewCounterpart] = useState({ name: '', eik: '', vatNumber: '', city: '', country: 'България' });
  const [viesLoading, setViesLoading] = useState(false);
  const [viesResult, setViesResult] = useState<any>(null);

  const [vatOperation, setVatOperation] = useState<VatOperation>({
    documentType: '01',
    documentNumber: '',
    documentDate: new Date().toISOString().split('T')[0],
    vatDate: new Date().toISOString().split('T')[0],
    accountingDate: new Date().toISOString().split('T')[0],
    counterpartId: 0,
    vatDirection: 'PURCHASE',
    vatOperationCode: 'пок30',
    currency: 'BGN',
    exchangeRate: '1',
    baseAmount: '',
    vatRate: '20',
    vatAmount: '',
    totalAmount: '',
    description: '',
  });

  const [lines, setLines] = useState<EntryLine[]>([
    newEmptyLine(baseCurrency, 'debit'),
    newEmptyLine(baseCurrency, 'credit'),
  ]);

  const cardBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  useEffect(() => {
    const base = parseFloat(vatOperation.baseAmount) || 0;
    const rate = parseFloat(vatOperation.vatRate) || 0;
    const vat = (base * rate) / 100;
    const total = base + vat;
    setVatOperation(prev => ({
      ...prev,
      vatAmount: vat.toFixed(2),
      totalAmount: total.toFixed(2),
    }));
  }, [vatOperation.baseAmount, vatOperation.vatRate]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [acc, ctr, cur] = await Promise.all([
        accountsApi.getByCompany(companyId),
        counterpartsApi.getByCompany(companyId),
        currenciesApi.getAll(),
      ]);
      setAccounts(acc);
      setCounterparts(ctr);
      setCurrencies(cur);
    } catch (error) {
      toast({ title: 'Error loading data', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const vatOperations = vatOperation.vatDirection === 'PURCHASE' ? VAT_PURCHASE_OPERATIONS : VAT_SALES_OPERATIONS;

  const filteredCounterparts = useMemo(() => {
    if (!counterpartSearch) return counterparts;
    const search = counterpartSearch.toLowerCase();
    return counterparts.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.eik?.toLowerCase().includes(search) ||
      c.vatNumber?.toLowerCase().includes(search)
    );
  }, [counterparts, counterpartSearch]);

  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const search = accountSearch.toLowerCase();
    return accounts.filter(a =>
      a.code.toLowerCase().includes(search) ||
      a.name.toLowerCase().includes(search)
    );
  }, [accounts, accountSearch]);

  const selectCounterpart = (c: Counterpart) => {
    setSelectedCounterpart(c);
    setVatOperation(prev => ({ ...prev, counterpartId: c.id }));
    counterpartModal.onClose();
    setCounterpartSearch('');
  };

  const openAccountSearch = (index: number) => {
    setAccountLineIndex(index);
    setAccountSearch('');
    accountModal.onOpen();
  };

  const selectAccount = (account: Account) => {
    if (accountLineIndex !== null) {
      const newLines = [...lines];
      newLines[accountLineIndex] = { ...newLines[accountLineIndex], accountId: account.id };
      setLines(newLines);
    }
    accountModal.onClose();
  };

  const updateLine = (index: number, field: keyof EntryLine, value: any) => {
    const newLines = [...lines];
    const line: EntryLine = { ...newLines[index], [field]: value };

    const isForeign = line.currencyCode !== baseCurrency;
    if (field === 'currencyCode' && value === baseCurrency) {
      line.exchangeRate = '1';
      line.currencyAmount = '';
    }
    if (isForeign && (field === 'currencyAmount' || field === 'exchangeRate')) {
      const currAmt = parseFloat(line.currencyAmount) || 0;
      const rate = parseFloat(line.exchangeRate) || 1;
      line.amount = (currAmt * rate).toFixed(2);
    }

    newLines[index] = line;
    setLines(newLines);
  };

  const addLine = () => {
    const lastSide = lines.length > 0 ? lines[lines.length - 1].side : 'credit';
    setLines([...lines, newEmptyLine(baseCurrency, lastSide === 'debit' ? 'credit' : 'debit')]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const totalDebit = lines.reduce((sum, l) => sum + (l.side === 'debit' ? parseFloat(l.amount) || 0 : 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.side === 'credit' ? parseFloat(l.amount) || 0 : 0), 0);
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const totals = calculateTotals();

  const formatCurrency = (amount: number, currency = 'BGN') =>
    new Intl.NumberFormat('bg-BG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

  const generateAccountingLines = () => {
    const base = parseFloat(vatOperation.baseAmount) || 0;
    const vat = parseFloat(vatOperation.vatAmount) || 0;
    const total = parseFloat(vatOperation.totalAmount) || 0;

    if (vatOperation.vatDirection === 'PURCHASE') {
      setLines([
        { accountId: 0, description: 'Разход/Актив', side: 'debit', amount: base.toFixed(2), currencyCode: baseCurrency, currencyAmount: '', exchangeRate: '1' },
        { accountId: 0, description: 'ДДС за възстановяване', side: 'debit', amount: vat.toFixed(2), currencyCode: baseCurrency, currencyAmount: '', exchangeRate: '1' },
        { accountId: 0, description: 'Задължение към доставчик', side: 'credit', amount: total.toFixed(2), currencyCode: baseCurrency, currencyAmount: '', exchangeRate: '1' },
      ]);
    } else {
      setLines([
        { accountId: 0, description: 'Вземане от клиент', side: 'debit', amount: total.toFixed(2), currencyCode: baseCurrency, currencyAmount: '', exchangeRate: '1' },
        { accountId: 0, description: 'Приход от продажби', side: 'credit', amount: base.toFixed(2), currencyCode: baseCurrency, currencyAmount: '', exchangeRate: '1' },
        { accountId: 0, description: 'ДДС за внасяне', side: 'credit', amount: vat.toFixed(2), currencyCode: baseCurrency, currencyAmount: '', exchangeRate: '1' },
      ]);
    }
  };

  const handleValidateVat = async () => {
    if (!newCounterpart.vatNumber) return;
    setViesLoading(true);
    try {
      const result = await viesApi.validateVat(newCounterpart.vatNumber);
      setViesResult(result);
      if (result.valid) {
        setNewCounterpart(prev => ({
          ...prev,
          name: result.name || prev.name,
          eik: result.vatNumber?.replace(/^BG/i, '') || prev.eik,
        }));
      }
    } catch (error) {
      toast({ title: 'VIES validation error', status: 'error' });
    } finally {
      setViesLoading(false);
    }
  };

  const handleCreateCounterpart = async () => {
    if (!newCounterpart.name.trim() || !companyId) return;
    try {
      const created = await counterpartsApi.create({
        companyId,
        name: newCounterpart.name,
        eik: newCounterpart.eik || undefined,
        vatNumber: newCounterpart.vatNumber || undefined,
        city: newCounterpart.city || undefined,
      });
      setCounterparts([...counterparts, created]);
      selectCounterpart(created);
      setShowNewCounterpartForm(false);
      setNewCounterpart({ name: '', eik: '', vatNumber: '', city: '', country: 'България' });
      setViesResult(null);
    } catch (error) {
      toast({ title: 'Error creating counterpart', status: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!companyId) return;
    if (!vatOperation.documentNumber) {
      toast({ title: 'Document number is required', status: 'warning' });
      return;
    }
    if (!vatOperation.counterpartId) {
      toast({ title: 'Counterpart is required', status: 'warning' });
      return;
    }
    if (!totals.isBalanced) {
      toast({ title: 'Debit and Credit must be equal', status: 'warning' });
      return;
    }

    const validLines = lines.filter(l => l.accountId && l.amount);
    if (validLines.length < 2) {
      toast({ title: 'At least 2 lines required', status: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const input = {
        companyId,
        documentNumber: vatOperation.documentNumber,
        description: vatOperation.description || `${VAT_DOCUMENT_TYPES.find(t => t.code === vatOperation.documentType)?.name} ${vatOperation.documentNumber}`,
        counterpartId: vatOperation.counterpartId,
        lines: validLines.map(line => ({
          accountId: line.accountId,
          debitAmount: line.side === 'debit' ? parseFloat(line.amount) || 0 : 0,
          creditAmount: line.side === 'credit' ? parseFloat(line.amount) || 0 : 0,
          description: line.description,
          currencyCode: line.currencyCode !== baseCurrency ? line.currencyCode : undefined,
          exchangeRate: line.currencyCode !== baseCurrency ? parseFloat(line.exchangeRate) : undefined,
        })),
      };

      if (isEdit && id) {
        await journalApi.update(parseInt(id), input);
      } else {
        await journalApi.create(input);
      }
      toast({ title: 'Entry saved', status: 'success' });
      navigate('/journal/entries');
    } catch (error: any) {
      toast({ title: error.message || 'Error saving', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" h="64">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box maxW="6xl" mx="auto">
      {/* Header */}
      <HStack justify="space-between" mb={6}>
        <Box>
          <Heading size="lg" mb={1}>{isEdit ? 'Edit VAT Entry' : 'New VAT Entry'}</Heading>
          <Text color="gray.500">Invoice entry with automatic VAT posting</Text>
        </Box>
        <Button variant="outline" onClick={() => navigate('/journal/entries')}>Back</Button>
      </HStack>

      <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" colorScheme="brand">
        <TabList>
          <Tab fontWeight="medium">VAT Operation</Tab>
          <Tab fontWeight="medium">Payment</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <VStack spacing={6} align="stretch">
              {/* Direction Toggle */}
              <Card bg={cardBg}>
                <CardBody>
                  <HStack spacing={4}>
                    <Text fontWeight="medium">Type:</Text>
                    <ButtonGroup isAttached size="md">
                      <Button
                        colorScheme={vatOperation.vatDirection === 'PURCHASE' ? 'blue' : 'gray'}
                        variant={vatOperation.vatDirection === 'PURCHASE' ? 'solid' : 'outline'}
                        onClick={() => setVatOperation(p => ({ ...p, vatDirection: 'PURCHASE', vatOperationCode: 'пок30' }))}
                      >
                        Purchase
                      </Button>
                      <Button
                        colorScheme={vatOperation.vatDirection === 'SALE' ? 'green' : 'gray'}
                        variant={vatOperation.vatDirection === 'SALE' ? 'solid' : 'outline'}
                        onClick={() => setVatOperation(p => ({ ...p, vatDirection: 'SALE', vatOperationCode: 'про11' }))}
                      >
                        Sale
                      </Button>
                    </ButtonGroup>
                  </HStack>
                </CardBody>
              </Card>

              {/* Document */}
              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="md">Document</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Document Type</FormLabel>
                      <Select
                        value={vatOperation.documentType}
                        onChange={e => setVatOperation(p => ({ ...p, documentType: e.target.value }))}
                      >
                        {VAT_DOCUMENT_TYPES.map(t => (
                          <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Document Number</FormLabel>
                      <Input
                        value={vatOperation.documentNumber}
                        onChange={e => setVatOperation(p => ({ ...p, documentNumber: e.target.value }))}
                        placeholder="0000000001"
                        fontFamily="mono"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>VAT Operation</FormLabel>
                      <Select
                        value={vatOperation.vatOperationCode}
                        onChange={e => setVatOperation(p => ({ ...p, vatOperationCode: e.target.value }))}
                      >
                        {vatOperations.map(op => (
                          <option key={op.code} value={op.code}>{op.name}</option>
                        ))}
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* Triple Date */}
              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="md">Triple Date</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Document Date</FormLabel>
                      <Input
                        type="date"
                        value={vatOperation.documentDate}
                        onChange={e => setVatOperation(p => ({ ...p, documentDate: e.target.value }))}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>VAT Date</FormLabel>
                      <Input
                        type="date"
                        value={vatOperation.vatDate}
                        onChange={e => setVatOperation(p => ({ ...p, vatDate: e.target.value }))}
                      />
                      <FormHelperText>For VAT ledgers</FormHelperText>
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Accounting Date</FormLabel>
                      <Input
                        type="date"
                        value={vatOperation.accountingDate}
                        onChange={e => setVatOperation(p => ({ ...p, accountingDate: e.target.value }))}
                      />
                    </FormControl>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* Counterpart */}
              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="md">{vatOperation.vatDirection === 'PURCHASE' ? 'Supplier' : 'Customer'}</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  {selectedCounterpart ? (
                    <Flex
                      bg={useColorModeValue('gray.50', 'gray.700')}
                      p={4}
                      borderRadius="lg"
                      justify="space-between"
                      align="start"
                    >
                      <Box>
                        <Text fontWeight="bold">{selectedCounterpart.name}</Text>
                        <HStack spacing={4} mt={1} fontSize="sm" color="gray.500">
                          {selectedCounterpart.eik && <Text>EIK: {selectedCounterpart.eik}</Text>}
                          {selectedCounterpart.vatNumber && (
                            <Badge colorScheme="green">VAT: {selectedCounterpart.vatNumber}</Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          {selectedCounterpart.city}, {selectedCounterpart.country}
                        </Text>
                      </Box>
                      <IconButton
                        aria-label="Remove"
                        icon={<Icon as={CloseIcon} />}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCounterpart(null);
                          setVatOperation(p => ({ ...p, counterpartId: 0 }));
                        }}
                      />
                    </Flex>
                  ) : (
                    <Button
                      variant="outline"
                      w="full"
                      h="16"
                      borderStyle="dashed"
                      onClick={counterpartModal.onOpen}
                    >
                      + Select Counterpart
                    </Button>
                  )}
                </CardBody>
              </Card>

              {/* Amounts */}
              <Card bg={cardBg}>
                <CardHeader>
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Amounts</Heading>
                    <Button size="sm" variant="link" colorScheme="blue" onClick={generateAccountingLines}>
                      Generate Lines
                    </Button>
                  </Flex>
                </CardHeader>
                <CardBody pt={0}>
                  <SimpleGrid columns={{ base: 1, md: 5 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        value={vatOperation.currency}
                        onChange={e => setVatOperation(p => ({ ...p, currency: e.target.value }))}
                      >
                        {currencies.map(c => (
                          <option key={c.code} value={c.code}>{c.code}</option>
                        ))}
                      </Select>
                    </FormControl>
                    {vatOperation.currency !== baseCurrency && (
                      <FormControl>
                        <FormLabel>Exchange Rate</FormLabel>
                        <Input
                          type="number"
                          step="0.000001"
                          value={vatOperation.exchangeRate}
                          onChange={e => setVatOperation(p => ({ ...p, exchangeRate: e.target.value }))}
                        />
                      </FormControl>
                    )}
                    <FormControl isRequired>
                      <FormLabel>Tax Base</FormLabel>
                      <Input
                        type="number"
                        step="0.01"
                        value={vatOperation.baseAmount}
                        onChange={e => setVatOperation(p => ({ ...p, baseAmount: e.target.value }))}
                        textAlign="right"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>VAT Rate</FormLabel>
                      <Select
                        value={vatOperation.vatRate}
                        onChange={e => setVatOperation(p => ({ ...p, vatRate: e.target.value }))}
                      >
                        <option value="20">20%</option>
                        <option value="9">9%</option>
                        <option value="0">0%</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>VAT Amount</FormLabel>
                      <Input value={vatOperation.vatAmount} isReadOnly bg={hoverBg} textAlign="right" />
                    </FormControl>
                  </SimpleGrid>
                  <Divider my={4} />
                  <Flex justify="flex-end" align="center" gap={4}>
                    <Text color="gray.500">Total:</Text>
                    <Text fontSize="2xl" fontWeight="bold">
                      {formatCurrency(parseFloat(vatOperation.totalAmount) || 0, vatOperation.currency)}
                    </Text>
                  </Flex>
                </CardBody>
              </Card>

              {/* Description */}
              <Card bg={cardBg}>
                <CardBody>
                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Input
                      value={vatOperation.description}
                      onChange={e => setVatOperation(p => ({ ...p, description: e.target.value }))}
                      placeholder="Operation description..."
                    />
                  </FormControl>
                </CardBody>
              </Card>

              {/* Accounting Lines */}
              <Card bg={cardBg} overflow="hidden">
                <CardHeader>
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Accounting Lines</Heading>
                    <Button size="sm" colorScheme="blue" variant="ghost" onClick={addLine}>+ Add Line</Button>
                  </Flex>
                </CardHeader>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead bg={hoverBg}>
                      <Tr>
                        <Th w="80px">D/C</Th>
                        <Th minW="200px">Account</Th>
                        <Th w="100px">Currency</Th>
                        <Th w="100px" isNumeric>Curr. Amt</Th>
                        <Th w="80px" isNumeric>Rate</Th>
                        <Th w="120px" isNumeric>Amount</Th>
                        <Th w="50px"></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {lines.map((line, idx) => {
                        const account = accounts.find(a => a.id === line.accountId);
                        const isForeign = line.currencyCode !== baseCurrency;

                        return (
                          <Tr key={idx} bg={line.side === 'debit' ? 'blue.50' : 'green.50'} _dark={{ bg: line.side === 'debit' ? 'blue.900' : 'green.900' }}>
                            <Td>
                              <Select
                                size="sm"
                                value={line.side}
                                onChange={e => updateLine(idx, 'side', e.target.value)}
                                fontWeight="bold"
                                color={line.side === 'debit' ? 'blue.600' : 'green.600'}
                              >
                                <option value="debit">Dt</option>
                                <option value="credit">Ct</option>
                              </Select>
                            </Td>
                            <Td>
                              <Button
                                size="sm"
                                variant="outline"
                                w="full"
                                justifyContent="flex-start"
                                fontWeight="normal"
                                onClick={() => openAccountSearch(idx)}
                              >
                                {account ? (
                                  <HStack spacing={2}>
                                    <Text fontFamily="mono" fontWeight="bold">{account.code}</Text>
                                    <Text noOfLines={1}>{account.name}</Text>
                                  </HStack>
                                ) : (
                                  <Text color="gray.400">Search account...</Text>
                                )}
                              </Button>
                            </Td>
                            <Td>
                              <Select
                                size="sm"
                                value={line.currencyCode}
                                onChange={e => updateLine(idx, 'currencyCode', e.target.value)}
                              >
                                {currencies.map(c => (
                                  <option key={c.code} value={c.code}>{c.code}</option>
                                ))}
                              </Select>
                            </Td>
                            <Td>
                              <Input
                                size="sm"
                                type="number"
                                value={line.currencyAmount}
                                onChange={e => updateLine(idx, 'currencyAmount', e.target.value)}
                                isDisabled={!isForeign}
                                textAlign="right"
                              />
                            </Td>
                            <Td>
                              <Input
                                size="sm"
                                type="number"
                                step="any"
                                value={line.exchangeRate}
                                onChange={e => updateLine(idx, 'exchangeRate', e.target.value)}
                                isDisabled={!isForeign}
                                textAlign="right"
                              />
                            </Td>
                            <Td>
                              <Input
                                size="sm"
                                type="number"
                                step="0.01"
                                value={line.amount}
                                onChange={e => updateLine(idx, 'amount', e.target.value)}
                                textAlign="right"
                                fontWeight="medium"
                              />
                            </Td>
                            <Td>
                              {lines.length > 2 && (
                                <IconButton
                                  aria-label="Remove"
                                  icon={<Icon as={CloseIcon} />}
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => removeLine(idx)}
                                />
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                    <Tfoot bg={hoverBg}>
                      <Tr>
                        <Td colSpan={5} textAlign="right">
                          <HStack justify="flex-end" spacing={4}>
                            <Text color="blue.600" fontWeight="bold">Dt: {formatCurrency(totals.totalDebit)}</Text>
                            <Text color="green.600" fontWeight="bold">Ct: {formatCurrency(totals.totalCredit)}</Text>
                          </HStack>
                        </Td>
                        <Td textAlign="right">
                          <Badge
                            colorScheme={totals.isBalanced ? 'green' : 'red'}
                            fontSize="md"
                            px={2}
                          >
                            {totals.isBalanced ? 'Balanced' : formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                          </Badge>
                        </Td>
                        <Td></Td>
                      </Tr>
                    </Tfoot>
                  </Table>
                </Box>
              </Card>
            </VStack>
          </TabPanel>

          <TabPanel px={0}>
            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Payment Tab</Text>
                <Text>Payment entry will be created as a separate journal entry.</Text>
              </Box>
            </Alert>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Actions */}
      <HStack justify="flex-end" mt={6} spacing={3}>
        <Button variant="outline" onClick={() => navigate('/journal/entries')}>Cancel</Button>
        <Button
          colorScheme="brand"
          onClick={handleSubmit}
          isLoading={saving}
          isDisabled={!totals.isBalanced}
        >
          {isEdit ? 'Update' : 'Create Entry'}
        </Button>
      </HStack>

      {/* Counterpart Modal */}
      <Modal isOpen={counterpartModal.isOpen} onClose={counterpartModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent maxH="80vh">
          <ModalHeader>
            {showNewCounterpartForm ? 'New Counterpart' : 'Select Counterpart'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow="auto">
            {showNewCounterpartForm ? (
              <VStack spacing={4} align="stretch">
                {viesResult && (
                  <Alert status={viesResult.valid ? 'success' : 'warning'} borderRadius="lg">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">{viesResult.valid ? 'Valid VAT Number' : 'Invalid'}</Text>
                      {viesResult.name && <Text fontSize="sm">{viesResult.name}</Text>}
                    </Box>
                  </Alert>
                )}
                <FormControl>
                  <FormLabel>VAT Number</FormLabel>
                  <HStack>
                    <Input
                      value={newCounterpart.vatNumber}
                      onChange={e => setNewCounterpart(p => ({ ...p, vatNumber: e.target.value.toUpperCase() }))}
                      placeholder="BG123456789"
                    />
                    <Button
                      colorScheme="green"
                      onClick={handleValidateVat}
                      isLoading={viesLoading}
                      isDisabled={!newCounterpart.vatNumber}
                    >
                      Check VIES
                    </Button>
                  </HStack>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={newCounterpart.name}
                    onChange={e => setNewCounterpart(p => ({ ...p, name: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>EIK</FormLabel>
                  <Input
                    value={newCounterpart.eik}
                    onChange={e => setNewCounterpart(p => ({ ...p, eik: e.target.value }))}
                  />
                </FormControl>
                <SimpleGrid columns={2} spacing={4}>
                  <FormControl>
                    <FormLabel>City</FormLabel>
                    <Input
                      value={newCounterpart.city}
                      onChange={e => setNewCounterpart(p => ({ ...p, city: e.target.value }))}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Country</FormLabel>
                    <Input
                      value={newCounterpart.country}
                      onChange={e => setNewCounterpart(p => ({ ...p, country: e.target.value }))}
                    />
                  </FormControl>
                </SimpleGrid>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={SearchIcon} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search by name, EIK, VAT..."
                    value={counterpartSearch}
                    onChange={e => setCounterpartSearch(e.target.value)}
                    autoFocus
                  />
                </InputGroup>
                <VStack spacing={2} align="stretch" maxH="300px" overflow="auto">
                  {filteredCounterparts.map(c => (
                    <Button
                      key={c.id}
                      variant="outline"
                      justifyContent="flex-start"
                      h="auto"
                      py={3}
                      px={4}
                      onClick={() => selectCounterpart(c)}
                    >
                      <Box textAlign="left">
                        <Text fontWeight="medium">{c.name}</Text>
                        <HStack fontSize="sm" color="gray.500">
                          {c.eik && <Text>EIK: {c.eik}</Text>}
                          {c.vatNumber && <Badge colorScheme="green">{c.vatNumber}</Badge>}
                        </HStack>
                      </Box>
                    </Button>
                  ))}
                </VStack>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTopWidth="1px">
            {showNewCounterpartForm ? (
              <HStack spacing={3}>
                <Button variant="ghost" onClick={() => setShowNewCounterpartForm(false)}>Back</Button>
                <Button
                  colorScheme="brand"
                  onClick={handleCreateCounterpart}
                  isDisabled={!newCounterpart.name.trim()}
                >
                  Create Counterpart
                </Button>
              </HStack>
            ) : (
              <Button w="full" variant="outline" onClick={() => setShowNewCounterpartForm(true)}>
                + Create New Counterpart
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Account Modal */}
      <Modal isOpen={accountModal.isOpen} onClose={accountModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent maxH="80vh">
          <ModalHeader>Select Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Icon as={SearchIcon} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search by code or name..."
                  value={accountSearch}
                  onChange={e => setAccountSearch(e.target.value)}
                  autoFocus
                />
              </InputGroup>
              <VStack spacing={1} align="stretch" maxH="400px" overflow="auto">
                {filteredAccounts.map(a => (
                  <Button
                    key={a.id}
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => selectAccount(a)}
                  >
                    <HStack>
                      <Text fontFamily="mono" fontWeight="bold" w="16">{a.code}</Text>
                      <Text>{a.name}</Text>
                      {a.isAnalytical && <Badge colorScheme="cyan" fontSize="xs">Analytical</Badge>}
                    </HStack>
                  </Button>
                ))}
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
