import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Select,
  FormControl,
  FormLabel,
  Badge,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
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
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Input,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { vatReturnsApi } from '../../api/vatReturns';
import { useTranslation } from 'react-i18next';
import type { VatReturn, VatReturnDetails, JournalEntry } from '../../types';

// Icons
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>
);

const monthNames = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'];

export default function VatReturnsPage() {
  const { t } = useTranslation();
  const { companyId } = useCompany();
  const toast = useToast();
  const newPeriodModal = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [vatReturns, setVatReturns] = useState<VatReturn[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<VatReturn | null>(null);
  const [details, setDetails] = useState<VatReturnDetails | null>(null);
const [editableDetails, setEditableDetails] = useState<Partial<VatReturnDetails>>({});

useEffect(() => {
  if (details) {
    setEditableDetails(details);
  }
}, [details]);
  const [detailsLoading, setDetailsLoading] = useState(false);
const [purchaseDocuments, setPurchaseDocuments] = useState<JournalEntry[]>([]);
const [salesDocuments, setSalesDocuments] = useState<JournalEntry[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);
  const [newPeriod, setNewPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [creating, setCreating] = useState(false);

  const [tabIndex, setTabIndex] = useState(0);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedReturn) {
      loadDetails(selectedReturn.id);
    }
  }, [selectedReturn]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await vatReturnsApi.getByCompany(companyId);
      setVatReturns(data);
      if (data.length > 0) {
        const latest = data[0];
        setSelectedReturn(latest);
        setSelectedPeriod({ year: latest.periodYear, month: latest.periodMonth });
      }
    } catch (error) {
      toast({ title: t('vatReturns.loadError'), status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (id: number) => {
    if (!companyId) return;
    setDetailsLoading(true);
    try {
      const data = await vatReturnsApi.getById(id);
      setDetails(data);

      const [purchases, sales] = await Promise.all([
        vatReturnsApi.getJournalEntries(companyId, data.periodFrom, data.periodTo, 'purchase'),
        vatReturnsApi.getJournalEntries(companyId, data.periodFrom, data.periodTo, 'sales'),
      ]);
      setPurchaseDocuments(purchases);
      setSalesDocuments(sales);

    } catch (error) {
      toast({ title: t('vatReturns.loadError'), status: 'error' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePeriodChange = (year: number, month: number) => {
    const found = vatReturns.find(v => v.periodYear === year && v.periodMonth === month);
    if (found) {
      setSelectedReturn(found);
      setSelectedPeriod({ year, month });
    }
  };

  const handleGenerate = async () => {
    if (!companyId) return;
    setCreating(true);
    try {
      const created = await vatReturnsApi.generate(companyId, newPeriod.year, newPeriod.month);
      await loadData();
      setSelectedReturn(created);
      setSelectedPeriod({ year: newPeriod.year, month: newPeriod.month });
      newPeriodModal.onClose();
      toast({ title: t('vatReturns.periodCreated'), status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || t('vatReturns.generateError'), status: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async (type: 'deklar' | 'pokupki' | 'prodajbi') => {
    if (!selectedReturn) return;
    try {
      let content: string;
      let filename: string;
      if (type === 'deklar') {
        content = await vatReturnsApi.exportDeklar(selectedReturn.id);
        filename = 'DEKLAR.TXT';
      } else if (type === 'pokupki') {
        content = await vatReturnsApi.exportPokupki(selectedReturn.id);
        filename = 'POKUPKI.TXT';
      } else {
        content = await vatReturnsApi.exportProdajbi(selectedReturn.id);
        filename = 'PRODAGBI.TXT';
      }
      downloadFile(filename, content);
    } catch (error) {
      toast({ title: t('vatReturns.exportError'), status: 'error' });
    }
  };

  const downloadFile = (filename: string, base64Content: string) => {
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('bg-BG') : '-';

  const isEditable = details?.status === 'DRAFT' || details?.status === 'CALCULATED';

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
      <Card bg={cardBg} mb={6}>
        <CardBody py={4}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack spacing={4}>
              <Heading size="lg">{t('vatReturns.title', 'ДДС Декларация')}</Heading>
            </HStack>
            <HStack spacing={3}>
              <Text color="gray.500">{t('vatReturns.taxPeriod')}</Text>
              <Select
                w="80px"
                size="sm"
                value={selectedPeriod?.month || ''}
                onChange={e => selectedPeriod && handlePeriodChange(selectedPeriod.year, parseInt(e.target.value))}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')}</option>
                ))}
              </Select>
              <Select
                w="100px"
                size="sm"
                value={selectedPeriod?.year || ''}
                onChange={e => selectedPeriod && handlePeriodChange(parseInt(e.target.value), selectedPeriod.month)}
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </Select>
              <Button size="sm" colorScheme="orange" variant="outline" onClick={newPeriodModal.onOpen}>
                {t('vatReturns.newPeriod')}
              </Button>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {!selectedReturn ? (
        <Card bg={cardBg}>
          <CardBody py={12} textAlign="center">
            <Text color="gray.500" mb={4}>{t('vatReturns.noPeriodSelected')}</Text>
            <Button colorScheme="brand" onClick={newPeriodModal.onOpen}>{t('vatReturns.createNewPeriod')}</Button>
          </CardBody>
        </Card>
      ) : detailsLoading ? (
        <Flex justify="center" align="center" h="64">
          <Spinner size="xl" color="brand.500" />
        </Flex>
      ) : details ? (
        <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" colorScheme="brand">
          <TabList bg={cardBg} borderBottomWidth="1px" borderColor={borderColor} px={4}>
                    <Tab fontWeight="medium">{t('vatReturns.declaration', 'Декларация')}</Tab>
                    <Tab fontWeight="medium">{t('vatReturns.purchases', 'Покупки')}</Tab>
                    <Tab fontWeight="medium">{t('vatReturns.sales', 'Продажби')}</Tab>
                  </TabList>
          
                  <TabPanels>
                    {/* Declaration Tab */}
                    <TabPanel px={0}>
                      <VStack spacing={6} align="stretch">
                        <Card bg={cardBg}>
                          <CardHeader>
                            <Flex justify="space-between" align="center">
                              <Box>
                                <Heading size="md">{t('vatReturns.vatDeclaration')}</Heading>
                                <Text fontSize="sm" color="gray.500">{t('vatReturns.period')} {selectedPeriod?.month}/{selectedPeriod?.year}</Text>
                              </Box>
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<Icon as={DownloadIcon} />}
                                onClick={() => handleExport('deklar')}
                              >
                                DEKLAR.TXT
                              </Button>
                            </Flex>
                          </CardHeader>
                        </Card>
          
                        {/* Section A */}
                        <Card bg={cardBg}>
                          <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                            <Heading size="sm">{t('vatReturns.sectionA')}</Heading>
                          </CardHeader>
                          <CardBody>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.totalTaxBases')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase20 + details.salesBase9 + details.salesBaseVop)} <Badge size="sm">01</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.totalOutputVat')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.outputVatAmount)} <Badge size="sm">20</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.base20')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase20)} <Badge size="sm">11</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.vat20')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesVat20)} <Badge size="sm">21</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.icaBase')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBaseVop)} <Badge size="sm">12</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.icaVat')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesVatVop)} <Badge size="sm">22</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.base9')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase9)} <Badge size="sm">13</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.vat9')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesVat9)} <Badge size="sm">24</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.icd0')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase0Vod)} <Badge size="sm">15</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.export0')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase0Export)} <Badge size="sm">16</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.exempt')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBaseExempt)} <Badge size="sm">19</Badge></Text>
                              </Flex>
                            </SimpleGrid>
                          </CardBody>
                        </Card>
          
                        {/* Section B */}
                        <Card bg={cardBg}>
                          <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                            <Heading size="sm">{t('vatReturns.sectionB')}</Heading>
                          </CardHeader>
                          <CardBody>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.baseNoCredit')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseBaseNoCredit)} <Badge size="sm">30</Badge></Text>
                              </Flex>
                              <Box />
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.baseFullCredit')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseBaseFullCredit)} <Badge size="sm">31</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.vatFullCredit')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseVatFullCredit)} <Badge size="sm">41</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.basePartialCredit')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseBasePartialCredit)} <Badge size="sm">32</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.vatPartialCredit')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseVatPartialCredit)} <Badge size="sm">42</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600">{t('vatReturns.coefficient')}</Text>
                                <Text fontSize="sm" fontWeight="medium">{details.creditCoefficient?.toFixed(3) || '0.000'} <Badge size="sm">33</Badge></Text>
                              </Flex>
                              <Flex justify="space-between">
                                <Text fontSize="sm" color="gray.600" fontWeight="bold">{t('vatReturns.totalTaxCreditLabel')}</Text>
                                <Text fontSize="sm" fontWeight="bold">{formatCurrency(details.totalDeductibleVat)} <Badge size="sm">40</Badge></Text>
                              </Flex>
                            </SimpleGrid>
                          </CardBody>
                        </Card>
          
                        {/* Section C */}
                        <Card bg={cardBg}>
                                        <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                                          <Heading size="sm">{t('vatReturns.sectionC', 'Раздел В - Резултат за периода')}</Heading>
                                        </CardHeader>
                                        <CardBody>
                                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                            <FormControl>
                                              <FormLabel>ДДС за внасяне (кл.50)</FormLabel>
                                              <Input
                                                isReadOnly
                                                value={formatCurrency(details.vatToPay)}
                                                bg={hoverBg}
                                              />
                                            </FormControl>
                                            <FormControl>
                                              <FormLabel>ДДС за възстановяване (кл.60)</FormLabel>
                                              <Input
                                                isReadOnly
                                                value={formatCurrency(details.vatToRefund)}
                                                bg={hoverBg}
                                              />
                                            </FormControl>
                                            <FormControl isInvalid={(editableDetails.vatForDeduction ?? 0) > details.vatToPay}>
                                              <FormLabel>Данък за приспадане (кл.70)</FormLabel>
                                              <Input
                                                type="number"
                                                value={editableDetails.vatForDeduction || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditableDetails(d => ({...d, vatForDeduction: parseFloat(e.target.value)}))}
                                                isDisabled={!isEditable}
                                              />
                                            </FormControl>
                                             <FormControl>
                                              <FormLabel>ДДС, подлежащ на възстановяване (кл.80, 81, 82)</FormLabel>
                                              <Input
                                                type="number"
                                                value={editableDetails.vatRefundArt92 || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditableDetails(d => ({...d, vatRefundArt92: parseFloat(e.target.value)}))}
                                                isDisabled={!isEditable}
                                              />
                                            </FormControl>
                                          </SimpleGrid>
                                        </CardBody>
                                      </Card>                      </VStack>
                    </TabPanel>
          
                    {/* Purchase Ledger Tab */}
                    <TabPanel px={0}>
                      <Card bg={cardBg}>
                        <CardHeader>
                          <Flex justify="space-between" align="center">
                            <Heading size="md">{t('vatReturns.purchaseLedger', 'Дневник Покупки')} - {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Icon as={DownloadIcon} />}
                              onClick={() => handleExport('pokupki')}
                            >
                              {t('vatReturns.download')}
                            </Button>
                          </Flex>
                        </CardHeader>
                        <CardBody pt={0}>
                          <Box overflowX="auto">
                            <Table size="sm">
                              <Thead bg={hoverBg}>
                                <Tr>
                                  <Th>кл.1</Th>
                                  <Th>{t('vatReturns.clType', 'Тип')}</Th>
                                  <Th>{t('vatReturns.clDocNumber', 'Номер')}</Th>
                                  <Th>{t('vatReturns.clDate', 'Дата')}</Th>
                                  <Th>{t('vatReturns.clVatNumber', 'ДДС номер')}</Th>
                                  <Th>{t('vatReturns.clCounterparty', 'Контрагент')}</Th>
                                  <Th isNumeric>{t('vatReturns.clNoCredit', 'Без ДК')}</Th>
                                  <Th isNumeric>{t('vatReturns.clWithCredit', 'С ДК')}</Th>
                                  <Th isNumeric>{t('vatReturns.clVat', 'ДДС')}</Th>
                                </Tr>
                              </Thead>
<Tbody>
                      {purchaseDocuments.map((doc, index) => (
                        <Tr key={doc.id}>
                          <Td>{index + 1}</Td>
                          <Td>{doc.documentType}</Td>
                          <Td>{doc.documentNumber}</Td>
                          <Td>{formatDate(doc.documentDate)}</Td>
                          <Td>-</Td>
                          <Td>{doc.description || '-'}</Td>
                          <Td isNumeric>{formatCurrency(0)}</Td>
                          <Td isNumeric>{formatCurrency(doc.totalAmount - doc.totalVatAmount)}</Td>
                          <Td isNumeric>{formatCurrency(doc.totalVatAmount)}</Td>
                        </Tr>
                      ))}
                      {purchaseDocuments.length === 0 && (
                        <Tr>
                          <Td colSpan={9} textAlign="center" py={8} color="gray.500">
                            <VStack>
                              <Text>{t('vatReturns.noPurchaseDocuments', 'Няма документи за покупки')}</Text>
                            </VStack>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                              <Tfoot bg={hoverBg}>
                                <Tr fontWeight="bold">
                                  <Td colSpan={6} textAlign="right">{t('vatReturns.total')}</Td>
                                  <Td isNumeric>{formatCurrency(details.purchaseBaseNoCredit)}</Td>
                                  <Td isNumeric>{formatCurrency(details.purchaseBaseFullCredit)}</Td>
                                  <Td isNumeric>{formatCurrency(details.purchaseVatFullCredit)}</Td>
                                </Tr>
                              </Tfoot>
                            </Table>
                          </Box>
                        </CardBody>
                      </Card>
                    </TabPanel>
          
                    {/* Sales Ledger Tab */}
                    <TabPanel px={0}>
                      <Card bg={cardBg}>
                        <CardHeader>
                          <Flex justify="space-between" align="center">
                            <Heading size="md">{t('vatReturns.salesLedger', 'Дневник Продажби')} - {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Icon as={DownloadIcon} />}
                              onClick={() => handleExport('prodajbi')}
                            >
                              {t('vatReturns.download')}
                            </Button>
                          </Flex>
                        </CardHeader>
                        <CardBody pt={0}>
                          <Box overflowX="auto">
                            <Table size="sm">
                              <Thead bg={hoverBg}>
                                <Tr>
                                  <Th>кл.1</Th>
                                  <Th>{t('vatReturns.clType', 'Тип')}</Th>
                                  <Th>{t('vatReturns.clDocNumber', 'Номер')}</Th>
                                  <Th>{t('vatReturns.clDate', 'Дата')}</Th>
                                  <Th>{t('vatReturns.clVatNumber', 'ДДС номер')}</Th>
                                  <Th>{t('vatReturns.clCounterparty', 'Контрагент')}</Th>
                                  <Th isNumeric>{t('vatReturns.clBase20', 'ДО 20%')}</Th>
                                  <Th isNumeric>{t('vatReturns.clVat20', 'ДДС 20%')}</Th>
                                  <Th isNumeric>{t('vatReturns.clIcd', 'ВОД')}</Th>
                                </Tr>
                              </Thead>
                <Tbody>
                      {salesDocuments.map((doc, index) => (
                        <Tr key={doc.id}>
                          <Td>{index + 1}</Td>
                          <Td>{doc.documentType}</Td>
                          <Td>{doc.documentNumber}</Td>
                          <Td>{formatDate(doc.documentDate)}</Td>
                          <Td>-</Td>
                          <Td>{doc.description || '-'}</Td>
                          <Td isNumeric>{formatCurrency(doc.totalAmount - doc.totalVatAmount)}</Td>
                          <Td isNumeric>{formatCurrency(doc.totalVatAmount)}</Td>
                          <Td isNumeric>{formatCurrency(0)}</Td>
                        </Tr>
                      ))}
                      {salesDocuments.length === 0 && (
                        <Tr>
                          <Td colSpan={9} textAlign="center" py={8} color="gray.500">
                            <VStack>
                              <Text>{t('vatReturns.noSalesDocuments', 'Няма документи за продажби')}</Text>
                            </VStack>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                              <Tfoot bg={hoverBg}>
                                <Tr fontWeight="bold">
                                  <Td colSpan={6} textAlign="right">{t('vatReturns.total')}</Td>
                                  <Td isNumeric>{formatCurrency(details.salesBase20)}</Td>
                                  <Td isNumeric>{formatCurrency(details.salesVat20)}</Td>
                                  <Td isNumeric>{formatCurrency(details.salesBase0Vod)}</Td>
                                </Tr>
                              </Tfoot>
                            </Table>
                          </Box>
                        </CardBody>
                      </Card>
                    </TabPanel>
                  </TabPanels>        </Tabs>
      ) : null}

      {/* New Period Modal */}
      <Modal isOpen={newPeriodModal.isOpen} onClose={newPeriodModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('vatReturns.newTaxPeriod')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <FormLabel>{t('vatReturns.year')}</FormLabel>
                <Select
                  value={newPeriod.year}
                  onChange={e => setNewPeriod(p => ({ ...p, year: parseInt(e.target.value) }))}
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>{t('vatReturns.month')}</FormLabel>
                <Select
                  value={newPeriod.month}
                  onChange={e => setNewPeriod(p => ({ ...p, month: parseInt(e.target.value) }))}
                >
                  {monthNames.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={newPeriodModal.onClose}>{t('vatReturns.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleGenerate} isLoading={creating}>
              {t('vatReturns.generate')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
