import { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Button,
  Flex,
  Text,
  Alert,
  Card,
  Table,
  Badge,
  HStack,
  VStack,
  Tabs,
  NativeSelect,
  Spinner,
  Grid,
  Dialog
} from '@chakra-ui/react'
import { FiPlus, FiDownload, FiTrash2, FiCheck, FiPrinter } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { toaster } from '../components/ui/toaster'

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:4000'

interface VatReturn {
  id: string
  period_year: number
  period_month: number
  status: string
  // Purchases
  purchase_base_20: string
  purchase_vat_20: string
  purchase_base_9: string
  purchase_vat_9: string
  purchase_base_0: string
  purchase_intra_eu: string
  purchase_import: string
  // Sales
  sales_base_20: string
  sales_vat_20: string
  sales_base_9: string
  sales_vat_9: string
  sales_base_0: string
  sales_intra_eu: string
  sales_exempt: string
  // Totals
  total_purchase_vat: string
  total_sales_vat: string
  vat_due: string
  inserted_at: string
}

interface JournalEntry {
  id: string
  entry_number: string
  document_number: string
  document_date: string
  vat_date: string
  description: string
  counterpart_name: string
  counterpart_vat_number: string
  base_amount: string
  vat_amount: string
  vat_operation: string
}

type TabType = 'dds' | 'pokupki' | 'prodajbi' | 'deklaracia' | 'vies'

const monthNames = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
                    'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември']

function VatReturnsPage() {
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('dds')
  const [vatReturns, setVatReturns] = useState<VatReturn[]>([])
  const [selectedReturn, setSelectedReturn] = useState<VatReturn | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null)
  const [purchaseEntries, setPurchaseEntries] = useState<JournalEntry[]>([])
  const [salesEntries, setSalesEntries] = useState<JournalEntry[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1)
  const [zipLoading, setZipLoading] = useState(false)

  // Helpers
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0)
  }
  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('bg-BG') : '-'

  const fetchVatReturns = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/companies/${selectedCompanyId}/vat-returns`)
      if (response.ok) {
        const data = await response.json()
        const returns = data.data || []
        setVatReturns(returns)
        if (returns.length > 0 && !selectedReturn) {
          const latest = returns[0]
          setSelectedReturn(latest)
          setSelectedPeriod({ year: latest.period_year, month: latest.period_month })
        }
      }
    } catch (err) {
      console.error('Failed to fetch VAT returns:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchJournalEntries = async () => {
    if (!selectedCompanyId || !selectedPeriod) return
    const period = `${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, '0')}`
    try {
      // Fetch purchase entries
      const purchaseRes = await fetch(`${API_BASE_URL}/api/companies/${selectedCompanyId}/journal-entries?vat_period=${period}&type=purchase`)
      if (purchaseRes.ok) {
        const data = await purchaseRes.json()
        setPurchaseEntries(data.data || [])
      }
      // Fetch sales entries
      const salesRes = await fetch(`${API_BASE_URL}/api/companies/${selectedCompanyId}/journal-entries?vat_period=${period}&type=sales`)
      if (salesRes.ok) {
        const data = await salesRes.json()
        setSalesEntries(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch journal entries:', err)
    }
  }

  useEffect(() => {
    fetchVatReturns()
  }, [selectedCompanyId])

  useEffect(() => {
    if (selectedPeriod) {
      fetchJournalEntries()
    }
  }, [selectedPeriod])

  const handlePeriodChange = (year: number, month: number) => {
    const found = vatReturns.find(v => v.period_year === year && v.period_month === month)
    if (found) {
      setSelectedReturn(found)
      setSelectedPeriod({ year, month })
    }
  }

  const handleCreateVatReturn = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/companies/${selectedCompanyId}/vat-returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vat_return: { period_year: newYear, period_month: newMonth }
        })
      })
      if (response.ok) {
        const data = await response.json()
        toaster.create({ title: 'ДДС декларация създадена', type: 'success' })
        setIsModalOpen(false)
        await fetchVatReturns()
        if (data.data) {
          setSelectedReturn(data.data)
          setSelectedPeriod({ year: newYear, month: newMonth })
        }
      } else {
        const error = await response.json()
        toaster.create({ title: 'Грешка', description: error.error || 'Неуспешно създаване', type: 'error' })
      }
    } catch (err) {
      toaster.create({ title: 'Грешка при връзка със сървъра', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedReturn) return
    if (!confirm('Сигурни ли сте, че искате да изтриете тази декларация?')) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/vat-returns/${selectedReturn.id}`, { method: 'DELETE' })
      if (response.ok) {
        toaster.create({ title: 'Декларацията е изтрита', type: 'success' })
        setSelectedReturn(null)
        setSelectedPeriod(null)
        fetchVatReturns()
      }
    } catch (err) {
      toaster.create({ title: 'Грешка при изтриване', type: 'error' })
    }
  }

  const handleExport = async (type: 'deklar' | 'pokupki' | 'prodajbi') => {
    if (!selectedReturn) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/vat-returns/${selectedReturn.id}/export/${type}`)
      if (response.ok) {
        const blob = await response.blob()
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${type.toUpperCase()}.TXT`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
      }
    } catch (err) {
      toaster.create({ title: 'Грешка при експорт', type: 'error' })
    }
  }

  const handleGenerateZip = async () => {
    if (!selectedReturn) return
    setZipLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/vat-returns/${selectedReturn.id}/export/zip`)
      if (response.ok) {
        const blob = await response.blob()
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `VAT_${selectedReturn.period_year}_${String(selectedReturn.period_month).padStart(2, '0')}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
        toaster.create({ title: 'Файловете са изтеглени', type: 'success' })
      }
    } catch (err) {
      toaster.create({ title: 'Грешка при генериране на ZIP', type: 'error' })
    } finally {
      setZipLoading(false)
    }
  }

  const handleSubmitReturn = async () => {
    if (!selectedReturn) return
    if (!confirm('Сигурни ли сте, че искате да подадете декларацията?')) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/vat-returns/${selectedReturn.id}/submit`, { method: 'POST' })
      if (response.ok) {
        toaster.create({ title: 'Декларацията е маркирана като подадена', type: 'success' })
        fetchVatReturns()
      }
    } catch (err) {
      toaster.create({ title: 'Грешка при подаване', type: 'error' })
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'DRAFT': 'gray', 'CALCULATED': 'blue', 'SUBMITTED': 'green', 'ACCEPTED': 'green', 'PAID': 'purple'
    }
    const labels: Record<string, string> = {
      'DRAFT': 'Чернова', 'CALCULATED': 'Изчислена', 'SUBMITTED': 'Подадена', 'ACCEPTED': 'Приета', 'PAID': 'Платена'
    }
    return <Badge colorPalette={colors[status] || 'gray'}>{labels[status] || status}</Badge>
  }

  const isEditable = selectedReturn?.status === 'DRAFT' || selectedReturn?.status === 'CALCULATED'

  if (loading && vatReturns.length === 0) {
    return (
      <Flex justify="center" align="center" h="64">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    )
  }

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>Моля изберете фирма</Alert.Title>
      </Alert.Root>
    )
  }

  if (!selectedCompany.is_vat_registered) {
    return (
      <Box>
        <Heading size="lg" mb={6}>ДДС Дневници</Heading>
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Title>Фирмата не е регистрирана по ДДС</Alert.Title>
        </Alert.Root>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header with period selector */}
      <Card.Root mb={4}>
        <Card.Body py={3}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack gap={2}>
              <Heading size="lg">ДДС Дневници:</Heading>
              {selectedReturn && getStatusBadge(selectedReturn.status)}
            </HStack>
            <HStack gap={3}>
              <Text color="gray.600">Данъчен период:</Text>
              <NativeSelect.Root w="80px">
                <NativeSelect.Field
                  value={selectedPeriod?.month || ''}
                  onChange={(e) => selectedPeriod && handlePeriodChange(selectedPeriod.year, parseInt(e.target.value))}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')}</option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
              <NativeSelect.Root w="100px">
                <NativeSelect.Field
                  value={selectedPeriod?.year || ''}
                  onChange={(e) => selectedPeriod && handlePeriodChange(parseInt(e.target.value), selectedPeriod.month)}
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i
                    return <option key={year} value={year}>{year}</option>
                  })}
                </NativeSelect.Field>
              </NativeSelect.Root>
              <Button variant="outline" colorPalette="orange" onClick={() => setIsModalOpen(true)}>
                <FiPlus /> Нов период
              </Button>
            </HStack>
          </Flex>
        </Card.Body>
      </Card.Root>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value as TabType)} mb={4}>
        <Tabs.List>
          <Tabs.Trigger value="dds">ДДС</Tabs.Trigger>
          <Tabs.Trigger value="pokupki">Дневник за Покупки</Tabs.Trigger>
          <Tabs.Trigger value="prodajbi">Дневник за Продажби</Tabs.Trigger>
          <Tabs.Trigger value="deklaracia">Декларация</Tabs.Trigger>
          <Tabs.Trigger value="vies">VIES Декларация</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      {/* Content */}
      {!selectedReturn ? (
        <Card.Root>
          <Card.Body py={12} textAlign="center">
            <Text color="gray.500" mb={4}>Няма избран данъчен период</Text>
            <Button colorPalette="blue" onClick={() => setIsModalOpen(true)}>
              Създай нов период
            </Button>
          </Card.Body>
        </Card.Root>
      ) : (
        <>
          {/* TAB: ДДС Summary */}
          {activeTab === 'dds' && (
            <VStack gap={6} align="stretch">
              {/* Company Info */}
              <Card.Root>
                <Card.Body>
                  <Grid templateColumns="repeat(2, 1fr)" gap={8}>
                    <Box>
                      <Text fontSize="sm"><Text as="span" color="gray.500">Компания:</Text> <Text as="span" fontWeight="semibold">{selectedCompany.name}</Text></Text>
                      <Text fontSize="sm"><Text as="span" color="gray.500">ЕИК:</Text> {selectedCompany.vat_number || `BG${selectedCompany.eik}`}</Text>
                      <Text fontSize="sm"><Text as="span" color="gray.500">Данъчен период:</Text> {selectedPeriod?.month}/{selectedPeriod?.year}</Text>
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="sm" fontWeight="semibold">ТД НА НАП</Text>
                      <Text fontSize="sm"><Text as="span" color="gray.500">Сметка:</Text> BG88BNBG96618000195001</Text>
                      <Text fontSize="sm"><Text as="span" color="gray.500">Вид Плащане:</Text> 110000</Text>
                    </Box>
                  </Grid>
                </Card.Body>
              </Card.Root>

              {/* Summary Table */}
              <Card.Root>
                <Card.Body p={0}>
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg={{ base: "gray.50", _dark: "gray.700" }}>
                        <Table.ColumnHeader>#</Table.ColumnHeader>
                        <Table.ColumnHeader>Дневник</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">Записи</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Данъчна Основа</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Начислено ДДС</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Други ДО</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      <Table.Row>
                        <Table.Cell>1</Table.Cell>
                        <Table.Cell fontWeight="medium">Продажби</Table.Cell>
                        <Table.Cell textAlign="center">{salesEntries.length}</Table.Cell>
                        <Table.Cell textAlign="right">{formatCurrency(parseFloat(selectedReturn.sales_base_20 || '0') + parseFloat(selectedReturn.sales_base_9 || '0'))}</Table.Cell>
                        <Table.Cell textAlign="right">{formatCurrency(selectedReturn.total_sales_vat)}</Table.Cell>
                        <Table.Cell textAlign="right">{formatCurrency(parseFloat(selectedReturn.sales_base_0 || '0') + parseFloat(selectedReturn.sales_exempt || '0'))}</Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell>2</Table.Cell>
                        <Table.Cell fontWeight="medium">Покупки</Table.Cell>
                        <Table.Cell textAlign="center">{purchaseEntries.length}</Table.Cell>
                        <Table.Cell textAlign="right">{formatCurrency(parseFloat(selectedReturn.purchase_base_20 || '0') + parseFloat(selectedReturn.purchase_base_9 || '0'))}</Table.Cell>
                        <Table.Cell textAlign="right">{formatCurrency(selectedReturn.total_purchase_vat)}</Table.Cell>
                        <Table.Cell textAlign="right">{formatCurrency(selectedReturn.purchase_base_0 || '0')}</Table.Cell>
                      </Table.Row>
                    </Table.Body>
                  </Table.Root>
                </Card.Body>
              </Card.Root>

              {/* Result */}
              <Card.Root>
                <Card.Body>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontSize="sm" color="gray.500">Краен Срок</Text>
                      <Text fontSize="lg" fontWeight="semibold">14-то число на следващия месец</Text>
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="sm"><Text as="span" color="gray.500">Общо ДК:</Text> <Text as="span" fontWeight="semibold">{formatCurrency(selectedReturn.total_purchase_vat)}</Text></Text>
                      <Text fontSize="lg">
                        <Text as="span" color="gray.500">{parseFloat(selectedReturn.vat_due || '0') > 0 ? 'ДДС за внасяне:' : 'ДДС за възстановяване:'}</Text>{' '}
                        <Text as="span" fontWeight="bold" color={parseFloat(selectedReturn.vat_due || '0') > 0 ? 'red.600' : 'green.600'}>
                          {formatCurrency(Math.abs(parseFloat(selectedReturn.vat_due || '0')))} лв.
                        </Text>
                      </Text>
                    </Box>
                  </Flex>
                </Card.Body>
              </Card.Root>

              {/* Actions */}
              <Flex justify="space-between">
                <Box>
                  {isEditable && (
                    <Button variant="outline" colorPalette="red" onClick={handleDelete}>
                      <FiTrash2 /> Изтрий
                    </Button>
                  )}
                </Box>
                <HStack gap={2}>
                  {selectedReturn.status === 'CALCULATED' && (
                    <>
                      <Button colorPalette="blue" onClick={handleGenerateZip} loading={zipLoading}>
                        <FiDownload /> Изтегли ZIP за НАП
                      </Button>
                      <Button colorPalette="green" onClick={handleSubmitReturn}>
                        <FiCheck /> Маркирай като подадена
                      </Button>
                    </>
                  )}
                </HStack>
              </Flex>
            </VStack>
          )}

          {/* TAB: Дневник за Покупки */}
          {activeTab === 'pokupki' && (
            <VStack gap={4} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="md">Дневник за Покупки за период {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                <Button variant="outline" onClick={() => handleExport('pokupki')}>
                  <FiDownload /> Свали POKUPKI.TXT
                </Button>
              </Flex>
              <Card.Root>
                <Card.Body p={0} overflowX="auto">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg={{ base: "gray.50", _dark: "gray.700" }}>
                        <Table.ColumnHeader>№</Table.ColumnHeader>
                        <Table.ColumnHeader>Вид</Table.ColumnHeader>
                        <Table.ColumnHeader>Документ №</Table.ColumnHeader>
                        <Table.ColumnHeader>Дата</Table.ColumnHeader>
                        <Table.ColumnHeader>Контрагент №</Table.ColumnHeader>
                        <Table.ColumnHeader>Контрагент</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">ДО</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">ДДС</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {purchaseEntries.length === 0 ? (
                        <Table.Row>
                          <Table.Cell colSpan={8} textAlign="center" py={8} color="gray.500">
                            Няма документи за покупки в този период
                          </Table.Cell>
                        </Table.Row>
                      ) : (
                        purchaseEntries.map((entry, idx) => (
                          <Table.Row key={entry.id}>
                            <Table.Cell>{idx + 1}</Table.Cell>
                            <Table.Cell>01</Table.Cell>
                            <Table.Cell fontWeight="medium">{entry.document_number}</Table.Cell>
                            <Table.Cell>{formatDate(entry.vat_date)}</Table.Cell>
                            <Table.Cell>{entry.counterpart_vat_number || '-'}</Table.Cell>
                            <Table.Cell maxW="200px" truncate>{entry.counterpart_name || '-'}</Table.Cell>
                            <Table.Cell textAlign="right">{formatCurrency(entry.base_amount)}</Table.Cell>
                            <Table.Cell textAlign="right" fontWeight="medium">{formatCurrency(entry.vat_amount)}</Table.Cell>
                          </Table.Row>
                        ))
                      )}
                    </Table.Body>
                    {purchaseEntries.length > 0 && (
                      <Table.Footer>
                        <Table.Row bg={{ base: "gray.100", _dark: "gray.700" }} fontWeight="medium">
                          <Table.Cell colSpan={6} textAlign="right">ОБЩО:</Table.Cell>
                          <Table.Cell textAlign="right">{formatCurrency(parseFloat(selectedReturn.purchase_base_20 || '0') + parseFloat(selectedReturn.purchase_base_9 || '0'))}</Table.Cell>
                          <Table.Cell textAlign="right">{formatCurrency(selectedReturn.total_purchase_vat)}</Table.Cell>
                        </Table.Row>
                      </Table.Footer>
                    )}
                  </Table.Root>
                </Card.Body>
              </Card.Root>
            </VStack>
          )}

          {/* TAB: Дневник за Продажби */}
          {activeTab === 'prodajbi' && (
            <VStack gap={4} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="md">Дневник за Продажби за период {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
                <Button variant="outline" onClick={() => handleExport('prodajbi')}>
                  <FiDownload /> Свали PRODAGBI.TXT
                </Button>
              </Flex>
              <Card.Root>
                <Card.Body p={0} overflowX="auto">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg={{ base: "gray.50", _dark: "gray.700" }}>
                        <Table.ColumnHeader>№</Table.ColumnHeader>
                        <Table.ColumnHeader>Вид</Table.ColumnHeader>
                        <Table.ColumnHeader>Документ №</Table.ColumnHeader>
                        <Table.ColumnHeader>Дата</Table.ColumnHeader>
                        <Table.ColumnHeader>Контрагент №</Table.ColumnHeader>
                        <Table.ColumnHeader>Контрагент</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">ДО 20%</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">ДДС 20%</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {salesEntries.length === 0 ? (
                        <Table.Row>
                          <Table.Cell colSpan={8} textAlign="center" py={8} color="gray.500">
                            Няма документи за продажби в този период
                          </Table.Cell>
                        </Table.Row>
                      ) : (
                        salesEntries.map((entry, idx) => (
                          <Table.Row key={entry.id}>
                            <Table.Cell>{idx + 1}</Table.Cell>
                            <Table.Cell>01</Table.Cell>
                            <Table.Cell fontWeight="medium">{entry.document_number}</Table.Cell>
                            <Table.Cell>{formatDate(entry.vat_date)}</Table.Cell>
                            <Table.Cell>{entry.counterpart_vat_number || '-'}</Table.Cell>
                            <Table.Cell maxW="200px" truncate>{entry.counterpart_name || '-'}</Table.Cell>
                            <Table.Cell textAlign="right">{formatCurrency(entry.base_amount)}</Table.Cell>
                            <Table.Cell textAlign="right" fontWeight="medium">{formatCurrency(entry.vat_amount)}</Table.Cell>
                          </Table.Row>
                        ))
                      )}
                    </Table.Body>
                    {salesEntries.length > 0 && (
                      <Table.Footer>
                        <Table.Row bg={{ base: "gray.100", _dark: "gray.700" }} fontWeight="medium">
                          <Table.Cell colSpan={6} textAlign="right">ОБЩО:</Table.Cell>
                          <Table.Cell textAlign="right">{formatCurrency(selectedReturn.sales_base_20)}</Table.Cell>
                          <Table.Cell textAlign="right">{formatCurrency(selectedReturn.sales_vat_20)}</Table.Cell>
                        </Table.Row>
                      </Table.Footer>
                    )}
                  </Table.Root>
                </Card.Body>
              </Card.Root>
            </VStack>
          )}

          {/* TAB: Декларация */}
          {activeTab === 'deklaracia' && (
            <VStack gap={6} align="stretch">
              <Heading size="md">Декларация за период {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
              <Text fontSize="sm" color="gray.600">Наименование: <Text as="span" fontWeight="semibold">{selectedCompany.name}</Text></Text>

              {/* Раздел А */}
              <Card.Root>
                <Card.Header pb={2}>
                  <Heading size="sm" borderBottomWidth={1} pb={2}>Раздел А: Данни за начислен данък върху добавена стойност</Heading>
                </Card.Header>
                <Card.Body>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} fontSize="sm">
                    <Flex justify="space-between"><Text color="gray.600">Общ размер на данъчните основи:</Text><Text fontWeight="medium">{formatCurrency(parseFloat(selectedReturn.sales_base_20 || '0') + parseFloat(selectedReturn.sales_base_9 || '0') + parseFloat(selectedReturn.sales_base_0 || '0') + parseFloat(selectedReturn.sales_exempt || '0'))} <Text as="span" color="gray.400">01</Text></Text></Flex>
                    <Flex justify="space-between"><Text color="gray.600">Всичко начислен ДДС:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.total_sales_vat)} <Text as="span" color="gray.400">20</Text></Text></Flex>

                    <Flex justify="space-between"><Text color="gray.600">ДО на облагаемите доставки със ставка 20%:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.sales_base_20)} <Text as="span" color="gray.400">11</Text></Text></Flex>
                    <Flex justify="space-between"><Text color="gray.600">Начислен ДДС 20%:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.sales_vat_20)} <Text as="span" color="gray.400">21</Text></Text></Flex>

                    <Flex justify="space-between"><Text color="gray.600">ДО на облагаемите доставки със ставка 9%:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.sales_base_9)} <Text as="span" color="gray.400">13</Text></Text></Flex>
                    <Flex justify="space-between"><Text color="gray.600">Начислен ДДС 9%:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.sales_vat_9)} <Text as="span" color="gray.400">24</Text></Text></Flex>

                    <Flex justify="space-between"><Text color="gray.600">ДО за ВОД на стоки (0%):</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.sales_intra_eu)} <Text as="span" color="gray.400">15</Text></Text></Flex>
                    <Box />

                    <Flex justify="space-between"><Text color="gray.600">ДО на освободени доставки:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.sales_exempt)} <Text as="span" color="gray.400">19</Text></Text></Flex>
                    <Box />
                  </Grid>
                </Card.Body>
              </Card.Root>

              {/* Раздел Б */}
              <Card.Root>
                <Card.Header pb={2}>
                  <Heading size="sm" borderBottomWidth={1} pb={2}>Раздел Б: Данни за упражнено право на данъчен кредит</Heading>
                </Card.Header>
                <Card.Body>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} fontSize="sm">
                    <Flex justify="space-between"><Text color="gray.600">ДО без право на дан.кредит:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.purchase_base_0)} <Text as="span" color="gray.400">30</Text></Text></Flex>
                    <Box />

                    <Flex justify="space-between"><Text color="gray.600">ДО с право на пълен ДК (20%):</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.purchase_base_20)} <Text as="span" color="gray.400">31</Text></Text></Flex>
                    <Flex justify="space-between"><Text color="gray.600">ДДС с право на пълен ДК:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.purchase_vat_20)} <Text as="span" color="gray.400">41</Text></Text></Flex>

                    <Flex justify="space-between"><Text color="gray.600">ДО с право на пълен ДК (9%):</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.purchase_base_9)} <Text as="span" color="gray.400">32</Text></Text></Flex>
                    <Flex justify="space-between"><Text color="gray.600">ДДС с право на ДК (9%):</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.purchase_vat_9)} <Text as="span" color="gray.400">42</Text></Text></Flex>

                    <Box />
                    <Flex justify="space-between"><Text color="gray.600">Общ данъчен кредит:</Text><Text fontWeight="medium">{formatCurrency(selectedReturn.total_purchase_vat)} <Text as="span" color="gray.400">40</Text></Text></Flex>
                  </Grid>
                </Card.Body>
              </Card.Root>

              {/* Раздел В */}
              <Card.Root>
                <Card.Header pb={2}>
                  <Heading size="sm" borderBottomWidth={1} pb={2}>Раздел В: Резултат за периода</Heading>
                </Card.Header>
                <Card.Body>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} fontSize="sm">
                    <Flex justify="space-between">
                      <Text color="gray.600">ДДС за внасяне (кл.20 - кл.40) &gt; 0:</Text>
                      <Text fontWeight="medium" color="red.600">
                        {formatCurrency(Math.max(0, parseFloat(selectedReturn.vat_due || '0')))} <Text as="span" color="gray.400">50</Text>
                      </Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text color="gray.600">ДДС за възстановяване (кл.20 - кл.40) &lt; 0:</Text>
                      <Text fontWeight="medium" color="green.600">
                        {formatCurrency(Math.abs(Math.min(0, parseFloat(selectedReturn.vat_due || '0'))))} <Text as="span" color="gray.400">60</Text>
                      </Text>
                    </Flex>
                  </Grid>
                </Card.Body>
              </Card.Root>

              {/* Export buttons */}
              <Flex justify="flex-end" gap={2}>
                <Button variant="outline" onClick={() => handleExport('deklar')}>
                  <FiDownload /> DEKLAR.TXT
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <FiPrinter /> Печат
                </Button>
              </Flex>
            </VStack>
          )}

          {/* TAB: VIES */}
          {activeTab === 'vies' && (
            <VStack gap={6} align="stretch">
              <Heading size="md">VIES Декларация за период {selectedPeriod?.month}/{selectedPeriod?.year}</Heading>
              <Card.Root>
                <Card.Body py={8} textAlign="center">
                  <Text color="gray.500">VIES Декларацията се попълва автоматично от ВОД записите в дневника за продажби.</Text>
                  <Text mt={2} fontSize="sm">ВОД за периода: <Text as="span" fontWeight="semibold">{formatCurrency(selectedReturn.sales_intra_eu)}</Text></Text>
                </Card.Body>
              </Card.Root>
              <Flex justify="flex-end">
                <Button variant="outline" disabled>
                  <FiDownload /> VIES.TXT (скоро)
                </Button>
              </Flex>
            </VStack>
          )}
        </>
      )}

      {/* New Period Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={(e) => setIsModalOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Нов данъчен период</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Година</Text>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={newYear}
                      onChange={(e) => setNewYear(parseInt(e.target.value))}
                    >
                      {[...Array(5)].map((_, i) => {
                        const year = new Date().getFullYear() - i
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Месец</Text>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={newMonth}
                      onChange={(e) => setNewMonth(parseInt(e.target.value))}
                    >
                      {monthNames.map((name, i) => (
                        <option key={i + 1} value={i + 1}>{name}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Box>
              </Grid>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Отказ
              </Button>
              <Button colorPalette="blue" onClick={handleCreateVatReturn} loading={loading}>
                Генерирай
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default VatReturnsPage
