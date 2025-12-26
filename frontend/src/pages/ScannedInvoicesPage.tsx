import { useState, useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Badge,
  Card,
  Table,
  Spinner,
  Flex,
  Input,
  NativeSelect,
  Alert,
} from '@chakra-ui/react'
import { FiSearch, FiEye, FiTrash, FiCamera } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { scannerApi } from '../api/scanner'
import { toaster } from '../components/ui/toaster'
import type { ScannedInvoice, ScannedInvoiceStatus, InvoiceDirection } from '../types'

function ScannedInvoicesPage() {
  const { selectedCompany, selectedCompanyId } = useCompany()
  const navigate = useNavigate()

  const [invoices, setInvoices] = useState<ScannedInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScannedInvoiceStatus | 'ALL'>('ALL')
  const [directionFilter, setDirectionFilter] = useState<InvoiceDirection | 'ALL'>('ALL')

  useEffect(() => {
    if (selectedCompanyId) {
      loadInvoices()
    }
  }, [selectedCompanyId])

  const loadInvoices = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const data = await scannerApi.getScannedInvoices(selectedCompanyId)
      setInvoices(data)
    } catch (error) {
      toaster.create({ title: 'Грешка при зареждане', type: 'error', duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async (id: number) => {
    setProcessing(id)
    try {
      const result = await scannerApi.processScannedInvoice(id)
      toaster.create({
        title: 'Фактурата е обработена',
        description: `Създаден е счетоводен запис #${result.journalEntryId}`,
        type: 'success',
        duration: 3000,
      })
      loadInvoices()
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при обработка', type: 'error', duration: 3000 })
    } finally {
      setProcessing(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете тази фактура?')) return
    try {
      await scannerApi.deleteScannedInvoice(id)
      toaster.create({ title: 'Фактурата е изтрита', type: 'success', duration: 2000 })
      loadInvoices()
    } catch (error) {
      toaster.create({ title: 'Грешка при изтриване', type: 'error', duration: 3000 })
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' }).format(amount || 0)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('bg-BG')
  }

  const getStatusBadge = (status: ScannedInvoiceStatus) => {
    const config: Record<string, { color: string; label: string }> = {
      PENDING: { color: 'yellow', label: 'Изчаква' },
      PROCESSED: { color: 'green', label: 'Обработена' },
      REJECTED: { color: 'red', label: 'Отхвърлена' },
    }
    const { color, label } = config[status] || { color: 'gray', label: status }
    return <Badge colorPalette={color}>{label}</Badge>
  }

  const getDirectionBadge = (direction: InvoiceDirection) => {
    const config: Record<string, { color: string; label: string }> = {
      PURCHASE: { color: 'blue', label: 'Покупка' },
      SALE: { color: 'green', label: 'Продажба' },
      UNKNOWN: { color: 'gray', label: 'Неизвестен' },
    }
    const { color, label } = config[direction] || { color: 'gray', label: direction }
    return <Badge colorPalette={color}>{label}</Badge>
  }

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
    if (directionFilter !== 'ALL' && inv.direction !== directionFilter) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        inv.documentNumber?.toLowerCase().includes(search) ||
        inv.vendorName?.toLowerCase().includes(search) ||
        inv.customerName?.toLowerCase().includes(search) ||
        inv.vendorVatNumber?.toLowerCase().includes(search)
      )
    }
    return true
  })

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'PENDING').length,
    processed: invoices.filter(i => i.status === 'PROCESSED').length,
    purchases: invoices.filter(i => i.direction === 'PURCHASE').length,
    sales: invoices.filter(i => i.direction === 'SALE').length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.invoiceTotal || 0), 0),
  }

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>Моля изберете фирма</Alert.Title>
      </Alert.Root>
    )
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" h="64">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    )
  }

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={6}>
        <Box>
          <Heading size="lg" mb={1}>Сканирани фактури</Heading>
          <Text color="#718096">Преглед и обработка на сканирани документи</Text>
        </Box>
        <Button asChild colorScheme="blue">
          <RouterLink to="/scanner">
            <FiCamera style={{ marginRight: '8px' }} /> Сканирай нова
          </RouterLink>
        </Button>
      </HStack>

      {/* Stats */}
      <HStack gap={4} mb={6} flexWrap="wrap">
        <Box bg={{ base: "white", _dark: "gray.800" }} p={4} borderRadius="xl" borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }} flex="1" minW="150px">
          <Text fontSize="sm" color={{ base: "#718096", _dark: "gray.400" }}>Общо фактури</Text>
          <Text fontSize="2xl" fontWeight="bold">{stats.total}</Text>
          <Text fontSize="xs" color={{ base: "#a0aec0", _dark: "gray.500" }}>{stats.purchases} покупки, {stats.sales} продажби</Text>
        </Box>
        <Box bg={{ base: "yellow.50", _dark: "yellow.900/30" }} p={4} borderRadius="xl" borderWidth="1px" borderColor={{ base: "yellow.200", _dark: "yellow.700" }} flex="1" minW="150px">
          <Text fontSize="sm" color={{ base: "yellow.700", _dark: "yellow.300" }}>Изчакващи</Text>
          <Text fontSize="2xl" fontWeight="bold" color={{ base: "yellow.700", _dark: "yellow.300" }}>{stats.pending}</Text>
          <Text fontSize="xs" color={{ base: "yellow.600", _dark: "yellow.400" }}>За обработка</Text>
        </Box>
        <Box bg={{ base: "green.50", _dark: "green.900/30" }} p={4} borderRadius="xl" borderWidth="1px" borderColor={{ base: "green.200", _dark: "green.700" }} flex="1" minW="150px">
          <Text fontSize="sm" color={{ base: "green.700", _dark: "green.300" }}>Обработени</Text>
          <Text fontSize="2xl" fontWeight="bold" color={{ base: "green.700", _dark: "green.300" }}>{stats.processed}</Text>
          <Text fontSize="xs" color={{ base: "green.600", _dark: "green.400" }}>Със записи</Text>
        </Box>
        <Box bg={{ base: "white", _dark: "gray.800" }} p={4} borderRadius="xl" borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }} flex="1" minW="150px">
          <Text fontSize="sm" color={{ base: "#718096", _dark: "gray.400" }}>Обща сума</Text>
          <Text fontSize="xl" fontWeight="bold">{formatCurrency(stats.totalAmount)}</Text>
        </Box>
      </HStack>

      {/* Filters */}
      <Card.Root mb={6}>
        <Card.Body py={4}>
          <HStack gap={4} flexWrap="wrap">
            <Box position="relative" maxW="300px">
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400" zIndex={1}>
                <FiSearch />
              </Box>
              <Input
                pl={10}
                placeholder="Търсене по номер, име, ДДС..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Box>
            <NativeSelect.Root maxW="150px">
              <NativeSelect.Field
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as ScannedInvoiceStatus | 'ALL')}
              >
                <option value="ALL">Всички статуси</option>
                <option value="PENDING">Изчакващи</option>
                <option value="PROCESSED">Обработени</option>
                <option value="REJECTED">Отхвърлени</option>
              </NativeSelect.Field>
            </NativeSelect.Root>
            <NativeSelect.Root maxW="150px">
              <NativeSelect.Field
                value={directionFilter}
                onChange={e => setDirectionFilter(e.target.value as InvoiceDirection | 'ALL')}
              >
                <option value="ALL">Всички типове</option>
                <option value="PURCHASE">Покупки</option>
                <option value="SALE">Продажби</option>
              </NativeSelect.Field>
            </NativeSelect.Root>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Table */}
      {filteredInvoices.length === 0 ? (
        <Card.Root>
          <Card.Body py={12}>
            <VStack gap={4}>
              <Text fontSize="lg" color="#718096">Няма сканирани фактури</Text>
              <Button asChild colorScheme="blue">
                <RouterLink to="/scanner">
                  <FiCamera style={{ marginRight: '8px' }} /> Сканирай първата
                </RouterLink>
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <Card.Root overflow="hidden">
          <Box overflowX="auto">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  <Table.ColumnHeader>Номер</Table.ColumnHeader>
                  <Table.ColumnHeader>Тип</Table.ColumnHeader>
                  <Table.ColumnHeader>Контрагент</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Сума</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader w="150px"></Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredInvoices.map(invoice => (
                  <Table.Row 
                    key={invoice.id} 
                    _hover={{ bg: 'gray.50', cursor: 'pointer' }}
                    onClick={() => navigate(`/scanned-invoices/${invoice.id}/review`)}
                  >
                    <Table.Cell>{formatDate(invoice.documentDate)}</Table.Cell>
                    <Table.Cell fontFamily="mono" fontWeight="medium">{invoice.documentNumber || '-'}</Table.Cell>
                    <Table.Cell>{getDirectionBadge(invoice.direction)}</Table.Cell>
                    <Table.Cell>
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium">
                          {invoice.direction === 'PURCHASE' ? invoice.vendorName : invoice.customerName}
                        </Text>
                        <Text fontSize="xs" color="#718096">
                          {invoice.direction === 'PURCHASE' ? invoice.vendorVatNumber : invoice.customerVatNumber}
                        </Text>
                      </VStack>
                    </Table.Cell>
                    <Table.Cell textAlign="right" fontWeight="medium">{formatCurrency(invoice.invoiceTotal)}</Table.Cell>
                    <Table.Cell>
                      <VStack align="start" gap={1}>
                        {getStatusBadge(invoice.status)}
                        {invoice.requiresManualReview && (
                          <Badge colorPalette="orange" fontSize="xs" title={invoice.manualReviewReason}>Преглед</Badge>
                        )}
                      </VStack>
                    </Table.Cell>
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <HStack gap={2}>
                        {invoice.status === 'PENDING' && (
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={() => navigate(`/scanned-invoices/${invoice.id}/review`)}
                          >
                             <FiEye />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => handleDelete(invoice.id)}
                        >
                          <FiTrash />
                        </Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Card.Root>
      )}

      {/* Help Info */}
      <Alert.Root status="info" mt={6}>
        <Alert.Indicator />
        <Box>
          <Text fontWeight="medium">Как работи?</Text>
          <Text fontSize="sm">
            Сканирайте PDF фактури → AI извлича данните → Прегледайте и коригирайте → Създайте счетоводни записи автоматично
          </Text>
        </Box>
      </Alert.Root>
    </Box>
  )
}

export default ScannedInvoicesPage
