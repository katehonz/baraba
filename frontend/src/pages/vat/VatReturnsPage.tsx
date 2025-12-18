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
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { vatReturnsApi } from '../../api/vatReturns';
import { companiesApi } from '../../api/companies';
import { useTranslation } from 'react-i18next';
import type { VatReturn, VatReturnDetails, JournalEntry, Company } from '../../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Icons
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>
);

const PrintIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
  </svg>
);

const monthNames = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'];

interface VatJournalEntry extends JournalEntry {
  vatDocumentType?: string;
  vatPurchaseOperation?: string;
  vatSalesOperation?: string;
  counterpart?: {
    id: number;
    name: string;
    vatNumber: string;
    eik: string;
  } | null;
  lines?: {
    id: number;
    baseAmount: number;
    vatAmount: number;
  }[];
}

type TabType = 'dds' | 'pokupki' | 'prodajbi' | 'deklaracia' | 'vies';

export default function VatReturnsPage() {
  const { t } = useTranslation();
  const { companyId } = useCompany();
  const toast = useToast();
  const newPeriodModal = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [vatReturns, setVatReturns] = useState<VatReturn[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<VatReturn | null>(null);
  const [details, setDetails] = useState<VatReturnDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [purchaseEntries, setPurchaseEntries] = useState<VatJournalEntry[]>([]);
  const [salesEntries, setSalesEntries] = useState<VatJournalEntry[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);
  const [newPeriod, setNewPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [creating, setCreating] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('dds');
  const [manualFields, setManualFields] = useState({
    vatToPay: '0',
    vatToRefund: '0',
    effectiveVatToPay: '0',
    vatForDeduction: '0',
    vatRefundArt92: '0',
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.900');

  const isEditable = details?.status === 'DRAFT' || details?.status === 'CALCULATED';

  useEffect(() => {
    if (companyId) {
      loadData();
      loadCompany();
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedReturn) {
      loadDetails(selectedReturn.id);
    }
  }, [selectedReturn]);

  useEffect(() => {
    if (details) {
      setManualFields({
        vatToPay: details.vatToPay?.toString() || '0',
        vatToRefund: details.vatToRefund?.toString() || '0',
        effectiveVatToPay: details.effectiveVatToPay?.toString() || '0',
        vatForDeduction: details.vatForDeduction?.toString() || '0',
        vatRefundArt92: details.vatRefundArt92?.toString() || '0',
      });
    }
  }, [details]);

  const loadCompany = async () => {
    if (!companyId) return;
    try {
      const data = await companiesApi.getById(companyId);
      setCompany(data);
    } catch (error) {
      console.error('Error loading company:', error);
    }
  };

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
      toast({ title: t('vatReturns.loadError', 'Грешка при зареждане'), status: 'error' });
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
      setPurchaseEntries(purchases);
      setSalesEntries(sales);
    } catch (error) {
      toast({ title: t('vatReturns.loadError', 'Грешка при зареждане'), status: 'error' });
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
      toast({ title: t('vatReturns.periodCreated', 'Периодът е създаден'), status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || t('vatReturns.generateError', 'Грешка при генериране'), status: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateReturn = async () => {
    if (!selectedReturn) return;
    try {
      await vatReturnsApi.update(selectedReturn.id, {
        vatToPay: parseFloat(manualFields.vatToPay),
        vatToRefund: parseFloat(manualFields.vatToRefund),
        effectiveVatToPay: parseFloat(manualFields.effectiveVatToPay),
        vatForDeduction: parseFloat(manualFields.vatForDeduction),
        vatRefundArt92: parseFloat(manualFields.vatRefundArt92),
      });
      loadDetails(selectedReturn.id);
      toast({ title: 'Данните са записани успешно', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при запис', status: 'error' });
    }
  };

  const handleSubmitReturn = async () => {
    if (!selectedReturn) return;
    if (!confirm('Сигурни ли сте, че искате да подадете декларацията?')) return;
    try {
      await vatReturnsApi.submit(selectedReturn.id);
      loadData();
      loadDetails(selectedReturn.id);
      toast({ title: 'Декларацията е маркирана като подадена', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при подаване', status: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedReturn) return;
    if (!confirm('Сигурни ли сте, че искате да изтриете тази декларация?')) return;
    try {
      await vatReturnsApi.delete(selectedReturn.id);
      setSelectedReturn(null);
      setSelectedPeriod(null);
      setDetails(null);
      loadData();
      toast({ title: 'Декларацията е изтрита', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при изтриване', status: 'error' });
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
      toast({ title: t('vatReturns.exportError', 'Грешка при експорт'), status: 'error' });
    }
  };

  const base64ToBytes = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const downloadFile = (filename: string, base64Content: string) => {
    const bytes = base64ToBytes(base64Content);
    const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleGenerateZip = async () => {
    if (!selectedReturn) return;
    setZipLoading(true);
    try {
      const [deklar, pokupki, prodajbi] = await Promise.all([
        vatReturnsApi.exportDeklar(selectedReturn.id),
        vatReturnsApi.exportPokupki(selectedReturn.id),
        vatReturnsApi.exportProdajbi(selectedReturn.id),
      ]);

      const zip = new JSZip();
      zip.file('DEKLAR.TXT', base64ToBytes(deklar));
      zip.file('POKUPKI.TXT', base64ToBytes(pokupki));
      zip.file('PRODAGBI.TXT', base64ToBytes(prodajbi));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `VAT_${selectedReturn.periodYear}_${String(selectedReturn.periodMonth).padStart(2, '0')}.zip`);
      toast({ title: 'ZIP файлът е създаден', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Грешка при генериране на ZIP', status: 'error' });
    } finally {
      setZipLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('bg-BG') : '-';

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'gray',
      CALCULATED: 'blue',
      SUBMITTED: 'green',
      ACCEPTED: 'teal',
      PAID: 'purple',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Чернова',
      CALCULATED: 'Изчислена',
      SUBMITTED: 'Подадена',
      ACCEPTED: 'Приета',
      PAID: 'Платена',
    };
    return <Badge colorScheme={colors[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const tabIndex = ['dds', 'pokupki', 'prodajbi', 'deklaracia', 'vies'].indexOf(activeTab);

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
      <Card bg={cardBg} mb={0} borderRadius={0} borderBottomWidth="1px" borderColor={borderColor}>
        <CardBody py={4}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack spacing={4}>
              <Heading size="lg">ДДС Дневници</Heading>
              {details && getStatusBadge(details.status)}
            </HStack>
            <HStack spacing={3}>
              <Text color="gray.500">Данъчен период:</Text>
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
                Нов период
              </Button>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs
        index={tabIndex}
        onChange={(idx) => setActiveTab(['dds', 'pokupki', 'prodajbi', 'deklaracia', 'vies'][idx] as TabType)}
        variant="enclosed"
        colorScheme="blue"
      >
        <TabList bg={cardBg} borderBottomWidth="1px" borderColor={borderColor} px={6}>
          <Tab fontWeight="medium">ДДС</Tab>
          <Tab fontWeight="medium">Дневник за Покупки</Tab>
          <Tab fontWeight="medium">Дневник за Продажби</Tab>
          <Tab fontWeight="medium">Декларация</Tab>
          <Tab fontWeight="medium">VIES Декларация</Tab>
        </TabList>

        <TabPanels>
          {!selectedReturn ? (
            <TabPanel>
              <Card bg={cardBg}>
                <CardBody py={12} textAlign="center">
                  <Text color="gray.500" mb={4}>Няма избран данъчен период</Text>
                  <Button colorScheme="blue" onClick={newPeriodModal.onOpen}>Създай нов период</Button>
                </CardBody>
              </Card>
            </TabPanel>
          ) : detailsLoading ? (
            <TabPanel>
              <Flex justify="center" align="center" h="64">
                <Spinner size="xl" color="brand.500" />
              </Flex>
            </TabPanel>
          ) : details ? (
            <>
              {/* TAB: ДДС Summary */}
              <TabPanel px={6} py={6}>
                <VStack spacing={6} align="stretch">
                  {/* Company Info */}
                  <Card bg={cardBg}>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                        <Box>
                          <Text fontSize="sm"><Text as="span" color="gray.500">Компания:</Text> <Text as="span" fontWeight="semibold">{company?.name}</Text></Text>
                          <Text fontSize="sm"><Text as="span" color="gray.500">ЕИК:</Text> {company?.vatNumber || company?.eik}</Text>
                          <Text fontSize="sm"><Text as="span" color="gray.500">Данъчен период:</Text> {selectedPeriod?.month}/{selectedPeriod?.year}</Text>
                          <Text fontSize="sm"><Text as="span" color="gray.500">Контакт:</Text> {company?.managerName}</Text>
                        </Box>
                        <Box textAlign={{ base: 'left', md: 'right' }}>
                          <Text fontSize="sm" fontWeight="semibold">{company?.napOffice || 'ТД НА НАП'}</Text>
                          <Text fontSize="sm"><Text as="span" color="gray.500">Сметка:</Text> BG88BNBG96618000195001</Text>
                          <Text fontSize="sm"><Text as="span" color="gray.500">Вид Плащане:</Text> 110000</Text>
                        </Box>
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  {/* Summary Table */}
                  <Card bg={cardBg}>
                    <CardBody p={0}>
                      <Box overflowX="auto">
                        <Table size="sm">
                          <Thead bg={headerBg}>
                            <Tr>
                              <Th>#</Th>
                              <Th>Дневник</Th>
                              <Th isNumeric>Записи</Th>
                              <Th isNumeric>Данъчна Основа</Th>
                              <Th isNumeric>Начислено ДДС</Th>
                              <Th isNumeric>Други Данъчни Основи</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            <Tr>
                              <Td>1</Td>
                              <Td fontWeight="medium">Продажби</Td>
                              <Td isNumeric>{details.salesDocumentCount}</Td>
                              <Td isNumeric>{formatCurrency(details.salesBase20 + details.salesBase9 + details.salesBaseVop)}</Td>
                              <Td isNumeric>{formatCurrency(details.outputVatAmount)}</Td>
                              <Td isNumeric>{formatCurrency(details.salesBase0Export + details.salesBase0Vod + details.salesBaseExempt)}</Td>
                            </Tr>
                            <Tr>
                              <Td>2</Td>
                              <Td fontWeight="medium">Покупки</Td>
                              <Td isNumeric>{details.purchaseDocumentCount}</Td>
                              <Td isNumeric>{formatCurrency(details.purchaseBaseFullCredit + details.purchaseBasePartialCredit)}</Td>
                              <Td isNumeric>{formatCurrency(details.totalDeductibleVat)}</Td>
                              <Td isNumeric>{formatCurrency(details.purchaseBaseNoCredit)}</Td>
                            </Tr>
                          </Tbody>
                        </Table>
                      </Box>
                    </CardBody>
                  </Card>

                  {/* Result */}
                  <Card bg={cardBg}>
                    <CardBody>
                      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
                        <Box>
                          <Text fontSize="sm" color="gray.500">Краен Срок</Text>
                          <Text fontSize="lg" fontWeight="semibold">{formatDate(details.dueDate)}</Text>
                        </Box>
                        <VStack align="flex-end" spacing={2}>
                          <Text fontSize="sm">
                            <Text as="span" color="gray.500">Общо ДК:</Text>{' '}
                            <Text as="span" fontWeight="semibold">{formatCurrency(details.totalDeductibleVat)}</Text>
                          </Text>
                          <Text fontSize="lg">
                            <Text as="span" color="gray.500">{details.vatToPay > 0 ? 'ДДС за внасяне:' : 'ДДС за възстановяване:'}</Text>{' '}
                            <Text as="span" fontWeight="bold" color={details.vatToPay > 0 ? 'red.500' : 'green.500'}>
                              {formatCurrency(details.vatToPay > 0 ? details.vatToPay : details.vatToRefund)}
                            </Text>
                          </Text>
                        </VStack>
                      </Flex>
                    </CardBody>
                  </Card>

                  {/* Actions */}
                  <Flex justify="space-between" wrap="wrap" gap={2}>
                    <HStack spacing={2}>
                      {isEditable && (
                        <Button colorScheme="red" variant="outline" onClick={handleDelete}>
                          Изтрий
                        </Button>
                      )}
                    </HStack>
                    <HStack spacing={2}>
                      {details.status === 'CALCULATED' && (
                        <>
                          <Button
                            colorScheme="blue"
                            onClick={handleGenerateZip}
                            isLoading={zipLoading}
                            leftIcon={<Icon as={DownloadIcon} />}
                          >
                            Изпрати към НАП (ZIP)
                          </Button>
                          <Button colorScheme="green" onClick={handleSubmitReturn}>
                            Маркирай като подадена
                          </Button>
                        </>
                      )}
                    </HStack>
                  </Flex>
                </VStack>
              </TabPanel>

              {/* TAB: Дневник за Покупки */}
              <TabPanel px={6} py={6}>
                <VStack spacing={4} align="stretch">
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Дневник за Покупки за период {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                    <Button variant="outline" leftIcon={<Icon as={DownloadIcon} />} onClick={() => handleExport('pokupki')}>
                      Свали
                    </Button>
                  </Flex>
                  <Card bg={cardBg}>
                    <CardBody p={0}>
                      <Box overflowX="auto">
                        <Table size="sm">
                          <Thead bg={headerBg}>
                            <Tr>
                              <Th>кл.1<br/><Text as="span" fontSize="xs" fontWeight="normal">№ по ред</Text></Th>
                              <Th>кл.3<br/><Text as="span" fontSize="xs" fontWeight="normal">Вид</Text></Th>
                              <Th>кл.4<br/><Text as="span" fontSize="xs" fontWeight="normal">Документ номер</Text></Th>
                              <Th>кл.5<br/><Text as="span" fontSize="xs" fontWeight="normal">Дата</Text></Th>
                              <Th>кл.6<br/><Text as="span" fontSize="xs" fontWeight="normal">Номер на контр.</Text></Th>
                              <Th>кл.7<br/><Text as="span" fontSize="xs" fontWeight="normal">Име на контрагента</Text></Th>
                              <Th>кл.8<br/><Text as="span" fontSize="xs" fontWeight="normal">Вид стока/услуга</Text></Th>
                              <Th isNumeric>кл.9<br/><Text as="span" fontSize="xs" fontWeight="normal">ДО без право</Text></Th>
                              <Th isNumeric>кл.10<br/><Text as="span" fontSize="xs" fontWeight="normal">ДО с право ПДК</Text></Th>
                              <Th isNumeric>кл.11<br/><Text as="span" fontSize="xs" fontWeight="normal">ДДС с право ПДК</Text></Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {purchaseEntries.length === 0 ? (
                              <Tr>
                                <Td colSpan={10} textAlign="center" py={8} color="gray.500">
                                  <VStack>
                                    <Text>Няма документи за покупки в този период</Text>
                                    <Text fontSize="sm">Общо записи: {details.purchaseDocumentCount} | ДО: {formatCurrency(details.purchaseBaseFullCredit)} | ДДС: {formatCurrency(details.purchaseVatFullCredit)}</Text>
                                  </VStack>
                                </Td>
                              </Tr>
                            ) : (
                              purchaseEntries.map((entry, idx) => {
                                const totalBase = entry.lines?.reduce((sum, l) => sum + (l.baseAmount || 0), 0) || (entry.totalAmount - entry.totalVatAmount);
                                const totalVat = entry.lines?.reduce((sum, l) => sum + (l.vatAmount || 0), 0) || entry.totalVatAmount;
                                const isNoCredit = entry.vatPurchaseOperation === 'пок40';
                                return (
                                  <Tr key={entry.id} _hover={{ bg: hoverBg }}>
                                    <Td>{idx + 1}</Td>
                                    <Td>{entry.vatDocumentType || '01'}</Td>
                                    <Td fontWeight="medium">{entry.documentNumber}</Td>
                                    <Td>{formatDate(entry.vatDate || entry.documentDate)}</Td>
                                    <Td>{entry.counterpart?.vatNumber || entry.counterpart?.eik || '-'}</Td>
                                    <Td maxW="200px" isTruncated>{entry.counterpart?.name || '-'}</Td>
                                    <Td maxW="150px" isTruncated>{entry.description}</Td>
                                    <Td isNumeric>{isNoCredit ? formatCurrency(totalBase) : '-'}</Td>
                                    <Td isNumeric>{!isNoCredit ? formatCurrency(totalBase) : '-'}</Td>
                                    <Td isNumeric fontWeight="medium">{!isNoCredit ? formatCurrency(totalVat) : '-'}</Td>
                                  </Tr>
                                );
                              })
                            )}
                          </Tbody>
                          {purchaseEntries.length > 0 && (
                            <Tfoot bg={headerBg}>
                              <Tr fontWeight="bold">
                                <Td colSpan={7} textAlign="right">ОБЩО:</Td>
                                <Td isNumeric>{formatCurrency(details.purchaseBaseNoCredit)}</Td>
                                <Td isNumeric>{formatCurrency(details.purchaseBaseFullCredit)}</Td>
                                <Td isNumeric>{formatCurrency(details.purchaseVatFullCredit)}</Td>
                              </Tr>
                            </Tfoot>
                          )}
                        </Table>
                      </Box>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>

              {/* TAB: Дневник за Продажби */}
              <TabPanel px={6} py={6}>
                <VStack spacing={4} align="stretch">
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Дневник за Продажби за период {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                    <Button variant="outline" leftIcon={<Icon as={DownloadIcon} />} onClick={() => handleExport('prodajbi')}>
                      Свали
                    </Button>
                  </Flex>
                  <Card bg={cardBg}>
                    <CardBody p={0}>
                      <Box overflowX="auto">
                        <Table size="sm">
                          <Thead bg={headerBg}>
                            <Tr>
                              <Th>кл.1<br/><Text as="span" fontSize="xs" fontWeight="normal">№ по ред</Text></Th>
                              <Th>кл.3<br/><Text as="span" fontSize="xs" fontWeight="normal">Вид</Text></Th>
                              <Th>кл.4<br/><Text as="span" fontSize="xs" fontWeight="normal">Документ номер</Text></Th>
                              <Th>кл.5<br/><Text as="span" fontSize="xs" fontWeight="normal">Дата</Text></Th>
                              <Th>кл.6<br/><Text as="span" fontSize="xs" fontWeight="normal">Номер на контр.</Text></Th>
                              <Th>кл.7<br/><Text as="span" fontSize="xs" fontWeight="normal">Име на контрагента</Text></Th>
                              <Th isNumeric>кл.9<br/><Text as="span" fontSize="xs" fontWeight="normal">ДО 20%</Text></Th>
                              <Th isNumeric>кл.10<br/><Text as="span" fontSize="xs" fontWeight="normal">ДДС 20%</Text></Th>
                              <Th isNumeric>кл.15<br/><Text as="span" fontSize="xs" fontWeight="normal">ВОД</Text></Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {salesEntries.length === 0 ? (
                              <Tr>
                                <Td colSpan={9} textAlign="center" py={8} color="gray.500">
                                  <VStack>
                                    <Text>Няма документи за продажби в този период</Text>
                                    <Text fontSize="sm">Общо записи: {details.salesDocumentCount} | ДО 20%: {formatCurrency(details.salesBase20)} | ДДС: {formatCurrency(details.salesVat20)}</Text>
                                  </VStack>
                                </Td>
                              </Tr>
                            ) : (
                              salesEntries.map((entry, idx) => {
                                const totalBase = entry.lines?.reduce((sum, l) => sum + (l.baseAmount || 0), 0) || (entry.totalAmount - entry.totalVatAmount);
                                const totalVat = entry.lines?.reduce((sum, l) => sum + (l.vatAmount || 0), 0) || entry.totalVatAmount;
                                const isVOD = entry.vatSalesOperation === 'про16';
                                return (
                                  <Tr key={entry.id} _hover={{ bg: hoverBg }}>
                                    <Td>{idx + 1}</Td>
                                    <Td>{entry.vatDocumentType || '01'}</Td>
                                    <Td fontWeight="medium">{entry.documentNumber}</Td>
                                    <Td>{formatDate(entry.vatDate || entry.documentDate)}</Td>
                                    <Td>{entry.counterpart?.vatNumber || entry.counterpart?.eik || '-'}</Td>
                                    <Td maxW="200px" isTruncated>{entry.counterpart?.name || '-'}</Td>
                                    <Td isNumeric>{!isVOD ? formatCurrency(totalBase) : '-'}</Td>
                                    <Td isNumeric fontWeight="medium">{!isVOD ? formatCurrency(totalVat) : '-'}</Td>
                                    <Td isNumeric>{isVOD ? formatCurrency(totalBase) : '-'}</Td>
                                  </Tr>
                                );
                              })
                            )}
                          </Tbody>
                          {salesEntries.length > 0 && (
                            <Tfoot bg={headerBg}>
                              <Tr fontWeight="bold">
                                <Td colSpan={6} textAlign="right">ОБЩО:</Td>
                                <Td isNumeric>{formatCurrency(details.salesBase20)}</Td>
                                <Td isNumeric>{formatCurrency(details.salesVat20)}</Td>
                                <Td isNumeric>{formatCurrency(details.salesBase0Vod)}</Td>
                              </Tr>
                            </Tfoot>
                          )}
                        </Table>
                      </Box>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>

              {/* TAB: Декларация */}
              <TabPanel px={6} py={6}>
                <VStack spacing={6} align="stretch">
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Heading size="md">Декларация за период {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                      <Text fontSize="sm" color="gray.600">Наименование: <Text as="span" fontWeight="semibold">{company?.name}</Text></Text>
                    </Box>
                    <Button variant="outline" leftIcon={<Icon as={DownloadIcon} />} onClick={() => handleExport('deklar')}>
                      DEKLAR.TXT
                    </Button>
                  </Flex>

                  {/* Раздел А */}
                  <Card bg={cardBg}>
                    <CardHeader borderBottomWidth="1px" borderColor={borderColor} py={3}>
                      <Heading size="sm">Раздел А: Данни за начислен данък върху добавена стойност</Heading>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Общ размер на данъчните основи за облагане с ДДС:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBase20 + details.salesBase9 + details.salesBaseVop + details.salesBase0Art3 + details.salesBase0Vod + details.salesBase0Export + details.salesBaseArt21 + details.salesBaseArt69 + details.salesBaseExempt)}</Text>
                            <Badge size="sm" colorScheme="gray">01</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Всичко начислен ДДС:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.outputVatAmount)}</Text>
                            <Badge size="sm" colorScheme="gray">20</Badge>
                          </HStack>
                        </Flex>

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО на облагаемите доставки със ставка 20%:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBase20)}</Text>
                            <Badge size="sm" colorScheme="gray">11</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Начислен ДДС:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesVat20)}</Text>
                            <Badge size="sm" colorScheme="gray">21</Badge>
                          </HStack>
                        </Flex>

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО на ВОП и доставки по чл.82, ал.2-6:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBaseVop)}</Text>
                            <Badge size="sm" colorScheme="gray">12</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Начислен ДДС за ВОП:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesVatVop)}</Text>
                            <Badge size="sm" colorScheme="gray">22</Badge>
                          </HStack>
                        </Flex>

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО на облагаемите доставки със ставка 9%:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBase9)}</Text>
                            <Badge size="sm" colorScheme="gray">13</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Начислен данък за лични нужди:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesVatPersonalUse)}</Text>
                            <Badge size="sm" colorScheme="gray">23</Badge>
                          </HStack>
                        </Flex>

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО със ставка 0% по глава трета:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBase0Art3)}</Text>
                            <Badge size="sm" colorScheme="gray">14</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Начислен ДДС 9%:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesVat9)}</Text>
                            <Badge size="sm" colorScheme="gray">24</Badge>
                          </HStack>
                        </Flex>

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО за ВОД на стоки (0%):</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBase0Vod)}</Text>
                            <Badge size="sm" colorScheme="gray">15</Badge>
                          </HStack>
                        </Flex>
                        <Box />

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО по чл.140, 146 и чл.173 (0%):</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBase0Export)}</Text>
                            <Badge size="sm" colorScheme="gray">16</Badge>
                          </HStack>
                        </Flex>
                        <Box />

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО на услуги по чл.21, ал.2:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBaseArt21)}</Text>
                            <Badge size="sm" colorScheme="gray">17</Badge>
                          </HStack>
                        </Flex>
                        <Box />

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО по чл.69, ал.2:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBaseArt69)}</Text>
                            <Badge size="sm" colorScheme="gray">18</Badge>
                          </HStack>
                        </Flex>
                        <Box />

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО на освободени доставки:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.salesBaseExempt)}</Text>
                            <Badge size="sm" colorScheme="gray">19</Badge>
                          </HStack>
                        </Flex>
                        <Box />
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  {/* Раздел Б */}
                  <Card bg={cardBg}>
                    <CardHeader borderBottomWidth="1px" borderColor={borderColor} py={3}>
                      <Heading size="sm">Раздел Б: Данни за упражнено право на данъчен кредит</Heading>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДО без право на дан.кредит:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.purchaseBaseNoCredit)}</Text>
                            <Badge size="sm" colorScheme="gray">30</Badge>
                          </HStack>
                        </Flex>
                        <Box />

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">- с право на пълен ДК:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.purchaseBaseFullCredit)}</Text>
                            <Badge size="sm" colorScheme="gray">31</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДДС с право на пълен ДК:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.purchaseVatFullCredit)}</Text>
                            <Badge size="sm" colorScheme="gray">41</Badge>
                          </HStack>
                        </Flex>

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">- с право на частичен ДК:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.purchaseBasePartialCredit)}</Text>
                            <Badge size="sm" colorScheme="gray">32</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДДС с право на частичен ДК:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.purchaseVatPartialCredit)}</Text>
                            <Badge size="sm" colorScheme="gray">42</Badge>
                          </HStack>
                        </Flex>

                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Коефицент по чл.73, ал.5:</Text>
                          <HStack>
                            <Text fontWeight="medium">{details.creditCoefficient?.toFixed(3) || '0.000'}</Text>
                            <Badge size="sm" colorScheme="gray">33</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Годишна корекция по чл.73, ал.8:</Text>
                          <HStack>
                            <Text fontWeight="medium">{formatCurrency(details.purchaseVatAnnualAdjustment || 0)}</Text>
                            <Badge size="sm" colorScheme="gray">43</Badge>
                          </HStack>
                        </Flex>

                        <Box />
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600" fontWeight="bold">Общ данъчен кредит (кл.41+кл.42×кл.33+кл.43):</Text>
                          <HStack>
                            <Text fontWeight="bold">{formatCurrency(details.totalDeductibleVat)}</Text>
                            <Badge size="sm" colorScheme="gray">40</Badge>
                          </HStack>
                        </Flex>
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  {/* Раздел В */}
                  <Card bg={cardBg}>
                    <CardHeader borderBottomWidth="1px" borderColor={borderColor} py={3}>
                      <Heading size="sm">Раздел В: Резултат за периода</Heading>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДДС за внасяне (кл.20 - кл.40) &gt; 0:</Text>
                          <HStack>
                            <Text fontWeight="medium" color="red.500">{formatCurrency(details.vatToPay)}</Text>
                            <Badge size="sm" colorScheme="gray">50</Badge>
                          </HStack>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">ДДС за възстановяване (кл.20 - кл.40) &lt; 0:</Text>
                          <HStack>
                            <Text fontWeight="medium" color="green.500">{formatCurrency(details.vatToRefund)}</Text>
                            <Badge size="sm" colorScheme="gray">60</Badge>
                          </HStack>
                        </Flex>
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  {/* Раздел Г и Д - Ръчно въвеждане */}
                  {isEditable && (
                    <Card bg={cardBg}>
                      <CardHeader borderBottomWidth="1px" borderColor={borderColor} py={3}>
                        <Heading size="sm">Раздел Г: ДДС за внасяне / Раздел Д: ДДС за възстановяване</Heading>
                      </CardHeader>
                      <CardBody>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                          <FormControl>
                            <FormLabel fontSize="sm">Данък за внасяне от кл.50, приспаднат (кл. 70)</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={manualFields.vatToPay}
                              onChange={(e) => setManualFields({ ...manualFields, vatToPay: e.target.value })}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm">Данък за внасяне, внесен ефективно (кл. 71)</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={manualFields.effectiveVatToPay}
                              onChange={(e) => setManualFields({ ...manualFields, effectiveVatToPay: e.target.value })}
                            />
                          </FormControl>
                          <Box />
                          <FormControl>
                            <FormLabel fontSize="sm">Съгласно чл.92, ал.1 ЗДДС (кл. 80)</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={manualFields.vatToRefund}
                              onChange={(e) => setManualFields({ ...manualFields, vatToRefund: e.target.value })}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm">Съгласно чл.92, ал.3 (кл. 81)</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={manualFields.vatForDeduction}
                              onChange={(e) => setManualFields({ ...manualFields, vatForDeduction: e.target.value })}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm">Съгласно чл.92, ал.4 (кл. 82)</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={manualFields.vatRefundArt92}
                              onChange={(e) => setManualFields({ ...manualFields, vatRefundArt92: e.target.value })}
                            />
                          </FormControl>
                        </SimpleGrid>
                        <Flex justify="flex-end" mt={4} gap={2}>
                          <Button colorScheme="blue" onClick={handleUpdateReturn}>
                            Съхрани
                          </Button>
                          <Button variant="outline" leftIcon={<Icon as={PrintIcon} />} onClick={() => window.print()}>
                            Печат
                          </Button>
                        </Flex>
                      </CardBody>
                    </Card>
                  )}
                </VStack>
              </TabPanel>

              {/* TAB: VIES */}
              <TabPanel px={6} py={6}>
                <VStack spacing={6} align="stretch">
                  <Heading size="md">VIES Декларация за период {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>

                  <Card bg={cardBg}>
                    <CardBody>
                      <VStack py={8} spacing={4}>
                        <Text color="gray.500">VIES Декларацията се попълва автоматично от ВОД записите в дневника за продажби.</Text>
                        <Text fontSize="sm">ВОД за периода: <Text as="span" fontWeight="semibold">{formatCurrency(details.salesBase0Vod)}</Text></Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Flex justify="flex-end">
                    <Button variant="outline" isDisabled>
                      VIES.TXT (скоро)
                    </Button>
                  </Flex>
                </VStack>
              </TabPanel>
            </>
          ) : (
            <TabPanel>
              <Alert status="error">
                <AlertIcon />
                Грешка при зареждане на данните
              </Alert>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      {/* New Period Modal */}
      <Modal isOpen={newPeriodModal.isOpen} onClose={newPeriodModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Нов данъчен период</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <FormLabel>Година</FormLabel>
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
                <FormLabel>Месец</FormLabel>
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
            <Button variant="ghost" mr={3} onClick={newPeriodModal.onClose}>Отказ</Button>
            <Button colorScheme="blue" onClick={handleGenerate} isLoading={creating}>
              Генерирай
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
