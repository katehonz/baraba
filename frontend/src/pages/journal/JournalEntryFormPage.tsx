import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  Heading,
  Text,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  Grid,
  Divider,
  Badge,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  useColorModeValue,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { accountsApi } from '../../api/accounts';
import { counterpartsApi } from '../../api/counterparts';
import { currenciesApi } from '../../api/currencies';
import { journalApi } from '../../api/journal';
import { viesApi } from '../../api/vies';
import type { Account, Counterpart, Currency, CreateJournalEntryInput } from '../../types';

// Document types
const DOCUMENT_TYPES = [
  { code: 'GENERIC', name: 'Общ документ' },
  { code: 'INVOICE', name: 'Фактура' },
  { code: 'DEBIT_NOTE', name: 'Дебитно известие' },
  { code: 'CREDIT_NOTE', name: 'Кредитно известие' },
  { code: 'CASH_PAYMENT_ORDER', name: 'Разходен касов ордер (РКО)' },
  { code: 'CASH_RECEIPT_ORDER', name: 'Приходен касов ордер (ПКО)' },
  { code: 'PAYROLL', name: 'Ведомост за заплати' },
  { code: 'BANK_STATEMENT', name: 'Банково бордеро' },
  { code: 'PROTOCOL', name: 'Протокол' },
  { code: 'OTHER', name: 'Други' },
];

// VAT document types for NAP
const VAT_DOCUMENT_TYPES = [
  { code: '', name: '-- Без ДДС --' },
  { code: '01', name: '01 - Фактура' },
  { code: '02', name: '02 - Дебитно известие' },
  { code: '03', name: '03 - Кредитно известие' },
  { code: '07', name: '07 - Опростена фактура' },
  { code: '09', name: '09 - Протокол' },
  { code: '11', name: '11 - Митническа декларация' },
  { code: '12', name: '12 - Отчет продажби' },
  { code: '81', name: '81 - Документ внос услуги' },
  { code: '82', name: '82 - Документ износ услуги' },
];

// VAT purchase operations
const VAT_PURCHASE_OPERATIONS = [
  { code: '', name: '-- Без --' },
  { code: 'пок30', name: 'пок30 - Покупки с пълен ДК (20%)' },
  { code: 'пок32', name: 'пок32 - Покупки с пълен ДК (9%)' },
  { code: 'пок31', name: 'пок31 - Частичен ДК' },
  { code: 'пок40', name: 'пок40 - Без право на ДК' },
  { code: 'пок09', name: 'пок09 - ВОП стоки' },
  { code: 'пок10', name: 'пок10 - ВОП услуги' },
];

// VAT sales operations
const VAT_SALES_OPERATIONS = [
  { code: '', name: '-- Без --' },
  { code: 'про11', name: 'про11 - Облагаеми 20%' },
  { code: 'про12', name: 'про12 - Облагаеми 9%' },
  { code: 'про13', name: 'про13 - 0% по гл. 3' },
  { code: 'про15', name: 'про15 - Износ' },
  { code: 'про16', name: 'про16 - ВОД' },
  { code: 'про14', name: 'про14 - Услуги чл. 21' },
  { code: 'про17', name: 'про17 - Доставки чл. 69' },
  { code: 'про19', name: 'про19 - Освободени' },
  { code: 'про20', name: 'про20 - Лични нужди' },
];

interface EntryLine {
  accountId: number;
  description: string;
  side: 'debit' | 'credit';
  amount: string;
  currencyCode: string;
  currencyAmount: string;
  exchangeRate: string;
}

const newEmptyLine = (baseCurrencyCode: string, side: 'debit' | 'credit' = 'debit'): EntryLine => ({
  accountId: 0,
  description: '',
  side,
  amount: '',
  currencyCode: baseCurrencyCode,
  currencyAmount: '',
  exchangeRate: '1',
});

export default function JournalEntryFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { companyId } = useCompany();
  const isEdit = !!id;

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const vatBg = useColorModeValue('blue.50', 'blue.900');
  const vatBorderColor = useColorModeValue('blue.200', 'blue.700');
  const debitBg = useColorModeValue('blue.50', 'blue.900');
  const creditBg = useColorModeValue('green.50', 'green.900');

  // Form state
  const [formData, setFormData] = useState({
    documentDate: new Date().toISOString().split('T')[0],
    accountingDate: new Date().toISOString().split('T')[0],
    description: '',
    documentNumber: '',
    documentType: 'GENERIC',
    vatDocumentType: '',
    vatPurchaseOperation: '',
    vatSalesOperation: '',
  });
  const [lines, setLines] = useState<EntryLine[]>([]);
  const [selectedCounterpart, setSelectedCounterpart] = useState<Counterpart | null>(null);

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [counterparts, setCounterparts] = useState<Counterpart[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>('BGN');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Counterpart modal
  const { isOpen: isCounterpartOpen, onOpen: onCounterpartOpen, onClose: onCounterpartClose } = useDisclosure();
  const [counterpartSearch, setCounterpartSearch] = useState('');
  const [showNewCounterpartForm, setShowNewCounterpartForm] = useState(false);
  const [newCounterpart, setNewCounterpart] = useState({
    name: '',
    eik: '',
    vatNumber: '',
  });
  const [viesLoading, setViesLoading] = useState(false);
  const [viesResult, setViesResult] = useState<{ valid: boolean; name?: string; longAddress?: string; countryCode?: string; vatNumber?: string; errorMessage?: string; source?: string } | null>(null);

  // Account modal
  const { isOpen: isAccountOpen, onOpen: onAccountOpen, onClose: onAccountClose } = useDisclosure();
  const [accountSearchLineIndex, setAccountSearchLineIndex] = useState<number | null>(null);
  const [accountSearch, setAccountSearch] = useState('');

  // Load data
  useEffect(() => {
    if (companyId) {
      accountsApi.getByCompany(companyId).then(setAccounts);
      counterpartsApi.getByCompany(companyId).then(setCounterparts);
      currenciesApi.getAll().then(data => {
        setCurrencies(data);
        const base = data.find(c => c.isBaseCurrency);
        if (base) setBaseCurrency(base.code);
      });
    }
  }, [companyId]);

  // Initialize lines
  useEffect(() => {
    if (baseCurrency && lines.length === 0 && !isEdit) {
      setLines([
        newEmptyLine(baseCurrency, 'debit'),
        newEmptyLine(baseCurrency, 'credit')
      ]);
    }
  }, [baseCurrency, lines.length, isEdit]);

  // Load entry for edit
  useEffect(() => {
    if (isEdit && id && accounts.length > 0) {
      setIsLoading(true);
      journalApi.getById(parseInt(id, 10))
        .then(data => {
          const { entry, lines: entryLines } = data;
          setFormData({
            documentDate: entry.documentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
            accountingDate: entry.accountingDate?.split('T')[0] || new Date().toISOString().split('T')[0],
            description: entry.description || '',
            documentNumber: entry.documentNumber || '',
            documentType: entry.documentType || 'GENERIC',
            vatDocumentType: '',
            vatPurchaseOperation: '',
            vatSalesOperation: '',
          });

          if (entry.counterpartId) {
            const cp = counterparts.find(c => c.id === entry.counterpartId);
            if (cp) setSelectedCounterpart(cp);
          }

          setLines(entryLines.map((line: any) => {
            const isForeign = line.currencyCode && line.currencyCode !== baseCurrency;
            return {
              accountId: line.accountId,
              description: line.description || '',
              side: (line.debitAmount > 0 ? 'debit' : 'credit') as 'debit' | 'credit',
              amount: (line.debitAmount > 0 ? line.debitAmount : line.creditAmount)?.toString() || '',
              currencyCode: line.currencyCode || baseCurrency,
              currencyAmount: isForeign ? line.currencyAmount?.toString() || '' : '',
              exchangeRate: line.exchangeRate?.toString() || '1',
            };
          }));
        })
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [id, isEdit, accounts.length, counterparts, baseCurrency]);

  // Memos
  const filteredCounterparts = useMemo(() => {
    if (!counterpartSearch.trim()) return counterparts;
    const search = counterpartSearch.toLowerCase();
    return counterparts.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.eik?.toLowerCase().includes(search) ||
      c.vatNumber?.toLowerCase().includes(search)
    );
  }, [counterparts, counterpartSearch]);

  const filteredAccounts = useMemo(() => {
    if (!accountSearch.trim()) return accounts;
    const search = accountSearch.toLowerCase();
    return accounts.filter(a =>
      a.code.toLowerCase().includes(search) ||
      a.name.toLowerCase().includes(search)
    );
  }, [accounts, accountSearch]);

  // Calculate totals
  const totalDebit = lines
    .filter(l => l.side === 'debit')
    .reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
  const totalCredit = lines
    .filter(l => l.side === 'credit')
    .reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Handlers
  const addLine = () => {
    const lastSide = lines.length > 0 ? lines[lines.length - 1].side : 'credit';
    const newSide = lastSide === 'debit' ? 'credit' : 'debit';
    setLines([...lines, newEmptyLine(baseCurrency, newSide)]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof EntryLine, value: string) => {
    const newLines = [...lines];
    const line: EntryLine = { ...newLines[index], [field]: value };

    const isForeign = line.currencyCode !== baseCurrency;

    // Reset currency fields when switching to base currency
    if (field === 'currencyCode' && value === baseCurrency) {
      line.exchangeRate = '1';
      line.currencyAmount = '';
    }

    // Calculate amount for foreign currency
    if (isForeign && (field === 'currencyAmount' || field === 'exchangeRate')) {
      const currAmt = parseFloat(line.currencyAmount) || 0;
      const rate = parseFloat(line.exchangeRate) || 1;
      line.amount = (currAmt * rate).toFixed(2);
    }

    newLines[index] = line;
    setLines(newLines);
  };

  const openAccountSearch = (lineIndex: number) => {
    setAccountSearchLineIndex(lineIndex);
    setAccountSearch('');
    onAccountOpen();
  };

  const selectAccount = (account: Account) => {
    if (accountSearchLineIndex !== null) {
      const newLines = [...lines];
      newLines[accountSearchLineIndex] = {
        ...newLines[accountSearchLineIndex],
        accountId: account.id,
      };
      setLines(newLines);
    }
    onAccountClose();
    setAccountSearchLineIndex(null);
  };

  const handleSelectCounterpart = (counterpart: Counterpart) => {
    setSelectedCounterpart(counterpart);
    onCounterpartClose();
    setCounterpartSearch('');
  };

  const handleClearCounterpart = () => {
    setSelectedCounterpart(null);
  };

  const handleValidateVat = async () => {
    if (!newCounterpart.vatNumber || newCounterpart.vatNumber.length < 3) {
      setError('Въведете валиден ДДС номер (напр. BG123456789)');
      return;
    }

    setViesLoading(true);
    setError('');
    setViesResult(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при валидация');
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
      });
      setCounterparts(prev => [...prev, created]);
      setSelectedCounterpart(created);
      setShowNewCounterpartForm(false);
      onCounterpartClose();
      setNewCounterpart({ name: '', eik: '', vatNumber: '' });
      setViesResult(null);
      setCounterpartSearch('');
    } catch (err) {
      console.error('Error creating counterpart:', err);
    }
  };

  const handleCloseCounterpartModal = () => {
    onCounterpartClose();
    setShowNewCounterpartForm(false);
    setCounterpartSearch('');
    setNewCounterpart({ name: '', eik: '', vatNumber: '' });
    setViesResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyId) {
      setError('Моля, изберете фирма');
      return;
    }

    if (!formData.description) {
      setError('Описанието е задължително.');
      return;
    }

    if (lines.some(l => !l.accountId)) {
      setError('Всички редове трябва да имат сметка.');
      return;
    }

    if (!isBalanced) {
      setError('Дебит и кредит трябва да са равни.');
      return;
    }

    const input: CreateJournalEntryInput = {
      companyId,
      documentDate: formData.documentDate,
      accountingDate: formData.accountingDate,
      description: formData.description,
      documentNumber: formData.documentNumber || undefined,
      documentType: formData.documentType,
      vatDocumentType: formData.vatDocumentType || undefined,
      vatPurchaseOperation: formData.vatPurchaseOperation || undefined,
      vatSalesOperation: formData.vatSalesOperation || undefined,
      counterpartId: selectedCounterpart?.id,
      lines: lines.map(line => {
        const isForeign = line.currencyCode !== baseCurrency;
        const amount = parseFloat(line.amount) || 0;

        return {
          accountId: line.accountId,
          side: line.side,
          amount: amount,
          debitAmount: line.side === 'debit' ? amount : 0,
          creditAmount: line.side === 'credit' ? amount : 0,
          description: line.description || undefined,
          currencyCode: isForeign ? line.currencyCode : undefined,
          currencyAmount: isForeign ? parseFloat(line.currencyAmount) || undefined : undefined,
          exchangeRate: isForeign ? parseFloat(line.exchangeRate) || undefined : undefined,
          counterpartId: selectedCounterpart?.id,
        };
      }),
    };

    try {
      setIsSaving(true);
      if (isEdit && id) {
        await journalApi.update(parseInt(id, 10), input);
      } else {
        await journalApi.create(input);
      }
      navigate('/journal/entries');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка при запазване.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { style: 'currency', currency: baseCurrency }).format(amount);

  if (!companyId) {
    return (
      <Center h="200px">
        <Text color="gray.500">{t('common.select_company')}</Text>
      </Center>
    );
  }

  if (isLoading) {
    return (
      <Center h="200px">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch" pb={12}>
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">{isEdit ? t('journal.edit_entry') : t('journal.new_entry')}</Heading>
          <Text mt={1} fontSize="sm" color="gray.500">
            {t('common.base_currency')}: <strong>{baseCurrency}</strong>
          </Text>
        </Box>
        <Button variant="outline" onClick={() => navigate('/journal/entries')}>
          {t('common.back')}
        </Button>
      </HStack>

      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Box as="form" onSubmit={handleSubmit}>
        <VStack spacing={6} align="stretch">
          {/* Basic info */}
          <Box bg={cardBg} p={6} borderRadius="xl" border="1px" borderColor={borderColor}>
            <Heading size="md" mb={4}>{t('journal.basic_info')}</Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
              <FormControl>
                <FormLabel>{t('journal.documentDate')} *</FormLabel>
                <Input
                  type="date"
                  value={formData.documentDate}
                  onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>{t('journal.accountingDate')} *</FormLabel>
                <Input
                  type="date"
                  value={formData.accountingDate}
                  onChange={(e) => setFormData({ ...formData, accountingDate: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>{t('journal.documentType')}</FormLabel>
                <Select
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                >
                  {DOCUMENT_TYPES.map(doc => (
                    <option key={doc.code} value={doc.code}>{doc.name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>{t('journal.documentNumber')}</FormLabel>
                <Input
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="Номер..."
                />
              </FormControl>
            </Grid>
            <FormControl mt={4}>
              <FormLabel>{t('journal.description')} *</FormLabel>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('journal.description_placeholder')}
              />
            </FormControl>

            {/* VAT Section */}
            <Box mt={4} p={4} bg={vatBg} borderRadius="lg" border="1px" borderColor={vatBorderColor}>
              <Text fontWeight="medium" color="blue.700" mb={3}>{t('journal.vatSection')}</Text>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <FormControl>
                  <FormLabel fontSize="sm">{t('journal.vatDocumentType')}</FormLabel>
                  <Select
                    size="sm"
                    value={formData.vatDocumentType}
                    onChange={(e) => setFormData({ ...formData, vatDocumentType: e.target.value })}
                  >
                    {VAT_DOCUMENT_TYPES.map(doc => (
                      <option key={doc.code} value={doc.code}>{doc.name}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">{t('journal.vatPurchaseOperation')}</FormLabel>
                  <Select
                    size="sm"
                    value={formData.vatPurchaseOperation}
                    onChange={(e) => setFormData({ ...formData, vatPurchaseOperation: e.target.value, vatSalesOperation: '' })}
                  >
                    {VAT_PURCHASE_OPERATIONS.map(op => (
                      <option key={op.code} value={op.code}>{op.name}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">{t('journal.vatSalesOperation')}</FormLabel>
                  <Select
                    size="sm"
                    value={formData.vatSalesOperation}
                    onChange={(e) => setFormData({ ...formData, vatSalesOperation: e.target.value, vatPurchaseOperation: '' })}
                  >
                    {VAT_SALES_OPERATIONS.map(op => (
                      <option key={op.code} value={op.code}>{op.name}</option>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Text mt={2} fontSize="xs" color="blue.600">
                {t('journal.vatHint')}
              </Text>
            </Box>
          </Box>

          {/* Counterpart */}
          <Box bg={cardBg} p={4} borderRadius="xl" border="1px" borderColor={borderColor}>
            <HStack justify="space-between">
              <Text fontWeight="medium">{t('counterparts.title')}</Text>
              {selectedCounterpart && (
                <Button size="sm" variant="ghost" colorScheme="red" onClick={handleClearCounterpart}>
                  {t('common.remove')}
                </Button>
              )}
            </HStack>

            {selectedCounterpart ? (
              <HStack mt={2} p={2} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200">
                <Box w={8} h={8} bg="blue.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                  <Text fontWeight="semibold" fontSize="sm" color="blue.700">
                    {selectedCounterpart.name.charAt(0).toUpperCase()}
                  </Text>
                </Box>
                <Box flex={1}>
                  <Text fontWeight="medium" fontSize="sm">{selectedCounterpart.name}</Text>
                  {selectedCounterpart.eik && (
                    <Text fontSize="xs" color="gray.500">{t('companies.eik_prefix')}{selectedCounterpart.eik}</Text>
                  )}
                </Box>
                <Button size="xs" variant="ghost" colorScheme="blue" onClick={onCounterpartOpen}>
                  {t('common.change')}
                </Button>
              </HStack>
            ) : (
              <Button
                mt={2}
                w="full"
                variant="outline"
                borderStyle="dashed"
                onClick={onCounterpartOpen}
              >
                + {t('journal.selectCounterpart')}
              </Button>
            )}
          </Box>

          {/* Lines */}
          <Box bg={cardBg} p={6} borderRadius="xl" border="1px" borderColor={borderColor}>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">{t('journal.lines')}</Heading>
              <Button onClick={addLine} colorScheme="blue" size="sm">
                + {t('journal.addLine')}
              </Button>
            </HStack>

            <Box overflowX="auto">
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th w="60px">{t('journal.side')}</Th>
                    <Th minW="200px">{t('journal.account')}</Th>
                    <Th w="90px">{t('currencies.title')}</Th>
                    <Th w="100px">{t('journal.currencyAmount')}</Th>
                    <Th w="80px">{t('journal.exchangeRate')}</Th>
                    <Th w="120px" isNumeric>{t('journal.amount')}</Th>
                    <Th w="50px"></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {lines.map((line, index) => {
                    const account = accounts.find(a => a.id === line.accountId);
                    const isForeign = line.currencyCode !== baseCurrency;

                    return (
                      <Tr key={index} bg={line.side === 'debit' ? debitBg : creditBg}>
                        <Td>
                          <Select
                            size="sm"
                            value={line.side}
                            onChange={(e) => updateLine(index, 'side', e.target.value)}
                            fontWeight="medium"
                            color={line.side === 'debit' ? 'blue.700' : 'green.700'}
                          >
                            <option value="debit">Дт</option>
                            <option value="credit">Кт</option>
                          </Select>
                        </Td>
                        <Td>
                          <Button
                            size="sm"
                            variant="outline"
                            w="full"
                            justifyContent="flex-start"
                            fontWeight="normal"
                            onClick={() => openAccountSearch(index)}
                          >
                            {account ? (
                              <>
                                <Text as="span" fontFamily="mono" fontWeight="medium">{account.code}</Text>
                                <Text as="span" ml={2} color="gray.600" isTruncated>{account.name}</Text>
                              </>
                            ) : (
                              <Text color="gray.400">{t('journal.searchAccount')}</Text>
                            )}
                          </Button>
                        </Td>
                        <Td>
                          <Select
                            size="sm"
                            value={line.currencyCode}
                            onChange={(e) => updateLine(index, 'currencyCode', e.target.value)}
                          >
                            {currencies.map(c => (
                              <option key={c.id} value={c.code}>{c.code}</option>
                            ))}
                          </Select>
                        </Td>
                        <Td>
                          <Input
                            size="sm"
                            type="number"
                            step="any"
                            value={line.currencyAmount}
                            onChange={(e) => updateLine(index, 'currencyAmount', e.target.value)}
                            isDisabled={!isForeign}
                            bg={!isForeign ? 'gray.100' : undefined}
                            placeholder={isForeign ? 'Сума' : '-'}
                            textAlign="right"
                          />
                        </Td>
                        <Td>
                          <Input
                            size="sm"
                            type="number"
                            step="any"
                            value={line.exchangeRate}
                            onChange={(e) => updateLine(index, 'exchangeRate', e.target.value)}
                            isDisabled={!isForeign}
                            bg={!isForeign ? 'gray.100' : undefined}
                            textAlign="right"
                          />
                        </Td>
                        <Td>
                          <Input
                            size="sm"
                            type="number"
                            step="0.01"
                            value={line.amount}
                            onChange={(e) => updateLine(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            textAlign="right"
                            fontWeight="medium"
                          />
                        </Td>
                        <Td>
                          {lines.length > 1 && (
                            <IconButton
                              aria-label="Remove line"
                              icon={<Text>&times;</Text>}
                              onClick={() => removeLine(index)}
                              colorScheme="red"
                              variant="ghost"
                              size="sm"
                            />
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
                <Tfoot>
                  <Tr bg="gray.100">
                    <Td colSpan={5} textAlign="right" fontWeight="medium">
                      <Text as="span" color="blue.700">Дт: {formatCurrency(totalDebit)}</Text>
                      <Text as="span" mx={3}>|</Text>
                      <Text as="span" color="green.700">Кт: {formatCurrency(totalCredit)}</Text>
                    </Td>
                    <Td isNumeric fontWeight="bold">
                      <Text color={isBalanced ? 'green.600' : 'red.600'}>
                        {isBalanced ? '✓' : formatCurrency(Math.abs(totalDebit - totalCredit))}
                      </Text>
                    </Td>
                    <Td></Td>
                  </Tr>
                </Tfoot>
              </Table>
            </Box>
          </Box>

          {/* Actions */}
          <HStack justify="flex-end" spacing={4}>
            <Button variant="ghost" onClick={() => navigate('/journal/entries')}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              colorScheme="brand"
              isLoading={isSaving}
              isDisabled={!isBalanced}
            >
              {isEdit ? t('common.update') : t('common.create')}
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Account Search Modal */}
      <Modal isOpen={isAccountOpen} onClose={onAccountClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('journal.selectAccount')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              placeholder={t('journal.searchByCodeOrName')}
              autoFocus
              mb={4}
            />
            <Box maxH="400px" overflowY="auto">
              {filteredAccounts.length === 0 ? (
                <Text color="gray.500" textAlign="center" py={4}>
                  {t('accounts.no_results')}
                </Text>
              ) : (
                filteredAccounts.map(account => (
                  <Box
                    key={account.id}
                    p={3}
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    borderRadius="md"
                    onClick={() => selectAccount(account)}
                  >
                    <HStack>
                      <Text fontFamily="mono" fontWeight="medium" w="80px">{account.code}</Text>
                      <Box flex={1}>
                        <Text fontSize="sm">{account.name}</Text>
                        <HStack spacing={2} mt={1}>
                          {account.isAnalytical && (
                            <Badge colorScheme="cyan" fontSize="xs">{t('accounts.analytical')}</Badge>
                          )}
                        </HStack>
                      </Box>
                    </HStack>
                  </Box>
                ))
              )}
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Counterpart Modal */}
      <Modal isOpen={isCounterpartOpen} onClose={handleCloseCounterpartModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {showNewCounterpartForm ? t('counterparts.create') : t('journal.selectCounterpart')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {showNewCounterpartForm ? (
              <VStack spacing={4} align="stretch">
                {viesResult && (
                  <Alert status={viesResult.valid ? 'success' : 'warning'} borderRadius="md">
                    <AlertIcon />
                    <Box>
                      {viesResult.valid ? (
                        <>
                          <Text fontWeight="bold">{t('journal.validVatNumber')} ({viesResult.source})</Text>
                          {viesResult.name && <Text fontSize="sm">{t('common.name')}: {viesResult.name}</Text>}
                          {viesResult.longAddress && <Text fontSize="sm">{t('common.address')}: {viesResult.longAddress}</Text>}
                        </>
                      ) : (
                        <Text fontWeight="bold">{viesResult.errorMessage || t('journal.vatNotValid')}</Text>
                      )}
                    </Box>
                  </Alert>
                )}
                <FormControl>
                  <FormLabel>{t('counterparts.vat_number')}</FormLabel>
                  <HStack>
                    <Input
                      value={newCounterpart.vatNumber}
                      onChange={(e) => setNewCounterpart({ ...newCounterpart, vatNumber: e.target.value.toUpperCase() })}
                      placeholder="BG123456789"
                    />
                    <Button
                      onClick={handleValidateVat}
                      isLoading={viesLoading}
                      isDisabled={!newCounterpart.vatNumber}
                      colorScheme="green"
                    >
                      {t('journal.checkVies')}
                    </Button>
                  </HStack>
                </FormControl>
                <FormControl>
                  <FormLabel>{t('journal.counterpartName')}</FormLabel>
                  <Input
                    value={newCounterpart.name}
                    onChange={(e) => setNewCounterpart({ ...newCounterpart, name: e.target.value })}
                    placeholder={t('journal.counterpartNamePlaceholder')}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('counterparts.eik')}</FormLabel>
                  <Input
                    value={newCounterpart.eik}
                    onChange={(e) => setNewCounterpart({ ...newCounterpart, eik: e.target.value })}
                    placeholder="123456789"
                  />
                </FormControl>
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                <Input
                  value={counterpartSearch}
                  onChange={(e) => setCounterpartSearch(e.target.value)}
                  placeholder={t('journal.searchByNameEikVat')}
                  autoFocus
                />
                <Divider />
                <Box maxH="300px" overflowY="auto">
                  {filteredCounterparts.length === 0 ? (
                    <Text color="gray.500" textAlign="center" py={4}>
                      {t('counterparts.no_results')}
                    </Text>
                  ) : (
                    filteredCounterparts.map(counterpart => (
                      <Box
                        key={counterpart.id}
                        p={3}
                        cursor="pointer"
                        _hover={{ bg: 'gray.50' }}
                        borderRadius="md"
                        onClick={() => handleSelectCounterpart(counterpart)}
                      >
                        <Text fontWeight="medium">{counterpart.name}</Text>
                        <HStack spacing={2} mt={1}>
                          {counterpart.eik && (
                            <Badge colorScheme="gray" fontSize="xs">
                              {t('companies.eik_prefix')}{counterpart.eik}
                            </Badge>
                          )}
                          {counterpart.vatNumber && (
                            <Badge colorScheme="blue" fontSize="xs">
                              {counterpart.vatNumber}
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                    ))
                  )}
                </Box>
                <Divider />
                <Button
                  onClick={() => setShowNewCounterpartForm(true)}
                  colorScheme="blue"
                  variant="ghost"
                  w="full"
                >
                  + {t('journal.createNewCounterpart')}
                </Button>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {showNewCounterpartForm ? (
              <HStack spacing={3}>
                <Button variant="ghost" onClick={() => setShowNewCounterpartForm(false)}>
                  {t('common.back')}
                </Button>
                <Button
                  colorScheme="brand"
                  onClick={handleCreateCounterpart}
                  isDisabled={!newCounterpart.name.trim()}
                >
                  {t('counterparts.create')}
                </Button>
              </HStack>
            ) : (
              <Button variant="ghost" onClick={handleCloseCounterpartModal}>
                {t('common.cancel')}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
