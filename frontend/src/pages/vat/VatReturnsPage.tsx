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
      toast({ title: 'Error loading data', status: 'error' });
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
      toast({ title: 'Error loading details', status: 'error' });
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
      toast({ title: 'Period created', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Error generating', status: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReturn) return;
    if (!confirm('Are you sure you want to delete this return?')) return;
    try {
      await vatReturnsApi.delete(selectedReturn.id);
      setSelectedReturn(null);
      setSelectedPeriod(null);
      setDetails(null);
      loadData();
      toast({ title: 'Deleted', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Error deleting', status: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!selectedReturn) return;
    if (!confirm('Mark this return as submitted?')) return;
    try {
      await vatReturnsApi.submit(selectedReturn.id);
      loadData();
      loadDetails(selectedReturn.id);
      toast({ title: 'Marked as submitted', status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || 'Error', status: 'error' });
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
      toast({ title: 'Export error', status: 'error' });
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
      toast({ title: 'Files downloaded', status: 'success' });
    } catch (error) {
      toast({ title: 'Export error', status: 'error' });
    } finally {
      setZipLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('bg-BG') : '-';

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      DRAFT: { color: 'gray', label: 'Draft' },
      CALCULATED: { color: 'blue', label: 'Calculated' },
      SUBMITTED: { color: 'green', label: 'Submitted' },
      ACCEPTED: { color: 'teal', label: 'Accepted' },
      PAID: { color: 'purple', label: 'Paid' },
    };
    const { color, label } = config[status] || { color: 'gray', label: status };
    return <Badge colorScheme={color}>{label}</Badge>;
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
              <Heading size="lg">VAT Returns</Heading>
            </HStack>
            <HStack spacing={3}>
              <Text color="gray.500">Tax period:</Text>
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
                New Period
              </Button>
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {!selectedReturn ? (
        <Card bg={cardBg}>
          <CardBody py={12} textAlign="center">
            <Text color="gray.500" mb={4}>No tax period selected</Text>
            <Button colorScheme="brand" onClick={newPeriodModal.onOpen}>Create New Period</Button>
          </CardBody>
        </Card>
      ) : detailsLoading ? (
        <Flex justify="center" align="center" h="64">
          <Spinner size="xl" color="brand.500" />
        </Flex>
      ) : details ? (
        <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" colorScheme="brand">
          <TabList bg={cardBg} borderBottomWidth="1px" borderColor={borderColor} px={4}>
            <Tab fontWeight="medium">VAT Summary</Tab>
            <Tab fontWeight="medium">Purchase Ledger</Tab>
            <Tab fontWeight="medium">Sales Ledger</Tab>
            <Tab fontWeight="medium">Declaration</Tab>
            <Tab fontWeight="medium">VIES</Tab>
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
                        <Text fontSize="sm"><Text as="span" color="gray.500">Company:</Text> <Text as="span" fontWeight="bold">{currentCompany?.name}</Text></Text>
                        <Text fontSize="sm"><Text as="span" color="gray.500">VAT Number:</Text> {currentCompany?.vatNumber}</Text>
                        <Text fontSize="sm"><Text as="span" color="gray.500">Tax Period:</Text> {selectedPeriod?.month}/{selectedPeriod?.year}</Text>
                      </Box>
                      <Box textAlign={{ base: 'left', md: 'right' }}>
                        <Text fontSize="sm" fontWeight="bold">Tax Office</Text>
                        <Text fontSize="sm"><Text as="span" color="gray.500">Account:</Text> BG88BNBG96618000195001</Text>
                        <Text fontSize="sm"><Text as="span" color="gray.500">Payment Code:</Text> 110000</Text>
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
                        <Th>Ledger</Th>
                        <Th isNumeric>Records</Th>
                        <Th isNumeric>Tax Base</Th>
                        <Th isNumeric>VAT</Th>
                        <Th isNumeric>Other Bases</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>1</Td>
                        <Td fontWeight="medium">Sales</Td>
                        <Td isNumeric>{details.salesDocumentCount}</Td>
                        <Td isNumeric>{formatCurrency(details.salesBase20 + details.salesBase9 + details.salesBaseVop)}</Td>
                        <Td isNumeric>{formatCurrency(details.outputVatAmount)}</Td>
                        <Td isNumeric>{formatCurrency(details.salesBase0Export + details.salesBase0Vod + details.salesBaseExempt)}</Td>
                      </Tr>
                      <Tr>
                        <Td>2</Td>
                        <Td fontWeight="medium">Purchases</Td>
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
                        <Text color="gray.500" fontSize="sm">Due Date</Text>
                        <Text fontSize="lg" fontWeight="bold">{formatDate(details.dueDate)}</Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="sm"><Text as="span" color="gray.500">Total Tax Credit:</Text> <Text as="span" fontWeight="bold">{formatCurrency(details.totalDeductibleVat)}</Text></Text>
                        <HStack justify="flex-end" mt={2}>
                          <Text color="gray.500">{details.vatToPay > 0 ? 'VAT to Pay:' : 'VAT to Refund:'}</Text>
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
                        <Text fontWeight="medium">Status:</Text>
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
                            Delete
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
                              Export for NAP
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="green"
                              leftIcon={<Icon as={CheckIcon} />}
                              onClick={handleSubmit}
                            >
                              Mark as Submitted
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
                    <Heading size="md">Purchase Ledger - {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Icon as={DownloadIcon} />}
                      onClick={() => handleExport('pokupki')}
                    >
                      Download
                    </Button>
                  </Flex>
                </CardHeader>
                <CardBody pt={0}>
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead bg={hoverBg}>
                        <Tr>
                          <Th>cl.1</Th>
                          <Th>cl.3 Type</Th>
                          <Th>cl.4 Doc #</Th>
                          <Th>cl.5 Date</Th>
                          <Th>cl.6 VAT #</Th>
                          <Th>cl.7 Counterparty</Th>
                          <Th isNumeric>cl.9 No Credit</Th>
                          <Th isNumeric>cl.10 With Credit</Th>
                          <Th isNumeric>cl.11 VAT</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr>
                          <Td colSpan={9} textAlign="center" py={8} color="gray.500">
                            <VStack>
                              <Text>No purchase documents in this period</Text>
                              <Text fontSize="sm">
                                Total: {details.purchaseDocumentCount} | Base: {formatCurrency(details.purchaseBaseFullCredit)} | VAT: {formatCurrency(details.purchaseVatFullCredit)}
                              </Text>
                            </VStack>
                          </Td>
                        </Tr>
                      </Tbody>
                      <Tfoot bg={hoverBg}>
                        <Tr fontWeight="bold">
                          <Td colSpan={6} textAlign="right">TOTAL:</Td>
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
                    <Heading size="md">Sales Ledger - {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Icon as={DownloadIcon} />}
                      onClick={() => handleExport('prodajbi')}
                    >
                      Download
                    </Button>
                  </Flex>
                </CardHeader>
                <CardBody pt={0}>
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead bg={hoverBg}>
                        <Tr>
                          <Th>cl.1</Th>
                          <Th>cl.3 Type</Th>
                          <Th>cl.4 Doc #</Th>
                          <Th>cl.5 Date</Th>
                          <Th>cl.6 VAT #</Th>
                          <Th>cl.7 Counterparty</Th>
                          <Th isNumeric>cl.9 Base 20%</Th>
                          <Th isNumeric>cl.10 VAT 20%</Th>
                          <Th isNumeric>cl.15 ICD</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr>
                          <Td colSpan={9} textAlign="center" py={8} color="gray.500">
                            <VStack>
                              <Text>No sales documents in this period</Text>
                              <Text fontSize="sm">
                                Total: {details.salesDocumentCount} | Base 20%: {formatCurrency(details.salesBase20)} | VAT: {formatCurrency(details.salesVat20)}
                              </Text>
                            </VStack>
                          </Td>
                        </Tr>
                      </Tbody>
                      <Tfoot bg={hoverBg}>
                        <Tr fontWeight="bold">
                          <Td colSpan={6} textAlign="right">TOTAL:</Td>
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
                        <Heading size="md">VAT Declaration</Heading>
                        <Text fontSize="sm" color="gray.500">Period: {selectedPeriod?.month}/{selectedPeriod?.year}</Text>
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
                    <Heading size="sm">Section A: Output VAT</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Total tax bases:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase20 + details.salesBase9 + details.salesBaseVop)} <Badge size="sm">01</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Total output VAT:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.outputVatAmount)} <Badge size="sm">20</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Base 20%:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase20)} <Badge size="sm">11</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">VAT 20%:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesVat20)} <Badge size="sm">21</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">ICA Base:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBaseVop)} <Badge size="sm">12</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">ICA VAT:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesVatVop)} <Badge size="sm">22</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Base 9%:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase9)} <Badge size="sm">13</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">VAT 9%:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesVat9)} <Badge size="sm">24</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">ICD (0%):</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase0Vod)} <Badge size="sm">15</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Export (0%):</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBase0Export)} <Badge size="sm">16</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Exempt:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.salesBaseExempt)} <Badge size="sm">19</Badge></Text>
                      </Flex>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Section B */}
                <Card bg={cardBg}>
                  <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                    <Heading size="sm">Section B: Input VAT (Tax Credit)</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Base without credit:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseBaseNoCredit)} <Badge size="sm">30</Badge></Text>
                      </Flex>
                      <Box />
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Base with full credit:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseBaseFullCredit)} <Badge size="sm">31</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">VAT with full credit:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseVatFullCredit)} <Badge size="sm">41</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Base with partial credit:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseBasePartialCredit)} <Badge size="sm">32</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">VAT with partial credit:</Text>
                        <Text fontSize="sm" fontWeight="medium">{formatCurrency(details.purchaseVatPartialCredit)} <Badge size="sm">42</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600">Coefficient:</Text>
                        <Text fontSize="sm" fontWeight="medium">{details.creditCoefficient?.toFixed(3) || '0.000'} <Badge size="sm">33</Badge></Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text fontSize="sm" color="gray.600" fontWeight="bold">Total tax credit:</Text>
                        <Text fontSize="sm" fontWeight="bold">{formatCurrency(details.totalDeductibleVat)} <Badge size="sm">40</Badge></Text>
                      </Flex>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Section C */}
                <Card bg={details.vatToPay > 0 ? 'red.50' : 'green.50'} _dark={{ bg: details.vatToPay > 0 ? 'red.900' : 'green.900' }}>
                  <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                    <Heading size="sm">Section C: Result</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Stat>
                        <StatLabel color="red.600">VAT to Pay (cl.20 - cl.40 &gt; 0)</StatLabel>
                        <StatNumber color="red.600">{formatCurrency(details.vatToPay)}</StatNumber>
                        <StatHelpText><Badge>50</Badge></StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel color="green.600">VAT to Refund (cl.20 - cl.40 &lt; 0)</StatLabel>
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
                  <Heading size="md">VIES Declaration - {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                </CardHeader>
                <CardBody>
                  <Alert status="info" borderRadius="lg">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">VIES Declaration</Text>
                      <Text fontSize="sm">
                        Automatically populated from ICD records in the sales ledger.
                        Total ICD for period: <Text as="span" fontWeight="bold">{formatCurrency(details.salesBase0Vod)}</Text>
                      </Text>
                    </Box>
                  </Alert>
                  <Flex justify="flex-end" mt={4}>
                    <Button variant="outline" isDisabled>
                      VIES.TXT (Coming soon)
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
          <ModalHeader>New Tax Period</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <FormLabel>Year</FormLabel>
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
                <FormLabel>Month</FormLabel>
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
            <Button variant="ghost" mr={3} onClick={newPeriodModal.onClose}>Cancel</Button>
            <Button colorScheme="brand" onClick={handleGenerate} isLoading={creating}>
              Generate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
