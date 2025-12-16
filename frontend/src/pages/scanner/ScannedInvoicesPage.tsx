import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  IconButton,
  Badge,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  useToast,
  Spinner,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Alert,
  AlertIcon,
  Tooltip,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { scannerApi } from '../../api/scanner';
import type { ScannedInvoice, ScannedInvoiceStatus, InvoiceDirection } from '../../types';

// Icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const MoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
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

const ScanIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM19 13h-1.5v1.5H19V13z"/>
  </svg>
);

export default function ScannedInvoicesPage() {
  const { companyId } = useCompany();
  const toast = useToast();

  const [invoices, setInvoices] = useState<ScannedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScannedInvoiceStatus | 'ALL'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<InvoiceDirection | 'ALL'>('ALL');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    if (companyId) {
      loadInvoices();
    }
  }, [companyId]);

  const loadInvoices = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await scannerApi.getScannedInvoices(companyId);
      setInvoices(data);
    } catch (error) {
      toast({ title: 'Error loading invoices', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: number) => {
    setProcessing(id);
    try {
      const result = await scannerApi.processScannedInvoice(id);
      toast({
        title: 'Invoice processed',
        description: `Journal entry #${result.journalEntryId} created`,
        status: 'success',
      });
      loadInvoices();
    } catch (error: any) {
      toast({ title: error.message || 'Processing error', status: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await scannerApi.deleteScannedInvoice(id);
      toast({ title: 'Invoice deleted', status: 'success' });
      loadInvoices();
    } catch (error) {
      toast({ title: 'Error deleting', status: 'error' });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' }).format(amount || 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('bg-BG');
  };

  const getStatusBadge = (status: ScannedInvoiceStatus) => {
    const config = {
      PENDING: { color: 'yellow', label: 'Pending' },
      PROCESSED: { color: 'green', label: 'Processed' },
      REJECTED: { color: 'red', label: 'Rejected' },
    };
    const { color, label } = config[status] || { color: 'gray', label: status };
    return <Badge colorScheme={color}>{label}</Badge>;
  };

  const getDirectionBadge = (direction: InvoiceDirection) => {
    const config = {
      PURCHASE: { color: 'blue', label: 'Purchase' },
      SALE: { color: 'green', label: 'Sale' },
      UNKNOWN: { color: 'gray', label: 'Unknown' },
    };
    const { color, label } = config[direction] || { color: 'gray', label: direction };
    return <Badge colorScheme={color}>{label}</Badge>;
  };

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (directionFilter !== 'ALL' && inv.direction !== directionFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        inv.documentNumber?.toLowerCase().includes(search) ||
        inv.vendorName?.toLowerCase().includes(search) ||
        inv.customerName?.toLowerCase().includes(search) ||
        inv.vendorVatNumber?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'PENDING').length,
    processed: invoices.filter(i => i.status === 'PROCESSED').length,
    purchases: invoices.filter(i => i.direction === 'PURCHASE').length,
    sales: invoices.filter(i => i.direction === 'SALE').length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.invoiceTotal || 0), 0),
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
          <Heading size="lg" mb={1}>Scanned Invoices</Heading>
          <Text color="gray.500">View and process AI-scanned documents</Text>
        </Box>
        <Button
          as={RouterLink}
          to="/scanner"
          leftIcon={<Icon as={ScanIcon} />}
          colorScheme="brand"
        >
          Scan New Invoice
        </Button>
      </HStack>

      {/* Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Stat bg={cardBg} p={4} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Total Invoices</StatLabel>
          <StatNumber>{stats.total}</StatNumber>
          <StatHelpText>{stats.purchases} purchases, {stats.sales} sales</StatHelpText>
        </Stat>
        <Stat bg="yellow.50" p={4} borderRadius="xl" borderWidth="1px" borderColor="yellow.200">
          <StatLabel color="yellow.700">Pending</StatLabel>
          <StatNumber color="yellow.700">{stats.pending}</StatNumber>
          <StatHelpText>awaiting processing</StatHelpText>
        </Stat>
        <Stat bg="green.50" p={4} borderRadius="xl" borderWidth="1px" borderColor="green.200">
          <StatLabel color="green.700">Processed</StatLabel>
          <StatNumber color="green.700">{stats.processed}</StatNumber>
          <StatHelpText>journal entries created</StatHelpText>
        </Stat>
        <Stat bg={cardBg} p={4} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Total Amount</StatLabel>
          <StatNumber fontSize="xl">{formatCurrency(stats.totalAmount)}</StatNumber>
        </Stat>
      </SimpleGrid>

      {/* Filters */}
      <Card bg={cardBg} mb={6}>
        <CardBody py={4}>
          <HStack spacing={4} wrap="wrap">
            <InputGroup maxW="300px">
              <InputLeftElement pointerEvents="none">
                <Icon as={SearchIcon} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by name, number, VAT..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Select
              maxW="150px"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSED">Processed</option>
              <option value="REJECTED">Rejected</option>
            </Select>
            <Select
              maxW="150px"
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value as any)}
            >
              <option value="ALL">All Types</option>
              <option value="PURCHASE">Purchases</option>
              <option value="SALE">Sales</option>
            </Select>
          </HStack>
        </CardBody>
      </Card>

      {/* Table */}
      {filteredInvoices.length === 0 ? (
        <Card bg={cardBg}>
          <CardBody py={12}>
            <VStack spacing={4}>
              <Text fontSize="lg" color="gray.500">No scanned invoices found</Text>
              <Button
                as={RouterLink}
                to="/scanner"
                colorScheme="brand"
                leftIcon={<Icon as={ScanIcon} />}
              >
                Scan Your First Invoice
              </Button>
            </VStack>
          </CardBody>
        </Card>
      ) : (
        <Card bg={cardBg} overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Document #</Th>
                  <Th>Type</Th>
                  <Th>Counterparty</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Status</Th>
                  <Th w="100px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredInvoices.map(invoice => (
                  <Tr key={invoice.id} _hover={{ bg: hoverBg }}>
                    <Td>{formatDate(invoice.documentDate)}</Td>
                    <Td fontFamily="mono" fontWeight="medium">{invoice.documentNumber || '-'}</Td>
                    <Td>{getDirectionBadge(invoice.direction)}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium" noOfLines={1}>
                          {invoice.direction === 'PURCHASE' ? invoice.vendorName : invoice.customerName}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {invoice.direction === 'PURCHASE' ? invoice.vendorVatNumber : invoice.customerVatNumber}
                        </Text>
                      </VStack>
                    </Td>
                    <Td isNumeric fontWeight="medium">{formatCurrency(invoice.invoiceTotal)}</Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        {getStatusBadge(invoice.status)}
                        {invoice.requiresManualReview && (
                          <Tooltip label={invoice.manualReviewReason}>
                            <Badge colorScheme="orange" fontSize="xs">Review</Badge>
                          </Tooltip>
                        )}
                      </VStack>
                    </Td>
                    <Td>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<Icon as={MoreIcon} />}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          {invoice.status === 'PENDING' && (
                            <MenuItem
                              icon={<Icon as={CheckIcon} />}
                              onClick={() => handleProcess(invoice.id)}
                              isDisabled={processing === invoice.id}
                            >
                              {processing === invoice.id ? 'Processing...' : 'Process Invoice'}
                            </MenuItem>
                          )}
                          {invoice.journalEntryId && (
                            <MenuItem
                              as={RouterLink}
                              to={`/journal/entries/edit/${invoice.journalEntryId}`}
                            >
                              View Journal Entry
                            </MenuItem>
                          )}
                          <MenuItem
                            icon={<Icon as={TrashIcon} />}
                            color="red.500"
                            onClick={() => handleDelete(invoice.id)}
                          >
                            Delete
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

      {/* Help Info */}
      <Alert status="info" borderRadius="lg" mt={6}>
        <AlertIcon />
        <Box>
          <Text fontWeight="medium">How it works</Text>
          <Text fontSize="sm">
            Scanned invoices are stored for review. Click "Process Invoice" to automatically create a journal entry with the suggested accounts.
          </Text>
        </Box>
      </Alert>
    </Box>
  );
}
