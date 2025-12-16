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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { vatReturnsApi } from '../../api/vatReturns';
import { useTranslation } from 'react-i18next';
import type { VatReturn, VatReturnDetails } from '../../types';

// Icons
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>
);

const ArchiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

const monthNames = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'];

export default function VatReturnsPage() {
  const { t } = useTranslation();
  const { companyId, currentCompany } = useCompany();
  const toast = useToast();
  const newPeriodModal = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [vatReturns, setVatReturns] = useState<VatReturn[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<VatReturn | null>(null);
  const [details, setDetails] = useState<VatReturnDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);
  const [newPeriod, setNewPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [creating, setCreating] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);

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
    setDetailsLoading(true);
    try {
      const data = await vatReturnsApi.getById(id);
      setDetails(data);
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

  const handleDelete = async () => {
    if (!selectedReturn) return;
    if (!confirm(t('modals.confirmations.delete_vat_return'))) return;
    try {
      await vatReturnsApi.delete(selectedReturn.id);
      setSelectedReturn(null);
      setSelectedPeriod(null);
      setDetails(null);
      loadData();
      toast({ title: t('vatReturns.deleted'), status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || t('vatReturns.deleteError'), status: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!selectedReturn) return;
    if (!confirm(t('modals.confirmations.mark_vat_return_submitted'))) return;
    try {
      await vatReturnsApi.submit(selectedReturn.id);
      loadData();
      loadDetails(selectedReturn.id);
      toast({ title: t('vatReturns.markedSubmitted'), status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || t('vatReturns.loadError'), status: 'error' });
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

  const handleGenerateZip = async () => {
    if (!selectedReturn) return;
    setZipLoading(true);
    try {
      const [deklar, pokupki, prodajbi] = await Promise.all([
        vatReturnsApi.exportDeklar(selectedReturn.id),
        vatReturnsApi.exportPokupki(selectedReturn.id),
        vatReturnsApi.exportProdajbi(selectedReturn.id),
      ]);
      // Note: In production, use JSZip library
      // For now, download separately
      downloadFile('DEKLAR.TXT', deklar);
      downloadFile('POKUPKI.TXT', pokupki);
      downloadFile('PRODAGBI.TXT', prodajbi);
      toast({ title: t('vatReturns.filesDownloaded'), status: 'success' });
    } catch (error) {
      toast({ title: t('vatReturns.exportError'), status: 'error' });
    } finally {
      setZipLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('bg-BG') : '-';

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; labelKey: string }> = {
      DRAFT: { color: 'gray', labelKey: 'vatReturns.draft' },
      CALCULATED: { color: 'blue', labelKey: 'vatReturns.calculated' },
      SUBMITTED: { color: 'green', labelKey: 'vatReturns.submitted' },
      ACCEPTED: { color: 'teal', labelKey: 'vatReturns.accepted' },
      PAID: { color: 'purple', labelKey: 'vatReturns.paid' },
    };
    const { color, labelKey } = config[status] || { color: 'gray', labelKey: '' };
    return <Badge colorScheme={color}>{labelKey ? t(labelKey) : status}</Badge>;
  };

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
              <Heading size="lg">{t('vatReturns.title')}</Heading>
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
            <Tab fontWeight="medium">{t('vatReturns.vatSummary')}</Tab>
            <Tab fontWeight="medium">{t('vatReturns.purchaseLedger')}</Tab>
            <Tab fontWeight="medium">{t('vatReturns.salesLedger')}</Tab>
            <Tab fontWeight="medium">{t('vatReturns.declaration')}</Tab>
            <Tab fontWeight="medium">{t('vatReturns.vies')}</Tab>
          </TabList>

          <TabPanels>
            {/* VAT Summary Tab */}
            <TabPanel px={0}>
              <VStack spacing={6} align="stretch">
                {/* Company Info */}
                <Card bg={cardBg}>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                      <Box>
                        <Text fontSize="sm"><Text as="span" color="gray.500">{t('vatReturns.company')}</Text> <Text as="span" fontWeight="bold">{currentCompany?.name}</Text></Text>
                        <Text fontSize="sm"><Text as="span" color="gray.500">{t('vatReturns.vatNumber')}</Text> {currentCompany?.vatNumber}</Text>
                        <Text fontSize="sm"><Text as="span" color="gray.500">{t('vatReturns.taxPeriod')}</Text> {selectedPeriod?.month}/{selectedPeriod?.year}</Text>
                      </Box>
                      <Box textAlign={{ base: 'left', md: 'right' }}>
                        <Text fontSize="sm" fontWeight="bold">{t('vatReturns.taxOffice')}</Text>
                        <Text fontSize="sm"><Text as="span" color="gray.500">{t('vatReturns.bankAccount')}</Text> BG88BNBG96618000195001</Text>
                        <Text fontSize="sm"><Text as="span" color="gray.500">{t('vatReturns.paymentCode')}</Text> 110000</Text>
                      </Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Summary Table */}
                <Card bg={cardBg} overflow="hidden">
                  <Table size="sm">
                    <Thead bg={hoverBg}>
                      <Tr>
                        <Th>#</Th>
                        <Th>{t('vatReturns.ledger')}</Th>
                        <Th isNumeric>{t('vatReturns.records')}</Th>
                        <Th isNumeric>{t('vatReturns.taxBase')}</Th>
                        <Th isNumeric>{t('vatReturns.vat')}</Th>
                        <Th isNumeric>{t('vatReturns.otherBases')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>1</Td>
                        <Td fontWeight="medium">{t('vatReturns.salesLabel')}</Td>
                        <Td isNumeric>{details.salesDocumentCount}</Td>
                        <Td isNumeric>{formatCurrency(details.salesBase20 + details.salesBase9 + details.salesBaseVop)}</Td>
                        <Td isNumeric>{formatCurrency(details.outputVatAmount)}</Td>
                        <Td isNumeric>{formatCurrency(details.salesBase0Export + details.salesBase0Vod + details.salesBaseExempt)}</Td>
                      </Tr>
                      <Tr>
                        <Td>2</Td>
                        <Td fontWeight="medium">{t('vatReturns.purchasesLabel')}</Td>
                        <Td isNumeric>{details.purchaseDocumentCount}</Td>
                        <Td isNumeric>{formatCurrency(details.purchaseBaseFullCredit + details.purchaseBasePartialCredit)}</Td>
                        <Td isNumeric>{formatCurrency(details.totalDeductibleVat)}</Td>
                        <Td isNumeric>{formatCurrency(details.purchaseBaseNoCredit)}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </Card>

                {/* Result */}
                <Card bg={cardBg}>
                  <CardBody>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
                      <Box>
                        <Text color="gray.500" fontSize="sm">{t('vatReturns.dueDate')}</Text>
                        <Text fontSize="lg" fontWeight="bold">{formatDate(details.dueDate)}</Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="sm"><Text as="span" color="gray.500">{t('vatReturns.totalTaxCredit')}</Text> <Text as="span" fontWeight="bold">{formatCurrency(details.totalDeductibleVat)}</Text></Text>
                        <HStack justify="flex-end" mt={2}>
                          <Text color="gray.500">{details.vatToPay > 0 ? t('vatReturns.vatToPay') : t('vatReturns.vatToRefund')}</Text>
                          <Text
                            fontSize="2xl"
                            fontWeight="bold"
                            color={details.vatToPay > 0 ? 'red.500' : 'green.500'}
                          >
                            {formatCurrency(details.vatToPay > 0 ? details.vatToPay : details.vatToRefund)}
                          </Text>
                        </HStack>
                      </Box>
                    </Flex>
                  </CardBody>
                </Card>

                {/* Status */}
                <Card bg={cardBg}>
                  <CardBody>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
                      <HStack>
                        <Text fontWeight="medium">{t('vatReturns.status')}</Text>
                        {getStatusBadge(details.status)}
                      </HStack>
                      <HStack spacing={3}>
                        {isEditable && (
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            leftIcon={<Icon as={TrashIcon} />}
                            onClick={handleDelete}
                          >
                            {t('vatReturns.deleteBtn')}
                          </Button>
                        )}
                        {details.status === 'CALCULATED' && (
                          <>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              leftIcon={<Icon as={ArchiveIcon} />}
                              onClick={handleGenerateZip}
                              isLoading={zipLoading}
                            >
                              {t('vatReturns.exportForNap')}
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="green"
                              leftIcon={<Icon as={CheckIcon} />}
                              onClick={handleSubmit}
                            >
                              {t('vatReturns.markAsSubmitted')}
                            </Button>
                          </>
                        )}
                      </HStack>
                    </Flex>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Purchase Ledger Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg}>
                <CardHeader>
                  <Flex justify="space-between" align="center">
                    <Heading size="md">{t('vatReturns.purchaseLedger')} - {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
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
                          <Th>{t('vatReturns.clType')}</Th>
                          <Th>{t('vatReturns.clDocNumber')}</Th>
                          <Th>{t('vatReturns.clDate')}</Th>
                          <Th>{t('vatReturns.clVatNumber')}</Th>
                          <Th>{t('vatReturns.clCounterparty')}</Th>
                          <Th isNumeric>{t('vatReturns.clNoCredit')}</Th>
                          <Th isNumeric>{t('vatReturns.clWithCredit')}</Th>
                          <Th isNumeric>{t('vatReturns.clVat')}</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr>
                          <Td colSpan={9} textAlign="center" py={8} color="gray.500">
                            <VStack>
                              <Text>{t('vatReturns.noPurchaseDocuments')}</Text>
                              <Text fontSize="sm">
                                {t('vatReturns.total')} {details.purchaseDocumentCount} | {t('vatReturns.taxBase')}: {formatCurrency(details.purchaseBaseFullCredit)} | {t('vatReturns.vat')}: {formatCurrency(details.purchaseVatFullCredit)}
                              </Text>
                            </VStack>
                          </Td>
                        </Tr>
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
                    <Heading size="md">{t('vatReturns.salesLedger')} - {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
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
                          <Th>{t('vatReturns.clType')}</Th>
                          <Th>{t('vatReturns.clDocNumber')}</Th>
                          <Th>{t('vatReturns.clDate')}</Th>
                          <Th>{t('vatReturns.clVatNumber')}</Th>
                          <Th>{t('vatReturns.clCounterparty')}</Th>
                          <Th isNumeric>{t('vatReturns.clBase20')}</Th>
                          <Th isNumeric>{t('vatReturns.clVat20')}</Th>
                          <Th isNumeric>{t('vatReturns.clIcd')}</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr>
                          <Td colSpan={9} textAlign="center" py={8} color="gray.500">
                            <VStack>
                              <Text>{t('vatReturns.noSalesDocuments')}</Text>
                              <Text fontSize="sm">
                                {t('vatReturns.total')} {details.salesDocumentCount} | {t('vatReturns.base20')} {formatCurrency(details.salesBase20)} | {t('vatReturns.vat')}: {formatCurrency(details.salesVat20)}
                              </Text>
                            </VStack>
                          </Td>
                        </Tr>
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
                <Card bg={details.vatToPay > 0 ? 'red.50' : 'green.50'} _dark={{ bg: details.vatToPay > 0 ? 'red.900' : 'green.900' }}>
                  <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                    <Heading size="sm">{t('vatReturns.sectionC')}</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Stat>
                        <StatLabel color="red.600">{t('vatReturns.vatToPayLabel')}</StatLabel>
                        <StatNumber color="red.600">{formatCurrency(details.vatToPay)}</StatNumber>
                        <StatHelpText><Badge>50</Badge></StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel color="green.600">{t('vatReturns.vatToRefundLabel')}</StatLabel>
                        <StatNumber color="green.600">{formatCurrency(details.vatToRefund)}</StatNumber>
                        <StatHelpText><Badge>60</Badge></StatHelpText>
                      </Stat>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* VIES Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="md">{t('vatReturns.viesDeclaration')} - {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                </CardHeader>
                <CardBody>
                  <Alert status="info" borderRadius="lg">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">{t('vatReturns.viesDeclaration')}</Text>
                      <Text fontSize="sm">
                        {t('vatReturns.viesInfo')}
                        {t('vatReturns.totalIcd')} <Text as="span" fontWeight="bold">{formatCurrency(details.salesBase0Vod)}</Text>
                      </Text>
                    </Box>
                  </Alert>
                  <Flex justify="flex-end" mt={4}>
                    <Button variant="outline" isDisabled>
                      {t('vatReturns.viesComingSoon')}
                    </Button>
                  </Flex>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
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
