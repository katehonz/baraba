import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  IconButton,
  Input,
  Select,
  FormControl,
  FormLabel,
  Switch,
  Badge,
  Card,
  CardBody,
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
  Tooltip,
  Alert,
  AlertIcon,
  ButtonGroup,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { banksApi } from '../../api/banks';
import { accountsApi } from '../../api/accounts';
import { currenciesApi } from '../../api/currencies';
import { useTranslation } from 'react-i18next';
import type { BankProfile, CreateBankProfileInput, SaltEdgeProvider, Account, Currency, ImportFormat } from '../../types';

// Icons
const BankIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 10v7h3v-7H4zm6 0v7h4v-7h-4zm6 0v7h3.5v-7H16zM2 22h20v-3H2v3zm0-12l10-5 10 5v2H2v-2z"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/>
  </svg>
);

const SyncIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
  </svg>
);

const importFormatOptions: { value: ImportFormat; label: string }[] = [
  { value: 'UNICREDIT_MT940', label: 'UniCredit MT940 (SWIFT/TXT)' },
  { value: 'WISE_CAMT053', label: 'Wise CAMT.053 XML' },
  { value: 'REVOLUT_CAMT053', label: 'Revolut CAMT.053 XML' },
  { value: 'PAYSERA_CAMT053', label: 'Paysera CAMT.053 XML' },
  { value: 'POSTBANK_XML', label: 'Postbank XML' },
  { value: 'OBB_XML', label: 'OBB XML' },
  { value: 'CCB_CSV', label: 'CCB CSV' },
];

const initialFormState: Omit<CreateBankProfileInput, 'companyId'> = {
  name: '',
  iban: '',
  accountId: 0,
  bufferAccountId: 0,
  currencyCode: 'BGN',
  connectionType: 'FILE_IMPORT',
  importFormat: 'UNICREDIT_MT940',
  saltEdgeProviderCode: '',
  isActive: true,
};

export default function BanksPage() {
  const { t } = useTranslation();
  const { companyId } = useCompany();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [profiles, setProfiles] = useState<BankProfile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [providers, setProviders] = useState<SaltEdgeProvider[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [formState, setFormState] = useState(initialFormState);
  const [editingId, setEditingId] = useState<number | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  useEffect(() => {
    if (formState.connectionType === 'SALT_EDGE' && providers.length === 0) {
      loadProviders();
    }
  }, [formState.connectionType]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [profilesData, accountsData, currenciesData] = await Promise.all([
        banksApi.getByCompany(companyId),
        accountsApi.getByCompany(companyId),
        currenciesApi.getAll(),
      ]);
      setProfiles(profilesData);
      setAccounts(accountsData);
      setCurrencies(currenciesData);
    } catch (error) {
      toast({ title: t('banks.loadError'), status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const data = await banksApi.getSaltEdgeProviders('bg');
      setProviders(data);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  const analyticalAccounts = useMemo(
    () => accounts.filter(a => a.isAnalytical),
    [accounts]
  );

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.isActive === b.isActive) return a.name.localeCompare(b.name);
      return a.isActive ? -1 : 1;
    });
  }, [profiles]);

  const resetForm = () => {
    setFormState(initialFormState);
    setEditingId(null);
    onClose();
  };

  const handleEdit = (profile: BankProfile) => {
    setEditingId(profile.id);
    setFormState({
      name: profile.name || '',
      iban: profile.iban || '',
      accountId: profile.accountId || 0,
      bufferAccountId: profile.bufferAccountId || 0,
      currencyCode: profile.currencyCode || 'BGN',
      connectionType: profile.connectionType || 'FILE_IMPORT',
      importFormat: profile.importFormat || 'UNICREDIT_MT940',
      saltEdgeProviderCode: profile.saltEdgeProviderCode || '',
      isActive: profile.isActive,
    });
    onOpen();
  };

  const handleSubmit = async () => {
    if (!companyId) return;
    if (!formState.name.trim()) {
      toast({ title: t('banks.nameRequired'), status: 'warning' });
      return;
    }
    if (!formState.accountId) {
      toast({ title: t('banks.analyticalAccountRequired'), status: 'warning' });
      return;
    }
    if (!formState.bufferAccountId) {
      toast({ title: t('banks.bufferAccountRequired'), status: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const input: CreateBankProfileInput = {
        companyId,
        ...formState,
      };

      if (editingId) {
        await banksApi.update(editingId, input);
        toast({ title: t('banks.profileUpdated'), status: 'success' });
      } else {
        await banksApi.create(input);
        toast({ title: t('banks.profileCreated'), status: 'success' });
      }
      loadData();
      resetForm();
    } catch (error: any) {
      toast({ title: error.message || t('banks.saveError'), status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('modals.confirmations.delete_bank_profile'))) return;
    try {
      await banksApi.delete(id);
      toast({ title: t('banks.profileDeleted'), status: 'success' });
      loadData();
    } catch (error: any) {
      toast({ title: error.message || t('banks.deleteError'), status: 'error' });
    }
  };

  const handleConnect = async (profileId: number) => {
    setConnecting(true);
    try {
      const { connectUrl } = await banksApi.reconnectSaltEdge(profileId, window.location.href);
      if (connectUrl) {
        window.location.href = connectUrl;
      }
    } catch (error) {
      toast({ title: t('banks.connectionError'), status: 'error' });
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (profileId: number) => {
    try {
      const result = await banksApi.syncTransactions(profileId);
      toast({ title: t('banks.syncedTransactions', { count: result.count }), status: 'success' });
      loadData();
    } catch (error) {
      toast({ title: t('banks.syncError'), status: 'error' });
    }
  };

  const handleInitiateConnection = async () => {
    if (!companyId || !formState.saltEdgeProviderCode) return;
    setConnecting(true);
    try {
      const { connectUrl } = await banksApi.initiateSaltEdgeConnection(
        companyId,
        formState.saltEdgeProviderCode,
        window.location.href
      );
      if (connectUrl) {
        window.location.href = connectUrl;
      }
    } catch (error: any) {
      toast({ title: error.message || t('banks.connectionError'), status: 'error' });
    } finally {
      setConnecting(false);
    }
  };

  const getStatusBadge = (profile: BankProfile) => {
    if (profile.connectionType === 'SALT_EDGE') {
      const status = profile.saltEdgeStatus;
      if (status === 'active') return <Badge colorScheme="green">{t('banks.connected')}</Badge>;
      if (status === 'pending') return <Badge colorScheme="yellow">{t('banks.pending')}</Badge>;
      return <Badge colorScheme="red">{t('banks.disconnected')}</Badge>;
    }
    return profile.isActive ? <Badge colorScheme="green">{t('common.active')}</Badge> : <Badge colorScheme="gray">{t('common.inactive')}</Badge>;
  };

  const formatAccount = (accountId: number) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.code} - ${account.name}` : '-';
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" h="64">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={6}>
        <Box>
          <Heading size="lg" mb={1}>{t('banks.title')}</Heading>
          <Text color="gray.500">{t('banks.subtitle')}</Text>
        </Box>
        <Button leftIcon={<Icon as={BankIcon} />} colorScheme="brand" onClick={onOpen}>
          {t('banks.new')}
        </Button>
      </HStack>

      {/* Info Cards */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
        <Alert status="info" borderRadius="lg">
          <AlertIcon as={FileIcon} />
          <Box>
            <Text fontWeight="bold">{t('banks.fileImport')}</Text>
            <Text fontSize="sm">{t('banks.fileImportFormats')}</Text>
          </Box>
        </Alert>
        <Alert status="info" borderRadius="lg" colorScheme="purple">
          <AlertIcon as={LinkIcon} />
          <Box>
            <Text fontWeight="bold">{t('banks.openBanking')}</Text>
            <Text fontSize="sm">{t('banks.openBankingSync')}</Text>
          </Box>
        </Alert>
      </SimpleGrid>

      {/* Bank Profiles List */}
      <VStack spacing={4} align="stretch">
        {sortedProfiles.length === 0 ? (
          <Card bg={cardBg}>
            <CardBody>
              <Text textAlign="center" color="gray.500" py={8}>
                {t('banks.noProfiles')}
              </Text>
            </CardBody>
          </Card>
        ) : (
          sortedProfiles.map(profile => (
            <Card key={profile.id} bg={cardBg} borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <Flex justify="space-between" align="start" wrap="wrap" gap={4}>
                  <HStack spacing={4} align="start">
                    <Icon
                      as={profile.connectionType === 'SALT_EDGE' ? LinkIcon : BankIcon}
                      boxSize={10}
                      p={2}
                      bg={profile.connectionType === 'SALT_EDGE' ? 'purple.100' : 'blue.100'}
                      color={profile.connectionType === 'SALT_EDGE' ? 'purple.600' : 'blue.600'}
                      borderRadius="lg"
                    />
                    <Box>
                      <HStack mb={1}>
                        <Heading size="md">{profile.name}</Heading>
                        {getStatusBadge(profile)}
                        <Badge colorScheme={profile.connectionType === 'SALT_EDGE' ? 'purple' : 'blue'}>
                          {profile.connectionType === 'SALT_EDGE' ? t('banks.openBanking') : t('banks.fileImport')}
                        </Badge>
                      </HStack>
                      {profile.iban && <Text color="gray.500" fontSize="sm">{t('banks.iban')}: {profile.iban}</Text>}
                      {profile.saltEdgeProviderName && (
                        <Text color="gray.500" fontSize="sm">{t('banks.provider')}: {profile.saltEdgeProviderName}</Text>
                      )}
                      <SimpleGrid columns={2} spacing={4} mt={3}>
                        <Box>
                          <Text fontSize="xs" color="gray.500" fontWeight="bold">{t('banks.mainAccount')}</Text>
                          <Text fontSize="sm">{formatAccount(profile.accountId)}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500" fontWeight="bold">{t('banks.bufferAccount')}</Text>
                          <Text fontSize="sm">{formatAccount(profile.bufferAccountId)}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500" fontWeight="bold">{t('common.currency')}</Text>
                          <Text fontSize="sm">{profile.currencyCode}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500" fontWeight="bold">
                            {profile.connectionType === 'FILE_IMPORT' ? t('reports.format') : t('banks.lastSync')}
                          </Text>
                          <Text fontSize="sm">
                            {profile.connectionType === 'FILE_IMPORT'
                              ? importFormatOptions.find(o => o.value === profile.importFormat)?.label || profile.importFormat
                              : profile.saltEdgeLastSyncAt
                                ? new Date(profile.saltEdgeLastSyncAt).toLocaleString('bg-BG')
                                : t('banks.never')
                            }
                          </Text>
                        </Box>
                      </SimpleGrid>
                    </Box>
                  </HStack>

                  <ButtonGroup size="sm" variant="outline">
                    {profile.connectionType === 'SALT_EDGE' && (
                      <>
                        <Tooltip label={t('banks.syncTransactionsTooltip')}>
                          <IconButton
                            aria-label="Sync"
                            icon={<Icon as={SyncIcon} />}
                            colorScheme="green"
                            onClick={() => handleSync(profile.id)}
                          />
                        </Tooltip>
                        <Button
                          colorScheme="purple"
                          onClick={() => handleConnect(profile.id)}
                          isLoading={connecting}
                        >
                          {profile.saltEdgeStatus === 'active' ? t('banks.reconnect') : t('banks.connect')}
                        </Button>
                      </>
                    )}
                    <Button onClick={() => handleEdit(profile)}>{t('common.edit')}</Button>
                    <Button colorScheme="red" onClick={() => handleDelete(profile.id)}>{t('common.delete')}</Button>
                  </ButtonGroup>
                </Flex>
              </CardBody>
            </Card>
          ))
        )}
      </VStack>

      {/* Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={resetForm} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingId ? t('modals.titles.edit_bank_profile') : t('modals.titles.create_bank_profile')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {/* Connection Type */}
              <FormControl>
                <FormLabel>{t('banks.connectionType')}</FormLabel>
                <HStack spacing={4}>
                  <Button
                    flex={1}
                    variant={formState.connectionType === 'FILE_IMPORT' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    leftIcon={<Icon as={FileIcon} />}
                    onClick={() => setFormState(s => ({ ...s, connectionType: 'FILE_IMPORT' }))}
                  >
                    {t('banks.fileImport')}
                  </Button>
                  <Button
                    flex={1}
                    variant={formState.connectionType === 'SALT_EDGE' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    leftIcon={<Icon as={LinkIcon} />}
                    onClick={() => setFormState(s => ({ ...s, connectionType: 'SALT_EDGE' }))}
                  >
                    {t('banks.openBanking')}
                  </Button>
                </HStack>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>{t('banks.bankName')}</FormLabel>
                <Input
                  value={formState.name}
                  onChange={e => setFormState(s => ({ ...s, name: e.target.value }))}
                  placeholder={t('banks.namePlaceholder')}
                />
              </FormControl>

              <FormControl>
                <FormLabel>{t('banks.iban')}</FormLabel>
                <Input
                  value={formState.iban}
                  onChange={e => setFormState(s => ({ ...s, iban: e.target.value }))}
                  placeholder={t('banks.ibanPlaceholder')}
                />
              </FormControl>

              {formState.connectionType === 'FILE_IMPORT' && (
                <FormControl isRequired>
                  <FormLabel>{t('banks.importFormat')}</FormLabel>
                  <Select
                    value={formState.importFormat}
                    onChange={e => setFormState(s => ({ ...s, importFormat: e.target.value as ImportFormat }))}
                  >
                    {importFormatOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </FormControl>
              )}

              {formState.connectionType === 'SALT_EDGE' && (
                <FormControl isRequired>
                  <FormLabel>{t('banks.openBankingBank')}</FormLabel>
                  {loadingProviders ? (
                    <Spinner size="sm" />
                  ) : (
                    <Select
                      value={formState.saltEdgeProviderCode}
                      onChange={e => setFormState(s => ({ ...s, saltEdgeProviderCode: e.target.value }))}
                      placeholder={t('banks.selectBank')}
                    >
                      {providers.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </Select>
                  )}
                </FormControl>
              )}

              <Divider />

              <FormControl isRequired>
                <FormLabel>{t('banks.analyticalAccount')}</FormLabel>
                <Select
                  value={formState.accountId}
                  onChange={e => setFormState(s => ({ ...s, accountId: parseInt(e.target.value) }))}
                  placeholder={t('journal.selectAccount')}
                >
                  {analyticalAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>{t('banks.bufferAccount484')}</FormLabel>
                <Select
                  value={formState.bufferAccountId}
                  onChange={e => setFormState(s => ({ ...s, bufferAccountId: parseInt(e.target.value) }))}
                  placeholder={t('journal.selectAccount')}
                >
                  {analyticalAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>{t('common.currency')}</FormLabel>
                <Select
                  value={formState.currencyCode}
                  onChange={e => setFormState(s => ({ ...s, currencyCode: e.target.value }))}
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.nameBg || c.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>{t('common.active')}</FormLabel>
                <Switch
                  isChecked={formState.isActive}
                  onChange={e => setFormState(s => ({ ...s, isActive: e.target.checked }))}
                  colorScheme="brand"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              {formState.connectionType === 'SALT_EDGE' && !editingId && formState.saltEdgeProviderCode && (
                <Button
                  colorScheme="purple"
                  onClick={handleInitiateConnection}
                  isLoading={connecting}
                >
                  {t('banks.connectToBank')}
                </Button>
              )}
              <Button variant="ghost" onClick={resetForm}>{t('common.cancel')}</Button>
              <Button colorScheme="brand" onClick={handleSubmit} isLoading={saving}>
                {editingId ? t('common.save') : t('common.create')}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
