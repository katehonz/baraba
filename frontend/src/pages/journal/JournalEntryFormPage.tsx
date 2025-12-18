import { useState, useEffect } from 'react';
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
  GridItem,
  Divider,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { accountsApi } from '../../api/accounts';
import { counterpartsApi } from '../../api/counterparts';
import { currenciesApi } from '../../api/currencies';
import { journalApi } from '../../api/journal';
import { viesApi } from '../../api/vies';
import type { Account, Counterpart, Currency, CreateJournalEntryInput, CreateEntryLineInput } from '../../types';

const newEmptyLine = (): CreateEntryLineInput => ({
    accountId: 0,
    debitAmount: 0,
    creditAmount: 0,
    description: '',
    currencyCode: 'BGN',
    currencyAmount: 0,
    exchangeRate: 1,
});

export default function JournalEntryFormPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { companyId } = useCompany();
    const isEdit = !!id;

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const [formData, setFormData] = useState<CreateJournalEntryInput>({
        documentNumber: '',
        description: '',
        companyId: companyId || 0,
        lines: [newEmptyLine(), newEmptyLine()],
    });
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [counterparts, setCounterparts] = useState<Counterpart[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { isOpen, onOpen, onClose } = useDisclosure();
    const [counterpartSearch, setCounterpartSearch] = useState('');
    const [showNewCounterpartForm, setShowNewCounterpartForm] = useState(false);
    const [newCounterpart, setNewCounterpart] = useState({
      name: '',
      eik: '',
      vatNumber: '',
    });
    const [viesLoading, setViesLoading] = useState(false);
    const [viesResult, setViesResult] = useState<{ valid: boolean; name?: string; longAddress?: string; countryCode?: string; vatNumber?: string; errorMessage?: string; source?: string } | null>(null);

    useEffect(() => {
        if (companyId) {
            accountsApi.getByCompany(companyId).then(setAccounts);
            counterpartsApi.getByCompany(companyId).then(setCounterparts);
            currenciesApi.getAll().then(setCurrencies);
        }
    }, [companyId]);

    useEffect(() => {
        if (isEdit && id) {
            setIsLoading(true);
            journalApi.getById(parseInt(id, 10))
                .then(data => {
                    const { entry, lines } = data;
                    setFormData({
                        documentNumber: entry.documentNumber,
                        description: entry.description,
                        companyId: entry.companyId,
                        counterpartId: entry.counterpartId ?? undefined,
                        lines: lines.map(line => ({
                            accountId: line.accountId,
                            debitAmount: line.debitAmount,
                            creditAmount: line.creditAmount,
                            description: line.description,
                        })),
                    });
                })
                .catch(err => setError(err.message))
                .finally(() => setIsLoading(false));
        }
    }, [id, isEdit]);

    const handleLineChange = (index: number, field: keyof CreateEntryLineInput, value: number | string) => {
        const newLines = [...(formData.lines || [])];
        const line = { ...newLines[index], [field]: value };

        if (line.currencyCode !== 'BGN' && (field === 'currencyAmount' || field === 'exchangeRate')) {
            const amount = (line.currencyAmount || 0) * (line.exchangeRate || 1);
            if (line.debitAmount && line.debitAmount > 0) {
                line.debitAmount = amount;
            } else {
                line.creditAmount = amount;
            }
        }

        newLines[index] = line;
        setFormData({ ...formData, lines: newLines });
    };

    const addLine = () => {
        setFormData({ ...formData, lines: [...(formData.lines || []), newEmptyLine()] });
    };

    const removeLine = (index: number) => {
        const newLines = [...(formData.lines || [])];
        newLines.splice(index, 1);
        setFormData({ ...formData, lines: newLines });
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
            eik: result.vatNumber.replace(/^BG/i, '') || prev.eik,
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
        setFormData(prev => ({ ...prev, counterpartId: created.id }));
        setShowNewCounterpartForm(false);
        onClose();
        setNewCounterpart({ name: '', eik: '', vatNumber: '' });
        setViesResult(null);
        setCounterpartSearch('');
      } catch (err) {
        console.error('Error creating counterpart:', err);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!companyId) {
            setError('Моля, изберете фирма');
            return;
        }

        const input: CreateJournalEntryInput = { ...formData, companyId };

        try {
            if (isEdit && id) {
                await journalApi.update(parseInt(id, 10), input);
            } else {
                await journalApi.create(input);
            }
            navigate('/journal/entries');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Грешка');
        }
    };

    const handleCloseModal = () => {
      onClose();
      setShowNewCounterpartForm(false);
      setCounterpartSearch('');
      setNewCounterpart({ name: '', eik: '', vatNumber: '' });
      setViesResult(null);
    };

    const filteredCounterparts = counterparts.filter(c =>
      c.name.toLowerCase().includes(counterpartSearch.toLowerCase()) ||
      (c.eik && c.eik.includes(counterpartSearch)) ||
      (c.vatNumber && c.vatNumber.toLowerCase().includes(counterpartSearch.toLowerCase()))
    );

    const selectedCounterpart = counterparts.find(c => c.id === formData.counterpartId);

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
        <VStack spacing={6} align="stretch">
            <HStack justify="space-between">
                <Heading size="lg">{isEdit ? t('journal.edit_entry') : t('journal.new_entry')}</Heading>
            </HStack>

            {error && (
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            <Box as="form" onSubmit={handleSubmit}>
                <VStack spacing={6} align="stretch">
                    <Box bg={cardBg} p={6} borderRadius="xl" border="1px" borderColor={borderColor}>
                        <VStack spacing={4} align="stretch">
                            <Heading size="md">{t('journal.basic_info')}</Heading>
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel>{t('journal.documentNumber')}</FormLabel>
                                        <Input
                                            value={formData.documentNumber}
                                            onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                                            placeholder="0000000001"
                                        />
                                    </FormControl>
                                </GridItem>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel>{t('counterparts.title')}</FormLabel>
                                        <HStack>
                                            <Box flex="1" onClick={onOpen} cursor="pointer">
                                                <Input
                                                    value={selectedCounterpart?.name || ''}
                                                    placeholder={t('journal.selectCounterpart')}
                                                    readOnly
                                                    cursor="pointer"
                                                />
                                            </Box>
                                            <Button onClick={onOpen} colorScheme="blue" variant="outline">
                                                ...
                                            </Button>
                                        </HStack>
                                    </FormControl>
                                </GridItem>
                            </Grid>
                            <FormControl>
                                <FormLabel>{t('journal.description')}</FormLabel>
                                <Input
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('journal.description_placeholder')}
                                />
                            </FormControl>
                        </VStack>
                    </Box>

                    <Box bg={cardBg} p={6} borderRadius="xl" border="1px" borderColor={borderColor}>
                        <VStack spacing={4} align="stretch">
                            <HStack justify="space-between">
                                <Heading size="md">{t('journal.lines')}</Heading>
                                <Button onClick={addLine} colorScheme="blue" size="sm">
                                    + {t('journal.addLine')}
                                </Button>
                            </HStack>

                            <Box overflowX="auto">
                                <Grid templateColumns="2fr 1fr 1fr 2fr 100px 100px 100px 40px" gap={2} mb={2} fontWeight="bold" fontSize="sm" color="gray.600">
                                    <Text>{t('journal.account')}</Text>
                                    <Text>{t('accounts.debit')}</Text>
                                    <Text>{t('accounts.credit')}</Text>
                                    <Text>{t('journal.description')}</Text>
                                    <Text>{t('currencies.title')}</Text>
                                    <Text>{t('journal.currencyAmount')}</Text>
                                    <Text>{t('journal.exchangeRate')}</Text>
                                    <Text></Text>
                                </Grid>

                                {formData.lines?.map((line, index) => (
                                    <Grid key={index} templateColumns="2fr 1fr 1fr 2fr 100px 100px 100px 40px" gap={2} mb={2}>
                                        <Select
                                            value={line.accountId}
                                            onChange={(e) => handleLineChange(index, 'accountId', parseInt(e.target.value, 10))}
                                            size="sm"
                                        >
                                            <option value={0}>{t('journal.selectAccount')}</option>
                                            {accounts.map(a => (
                                                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                            ))}
                                        </Select>
                                        <Input
                                            type="number"
                                            value={line.debitAmount || ''}
                                            onChange={(e) => handleLineChange(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                                            size="sm"
                                        />
                                        <Input
                                            type="number"
                                            value={line.creditAmount || ''}
                                            onChange={(e) => handleLineChange(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                                            size="sm"
                                        />
                                        <Input
                                            value={line.description}
                                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                            size="sm"
                                        />
                                        <Select
                                            value={line.currencyCode}
                                            onChange={(e) => handleLineChange(index, 'currencyCode', e.target.value)}
                                            size="sm"
                                        >
                                            {currencies.map(c => (
                                                <option key={c.id} value={c.code}>{c.code}</option>
                                            ))}
                                        </Select>
                                        <Input
                                            type="number"
                                            value={line.currencyAmount || ''}
                                            onChange={(e) => handleLineChange(index, 'currencyAmount', parseFloat(e.target.value) || 0)}
                                            size="sm"
                                            isDisabled={line.currencyCode === 'BGN'}
                                        />
                                        <Input
                                            type="number"
                                            value={line.exchangeRate || ''}
                                            onChange={(e) => handleLineChange(index, 'exchangeRate', parseFloat(e.target.value) || 0)}
                                            size="sm"
                                            isDisabled={line.currencyCode === 'BGN'}
                                        />
                                        <IconButton
                                            aria-label="Remove line"
                                            icon={<Text>×</Text>}
                                            onClick={() => removeLine(index)}
                                            colorScheme="red"
                                            variant="ghost"
                                            size="sm"
                                        />
                                    </Grid>
                                ))}
                            </Box>
                        </VStack>
                    </Box>

                    <HStack justify="flex-end" spacing={4}>
                        <Button variant="ghost" onClick={() => navigate('/journal/entries')}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" colorScheme="brand">
                            {t('common.save')}
                        </Button>
                    </HStack>
                </VStack>
            </Box>

            <Modal isOpen={isOpen} onClose={handleCloseModal} size="lg">
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
                                                onClick={() => {
                                                    setFormData({ ...formData, counterpartId: counterpart.id });
                                                    handleCloseModal();
                                                }}
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
                            <Button variant="ghost" onClick={handleCloseModal}>
                                {t('common.cancel')}
                            </Button>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </VStack>
    );
}
