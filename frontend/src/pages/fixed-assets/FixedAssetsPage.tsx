import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, Text, Button, Card, CardBody,
  Table, Thead, Tbody, Tr, Th, Td,
  Badge, HStack, VStack, SimpleGrid, Spinner, Center,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Select, Textarea,
  useDisclosure, useToast, useColorModeValue,
  Stat, StatLabel, StatNumber, StatHelpText,
  Alert, AlertIcon, Icon, IconButton, Menu, MenuButton, MenuList, MenuItem,
  Flex,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { fixedAssetsApi } from '../../api/fixedAssets';
import type { FixedAsset, FixedAssetCategory, CalculatedPeriod, CalculationResult, PostResult, DepreciationJournal } from '../../types';

// Icons
const AddIcon = () => <span>+</span>;
const TrashIcon = () => <span>&#128465;</span>;
const RefreshIcon = () => <span>&#8635;</span>;
const MoreIcon = () => <span>&#8942;</span>;
const CheckIcon = () => <span>&#10003;</span>;
const CalculatorIcon = () => <span>&#128425;</span>;

export default function FixedAssetsPage() {
  const { t } = useTranslation();
  const { currentCompany } = useCompany();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const companyId = currentCompany?.id;

  // State
  const [tabIndex, setTabIndex] = useState(0);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<FixedAssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Depreciation state
  const [calculatedPeriods, setCalculatedPeriods] = useState<CalculatedPeriod[]>([]);
  const [calcYear, setCalcYear] = useState(new Date().getFullYear());
  const [calcMonth, setCalcMonth] = useState(new Date().getMonth() + 1);
  const [calculating, setCalculating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [postResult, setPostResult] = useState<PostResult | null>(null);

  // Journal state
  const [journalYear, setJournalYear] = useState(new Date().getFullYear());
  const [journalMonth, setJournalMonth] = useState<number | null>(null);
  const [journalEntries, setJournalEntries] = useState<DepreciationJournal[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);

  // Modal state
  const addModal = useDisclosure();
  const [formData, setFormData] = useState({
    name: '',
    inventoryNumber: '',
    description: '',
    categoryId: 0,
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: '',
    residualValue: '0',
    documentNumber: '',
    documentDate: '',
    putIntoServiceDate: '',
    depreciationMethod: 'LINEAR',
  });
  const [saving, setSaving] = useState(false);

  const monthNames = [
    'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
    'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
  ];

  useEffect(() => {
    if (companyId) {
      loadAssets();
      loadCategories();
      loadCalculatedPeriods();
    }
  }, [companyId, statusFilter]);

  useEffect(() => {
    if (companyId && tabIndex === 3) {
      loadJournal();
    }
  }, [companyId, tabIndex, journalYear, journalMonth]);

  const loadAssets = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await fixedAssetsApi.getAll(companyId, statusFilter || undefined);
      setAssets(data);
    } catch (error) {
      toast({ title: 'Грешка при зареждане', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!companyId) return;
    try {
      const data = await fixedAssetsApi.getCategories(companyId);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCalculatedPeriods = async () => {
    if (!companyId) return;
    try {
      const data = await fixedAssetsApi.getCalculatedPeriods(companyId);
      setCalculatedPeriods(data);
    } catch (error) {
      console.error('Error loading periods:', error);
    }
  };

  const loadJournal = async () => {
    if (!companyId) return;
    setJournalLoading(true);
    try {
      const data = await fixedAssetsApi.getDepreciationJournal(companyId, journalYear, journalMonth || undefined);
      setJournalEntries(data);
    } catch (error) {
      toast({ title: 'Грешка при зареждане на дневника', status: 'error' });
    } finally {
      setJournalLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!companyId) return;
    setCalculating(true);
    setCalcResult(null);
    setPostResult(null);
    try {
      const result = await fixedAssetsApi.calculateDepreciation(companyId, calcYear, calcMonth);
      setCalcResult(result);
      loadCalculatedPeriods();
      loadAssets();
      toast({ title: 'Амортизацията е изчислена', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при изчисляване', status: 'error' });
    } finally {
      setCalculating(false);
    }
  };

  const handlePost = async () => {
    if (!companyId) return;
    if (!confirm('Сигурни ли сте, че искате да осчетоводите амортизацията?')) return;
    setPosting(true);
    try {
      const result = await fixedAssetsApi.postDepreciation(companyId, calcYear, calcMonth);
      setPostResult(result);
      loadCalculatedPeriods();
      loadAssets();
      toast({ title: 'Амортизацията е осчетоводена', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при осчетоводяване', status: 'error' });
    } finally {
      setPosting(false);
    }
  };

  const handleCreateAsset = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      await fixedAssetsApi.create({
        ...formData,
        companyId,
        categoryId: formData.categoryId,
        acquisitionCost: parseFloat(formData.acquisitionCost) || 0,
        residualValue: parseFloat(formData.residualValue) || 0,
      });
      toast({ title: 'Активът е създаден', status: 'success' });
      addModal.onClose();
      loadAssets();
      setFormData({
        name: '',
        inventoryNumber: '',
        description: '',
        categoryId: 0,
        acquisitionDate: new Date().toISOString().split('T')[0],
        acquisitionCost: '',
        residualValue: '0',
        documentNumber: '',
        documentDate: '',
        putIntoServiceDate: '',
        depreciationMethod: 'LINEAR',
      });
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при създаване', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('modals.confirmations.delete_fixed_asset') || 'Сигурни ли сте, че искате да изтриете този актив?')) return;
    try {
      await fixedAssetsApi.delete(id);
      toast({ title: 'Активът е изтрит', status: 'success' });
      loadAssets();
    } catch (error) {
      toast({ title: 'Грешка при изтриване', status: 'error' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: 'BGN',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      ACTIVE: { color: 'green', label: 'Активен' },
      DEPRECIATED: { color: 'blue', label: 'Изхабен' },
      DISPOSED: { color: 'red', label: 'Бракуван' },
      SOLD: { color: 'orange', label: 'Продаден' },
    };
    const { color, label } = config[status] || { color: 'gray', label: status };
    return <Badge colorScheme={color}>{label}</Badge>;
  };

  // Stats
  const stats = {
    total: assets.length,
    active: assets.filter(a => a.status === 'ACTIVE').length,
    totalValue: assets.reduce((sum, a) => sum + a.acquisitionCost, 0),
    totalBookValue: assets.reduce((sum, a) => sum + a.accountingBookValue, 0),
  };

  // Journal totals
  const journalTotals = journalEntries.reduce(
    (acc, entry) => ({
      accountingAmount: acc.accountingAmount + (entry.accountingDepreciationAmount || 0),
      taxAmount: acc.taxAmount + (entry.taxDepreciationAmount || 0),
      count: acc.count + 1,
      posted: acc.posted + (entry.isPosted ? 1 : 0),
    }),
    { accountingAmount: 0, taxAmount: 0, count: 0, posted: 0 }
  );

  if (!companyId) {
    return (
      <Box p={6}>
        <Alert status="warning">
          <AlertIcon />
          Моля, изберете фирма
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={6}>
        <Box>
          <Heading size="lg" mb={1}>Дълготрайни материални активи</Heading>
          <Text color="gray.500">Управление на ДМА и амортизации</Text>
        </Box>
        <Button
          leftIcon={<Icon as={AddIcon} />}
          colorScheme="brand"
          onClick={addModal.onOpen}
        >
          Добави актив
        </Button>
      </HStack>

      {/* Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Общо активи</StatLabel>
          <StatNumber>{stats.total}</StatNumber>
          <StatHelpText>{stats.active} активни</StatHelpText>
        </Stat>
        <Stat bg={cardBg} p={4} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Първоначална стойност</StatLabel>
          <StatNumber fontSize="xl">{formatCurrency(stats.totalValue)}</StatNumber>
        </Stat>
        <Stat bg={cardBg} p={4} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Балансова стойност</StatLabel>
          <StatNumber fontSize="xl">{formatCurrency(stats.totalBookValue)}</StatNumber>
        </Stat>
        <Stat bg={cardBg} p={4} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Начислена амортизация</StatLabel>
          <StatNumber fontSize="xl">{formatCurrency(stats.totalValue - stats.totalBookValue)}</StatNumber>
        </Stat>
      </SimpleGrid>

      <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" colorScheme="brand">
        <TabList bg={cardBg} borderBottomWidth="1px" borderColor={borderColor} px={4}>
          <Tab fontWeight="medium">Активи</Tab>
          <Tab fontWeight="medium">Категории</Tab>
          <Tab fontWeight="medium">Изчисляване</Tab>
          <Tab fontWeight="medium">Дневник</Tab>
        </TabList>

        <TabPanels>
          {/* Assets Tab */}
          <TabPanel px={0}>
            <Card bg={cardBg} mb={4}>
              <CardBody py={3}>
                <HStack>
                  <Select
                    maxW="200px"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    placeholder="Всички статуси"
                  >
                    <option value="ACTIVE">Активни</option>
                    <option value="DEPRECIATED">Изхабени</option>
                    <option value="DISPOSED">Бракувани</option>
                    <option value="SOLD">Продадени</option>
                  </Select>
                  <Button
                    variant="ghost"
                    leftIcon={<Icon as={RefreshIcon} />}
                    onClick={loadAssets}
                    isLoading={loading}
                  >
                    Обнови
                  </Button>
                </HStack>
              </CardBody>
            </Card>

            {loading ? (
              <Center py={12}>
                <Spinner size="xl" color="brand.500" />
              </Center>
            ) : assets.length === 0 ? (
              <Card bg={cardBg}>
                <CardBody py={12} textAlign="center">
                  <Text color="gray.500">Няма намерени активи</Text>
                  <Button mt={4} colorScheme="brand" onClick={addModal.onOpen}>
                    Добави първия актив
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <Card bg={cardBg} overflow="hidden">
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg={hoverBg}>
                      <Tr>
                        <Th>Инв. №</Th>
                        <Th>Наименование</Th>
                        <Th>Категория</Th>
                        <Th isNumeric>Първонач. ст-ст</Th>
                        <Th isNumeric>Балансова ст-ст</Th>
                        <Th isNumeric>Амортизация %</Th>
                        <Th>Статус</Th>
                        <Th w="60px"></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {assets.map(asset => (
                        <Tr key={asset.id} _hover={{ bg: hoverBg }}>
                          <Td fontFamily="mono" fontWeight="medium">{asset.inventoryNumber}</Td>
                          <Td>
                            <Text fontWeight="medium">{asset.name}</Text>
                            {asset.description && (
                              <Text fontSize="xs" color="gray.500">{asset.description}</Text>
                            )}
                          </Td>
                          <Td>
                            {categories.find(c => c.id === asset.categoryId)?.name || '-'}
                          </Td>
                          <Td isNumeric>{formatCurrency(asset.acquisitionCost)}</Td>
                          <Td isNumeric>{formatCurrency(asset.accountingBookValue)}</Td>
                          <Td isNumeric>{asset.accountingDepreciationRate}%</Td>
                          <Td>{getStatusBadge(asset.status)}</Td>
                          <Td>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<Icon as={MoreIcon} />}
                                variant="ghost"
                                size="sm"
                              />
                              <MenuList>
                                <MenuItem
                                  icon={<Icon as={TrashIcon} />}
                                  color="red.500"
                                  onClick={() => handleDelete(asset.id)}
                                >
                                  Изтрий
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Card>
            )}
          </TabPanel>

          {/* Categories Tab */}
          <TabPanel px={0}>
            <Alert status="info" mb={4} borderRadius="lg">
              <AlertIcon />
              <Box>
                <Text fontWeight="medium">Категории ДМА по ЗКПО</Text>
                <Text fontSize="sm">
                  Категориите определят максималните данъчни норми на амортизация според чл. 55 от ЗКПО.
                </Text>
              </Box>
            </Alert>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {categories.map(category => (
                <Card key={category.id} bg={cardBg}>
                  <CardBody>
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="bold">{category.name}</Text>
                      <Badge colorScheme="blue">
                        {category.minDepreciationRate}-{category.maxDepreciationRate}%
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.500">{category.description}</Text>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>

            {categories.length === 0 && (
              <Card bg={cardBg}>
                <CardBody py={12} textAlign="center">
                  <Text color="gray.500">Няма категории. Добавете ги в базата данни.</Text>
                </CardBody>
              </Card>
            )}
          </TabPanel>

          {/* Depreciation Calculation Tab */}
          <TabPanel px={0}>
            {/* Calculated Periods */}
            {calculatedPeriods.length > 0 && (
              <Card bg="blue.50" mb={6}>
                <CardBody>
                  <Text fontWeight="medium" mb={3}>Изчислени и осчетоводени периоди</Text>
                  <Flex wrap="wrap" gap={2}>
                    {calculatedPeriods.map((period, idx) => (
                      <Badge
                        key={idx}
                        colorScheme={period.isPosted ? 'green' : 'yellow'}
                        px={3}
                        py={1}
                        borderRadius="md"
                      >
                        {period.periodDisplay}
                        {period.isPosted && ' ✓'}
                      </Badge>
                    ))}
                  </Flex>
                  <Text fontSize="sm" color="blue.700" mt={2}>
                    Зелени: осчетоводени | Жълти: неосчетоводени
                  </Text>
                </CardBody>
              </Card>
            )}

            {/* Period Selection */}
            <Card bg={cardBg} mb={6}>
              <CardBody>
                <Text fontWeight="medium" mb={4}>Изчисляване на месечна амортизация</Text>
                <HStack spacing={4} wrap="wrap">
                  <FormControl maxW="150px">
                    <FormLabel>Година</FormLabel>
                    <Select value={calcYear} onChange={e => setCalcYear(parseInt(e.target.value))}>
                      {[calcYear - 1, calcYear, calcYear + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px">
                    <FormLabel>Месец</FormLabel>
                    <Select value={calcMonth} onChange={e => setCalcMonth(parseInt(e.target.value))}>
                      {monthNames.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>{name}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <Box pt={8}>
                    <Button
                      colorScheme="blue"
                      leftIcon={<Icon as={CalculatorIcon} />}
                      onClick={handleCalculate}
                      isLoading={calculating}
                    >
                      Изчисли амортизация
                    </Button>
                  </Box>
                </HStack>
                <Text fontSize="sm" color="gray.500" mt={3}>
                  Изчислява се месечна амортизация за всички активни ДМА. Счетоводна и данъчна амортизация се изчисляват отделно.
                </Text>
              </CardBody>
            </Card>

            {/* Calculation Result */}
            {calcResult && (
              <Card bg={calcResult.calculated.length > 0 ? 'green.50' : 'yellow.50'} mb={6}>
                <CardBody>
                  <Text fontWeight="medium" mb={4}>
                    {calcResult.calculated.length > 0 ? 'Успешно изчисление' : 'Няма активи за амортизация'}
                  </Text>
                  {calcResult.calculated.length > 0 && (
                    <>
                      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={4}>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Обработени активи</Text>
                          <Text fontSize="2xl" fontWeight="bold">{calcResult.calculated.length}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Счетоводна амортизация</Text>
                          <Text fontSize="xl" fontWeight="bold">{formatCurrency(calcResult.totalAccountingAmount)}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Данъчна амортизация</Text>
                          <Text fontSize="xl" fontWeight="bold">{formatCurrency(calcResult.totalTaxAmount)}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Разлика</Text>
                          <Text fontSize="xl" fontWeight="bold">
                            {formatCurrency(Math.abs(calcResult.totalTaxAmount - calcResult.totalAccountingAmount))}
                          </Text>
                        </Box>
                      </SimpleGrid>

                      {!postResult && (
                        <Card bg="white" borderWidth="1px" borderColor="green.200">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <Box>
                                <Text fontWeight="medium">Осчетоводяване</Text>
                                <Text fontSize="sm" color="gray.500">
                                  Създава журнален запис: Дт 603 / Кт 241
                                </Text>
                              </Box>
                              <Button
                                colorScheme="green"
                                leftIcon={<Icon as={CheckIcon} />}
                                onClick={handlePost}
                                isLoading={posting}
                              >
                                Осчетоводи
                              </Button>
                            </Flex>
                          </CardBody>
                        </Card>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Post Result */}
            {postResult && (
              <Card bg="blue.50">
                <CardBody>
                  <Text fontWeight="medium" mb={3}>Успешно осчетоводяване</Text>
                  <SimpleGrid columns={3} spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Журнален запис</Text>
                      <Text fontWeight="bold">#{postResult.journalEntryId}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Обща сума</Text>
                      <Text fontWeight="bold">{formatCurrency(postResult.totalAmount)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Брой активи</Text>
                      <Text fontWeight="bold">{postResult.assetsCount}</Text>
                    </Box>
                  </SimpleGrid>
                </CardBody>
              </Card>
            )}
          </TabPanel>

          {/* Depreciation Journal Tab */}
          <TabPanel px={0}>
            <Card bg={cardBg} mb={4}>
              <CardBody py={3}>
                <HStack spacing={4}>
                  <FormControl maxW="150px">
                    <Select value={journalYear} onChange={e => setJournalYear(parseInt(e.target.value))}>
                      {[journalYear - 2, journalYear - 1, journalYear, journalYear + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px">
                    <Select
                      value={journalMonth || ''}
                      onChange={e => setJournalMonth(e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">Всички месеци</option>
                      {monthNames.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>{name}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="ghost"
                    leftIcon={<Icon as={RefreshIcon} />}
                    onClick={loadJournal}
                    isLoading={journalLoading}
                  >
                    Обнови
                  </Button>
                </HStack>
              </CardBody>
            </Card>

            {/* Summary */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={4}>
              <Stat bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <StatLabel>Записи</StatLabel>
                <StatNumber>{journalTotals.count}</StatNumber>
              </Stat>
              <Stat bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <StatLabel>Счетоводна амортизация</StatLabel>
                <StatNumber fontSize="lg">{formatCurrency(journalTotals.accountingAmount)}</StatNumber>
              </Stat>
              <Stat bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <StatLabel>Данъчна амортизация</StatLabel>
                <StatNumber fontSize="lg">{formatCurrency(journalTotals.taxAmount)}</StatNumber>
              </Stat>
              <Stat bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <StatLabel>Осчетоводени</StatLabel>
                <StatNumber>{journalTotals.posted} / {journalTotals.count}</StatNumber>
              </Stat>
            </SimpleGrid>

            {journalLoading ? (
              <Center py={12}>
                <Spinner size="xl" color="brand.500" />
              </Center>
            ) : journalEntries.length === 0 ? (
              <Card bg={cardBg}>
                <CardBody py={12} textAlign="center">
                  <Text color="gray.500">Няма записи за избрания период</Text>
                </CardBody>
              </Card>
            ) : (
              <Card bg={cardBg} overflow="hidden">
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg={hoverBg}>
                      <Tr>
                        <Th>Период</Th>
                        <Th>Актив</Th>
                        <Th isNumeric>Счет. амортизация</Th>
                        <Th isNumeric>Счет. балансова</Th>
                        <Th isNumeric>Данъчна амортизация</Th>
                        <Th isNumeric>Данъчна балансова</Th>
                        <Th isNumeric>Разлика</Th>
                        <Th>Статус</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {journalEntries.map(entry => {
                        const difference = (entry.taxDepreciationAmount || 0) - (entry.accountingDepreciationAmount || 0);
                        return (
                          <Tr key={entry.id} _hover={{ bg: hoverBg }}>
                            <Td>{new Date(entry.period).toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })}</Td>
                            <Td>
                              <Text fontWeight="medium">{entry.fixedAssetInventoryNumber}</Text>
                              <Text fontSize="xs" color="gray.500">{entry.fixedAssetName}</Text>
                            </Td>
                            <Td isNumeric>{formatCurrency(entry.accountingDepreciationAmount)}</Td>
                            <Td isNumeric>
                              <Text fontSize="xs" color="gray.500">{formatCurrency(entry.accountingBookValueBefore)}</Text>
                              <Text>{formatCurrency(entry.accountingBookValueAfter)}</Text>
                            </Td>
                            <Td isNumeric>{formatCurrency(entry.taxDepreciationAmount)}</Td>
                            <Td isNumeric>
                              <Text fontSize="xs" color="gray.500">{formatCurrency(entry.taxBookValueBefore)}</Text>
                              <Text>{formatCurrency(entry.taxBookValueAfter)}</Text>
                            </Td>
                            <Td isNumeric>
                              <Text color={difference > 0 ? 'green.600' : difference < 0 ? 'red.600' : 'gray.500'}>
                                {difference !== 0 ? formatCurrency(Math.abs(difference)) : '-'}
                              </Text>
                            </Td>
                            <Td>
                              {entry.isPosted ? (
                                <VStack spacing={0} align="start">
                                  <Badge colorScheme="green">Осчетоводен</Badge>
                                  {entry.journalEntryId && (
                                    <Text fontSize="xs" color="gray.500">JE #{entry.journalEntryId}</Text>
                                  )}
                                </VStack>
                              ) : (
                                <Badge colorScheme="yellow">Неосчетоводен</Badge>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              </Card>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Add Asset Modal */}
      <Modal isOpen={addModal.isOpen} onClose={addModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Добавяне на нов актив</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Наименование</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Лаптоп Dell XPS 15"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Инвентарен номер</FormLabel>
                  <Input
                    value={formData.inventoryNumber}
                    onChange={e => setFormData({ ...formData, inventoryNumber: e.target.value })}
                    placeholder="ДМА-001"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Описание</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Допълнително описание..."
                  rows={2}
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Категория</FormLabel>
                  <Select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                    placeholder="Избери категория"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Метод на амортизация</FormLabel>
                  <Select
                    value={formData.depreciationMethod}
                    onChange={e => setFormData({ ...formData, depreciationMethod: e.target.value })}
                  >
                    <option value="LINEAR">Линеен</option>
                    <option value="DECLINING_BALANCE">Намаляващ остатък</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={3} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Дата на придобиване</FormLabel>
                  <Input
                    type="date"
                    value={formData.acquisitionDate}
                    onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Първоначална стойност</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.acquisitionCost}
                    onChange={e => setFormData({ ...formData, acquisitionCost: e.target.value })}
                    placeholder="0.00"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Остатъчна стойност</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.residualValue}
                    onChange={e => setFormData({ ...formData, residualValue: e.target.value })}
                    placeholder="0.00"
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Номер на документ</FormLabel>
                  <Input
                    value={formData.documentNumber}
                    onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="Фактура №..."
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Дата на документ</FormLabel>
                  <Input
                    type="date"
                    value={formData.documentDate}
                    onChange={e => setFormData({ ...formData, documentDate: e.target.value })}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Дата на въвеждане в експлоатация</FormLabel>
                <Input
                  type="date"
                  value={formData.putIntoServiceDate}
                  onChange={e => setFormData({ ...formData, putIntoServiceDate: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={addModal.onClose}>Отказ</Button>
            <Button
              colorScheme="brand"
              onClick={handleCreateAsset}
              isLoading={saving}
              isDisabled={!formData.name || !formData.inventoryNumber || !formData.categoryId || !formData.acquisitionCost}
            >
              Създай
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
