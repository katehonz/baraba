import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Heading,
  Text,
  Button,
  Card,
  Table,
  Badge,
  HStack,
  VStack,
  Spinner,
  Tabs,
  Dialog,
  Field,
  Input,
  NativeSelect,
  Textarea,
  Stat,
  Menu,
  IconButton,
  Flex,
  Center,
  Alert
} from '@chakra-ui/react'
import { FiPlus, FiTrash2, FiRefreshCw, FiMoreVertical, FiCheck, FiEdit2 } from 'react-icons/fi'
import { MdCalculate } from 'react-icons/md'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { toaster } from '../components/ui/toaster'
import type {
  FixedAsset,
  FixedAssetCategory,
  CalculatedPeriod,
  CalculationResult,
  PostResult,
  DepreciationJournal
} from '../types'

const MONTH_NAMES = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
]

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: 'Активен' },
  DEPRECIATED: { color: 'blue', label: 'Изхабен' },
  DISPOSED: { color: 'red', label: 'Бракуван' },
  SOLD: { color: 'orange', label: 'Продаден' }
}

function FixedAssetsPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()

  // State
  const [tabValue, setTabValue] = useState('assets')
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [categories, setCategories] = useState<FixedAssetCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Depreciation state
  const [calculatedPeriods, setCalculatedPeriods] = useState<CalculatedPeriod[]>([])
  const [calcYear, setCalcYear] = useState(new Date().getFullYear())
  const [calcMonth, setCalcMonth] = useState(new Date().getMonth() + 1)
  const [calculating, setCalculating] = useState(false)
  const [posting, setPosting] = useState(false)
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null)
  const [postResult, setPostResult] = useState<PostResult | null>(null)

  // Journal state
  const [journalYear, setJournalYear] = useState(new Date().getFullYear())
  const [journalMonth, setJournalMonth] = useState<number | null>(null)
  const [journalEntries, setJournalEntries] = useState<DepreciationJournal[]>([])
  const [journalLoading, setJournalLoading] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    inventory_number: '',
    description: '',
    category_id: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    acquisition_cost: '',
    residual_value: '0',
    document_number: '',
    document_date: '',
    put_into_service_date: '',
    depreciation_method: 'LINEAR' as 'LINEAR' | 'DECLINING_BALANCE',
    accounting_depreciation_rate: '',
    tax_depreciation_rate: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DEPRECIATED' | 'DISPOSED' | 'SOLD'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadAssets()
      loadCategories()
      loadCalculatedPeriods()
    }
  }, [selectedCompanyId, statusFilter])

  useEffect(() => {
    if (selectedCompanyId && tabValue === 'journal') {
      loadJournal()
    }
  }, [selectedCompanyId, tabValue, journalYear, journalMonth])

  const loadAssets = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await apiClient.getFixedAssets(selectedCompanyId, statusFilter || undefined)
      setAssets(response.data)
    } catch (error) {
      toaster.create({ title: t('fixed_assets.errors.load_failed'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    if (!selectedCompanyId) return
    try {
      const response = await apiClient.getFixedAssetCategories(selectedCompanyId)
      setCategories(response.data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadCalculatedPeriods = async () => {
    if (!selectedCompanyId) return
    try {
      const response = await apiClient.getCalculatedPeriods(selectedCompanyId)
      setCalculatedPeriods(response.data)
    } catch (error) {
      console.error('Error loading periods:', error)
    }
  }

  const loadJournal = async () => {
    if (!selectedCompanyId) return
    setJournalLoading(true)
    try {
      const response = await apiClient.getDepreciationJournal(selectedCompanyId, journalYear, journalMonth || undefined)
      setJournalEntries(response.data)
    } catch (error) {
      toaster.create({ title: t('fixed_assets.errors.journal_load_failed'), type: 'error' })
    } finally {
      setJournalLoading(false)
    }
  }

  const handleCalculate = async () => {
    if (!selectedCompanyId) return
    setCalculating(true)
    setCalcResult(null)
    setPostResult(null)
    try {
      const response = await apiClient.calculateDepreciation(selectedCompanyId, calcYear, calcMonth)
      setCalcResult(response.data)
      loadCalculatedPeriods()
      loadAssets()
      toaster.create({ title: t('fixed_assets.depreciation_calculated'), type: 'success' })
    } catch (error: any) {
      toaster.create({ title: error.error || t('fixed_assets.errors.calculation_failed'), type: 'error' })
    } finally {
      setCalculating(false)
    }
  }

  const handlePost = async () => {
    if (!selectedCompanyId) return
    if (!confirm(t('fixed_assets.confirm_post'))) return
    setPosting(true)
    try {
      const response = await apiClient.postDepreciation(selectedCompanyId, calcYear, calcMonth)
      setPostResult(response.data)
      loadCalculatedPeriods()
      loadAssets()
      toaster.create({ title: t('fixed_assets.depreciation_posted'), type: 'success' })
    } catch (error: any) {
      toaster.create({ title: error.error || t('fixed_assets.errors.post_failed'), type: 'error' })
    } finally {
      setPosting(false)
    }
  }

  const openModal = (asset?: FixedAsset) => {
    if (asset) {
      setEditingAsset(asset)
      setFormData({
        name: asset.name,
        inventory_number: asset.inventory_number || '',
        description: asset.description || '',
        category_id: asset.category_id || '',
        acquisition_date: asset.acquisition_date,
        acquisition_cost: asset.acquisition_cost?.toString() || '',
        residual_value: asset.residual_value?.toString() || '0',
        document_number: asset.document_number || '',
        document_date: asset.document_date || '',
        put_into_service_date: asset.put_into_service_date || '',
        depreciation_method: asset.depreciation_method || 'LINEAR',
        accounting_depreciation_rate: asset.accounting_depreciation_rate?.toString() || '',
        tax_depreciation_rate: asset.tax_depreciation_rate?.toString() || '',
        status: asset.status || 'ACTIVE'
      })
    } else {
      setEditingAsset(null)
      setFormData({
        name: '',
        inventory_number: '',
        description: '',
        category_id: '',
        acquisition_date: new Date().toISOString().split('T')[0],
        acquisition_cost: '',
        residual_value: '0',
        document_number: '',
        document_date: '',
        put_into_service_date: '',
        depreciation_method: 'LINEAR',
        accounting_depreciation_rate: '',
        tax_depreciation_rate: '',
        status: 'ACTIVE'
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAsset(null)
  }

  const handleSubmit = async () => {
    if (!selectedCompanyId) return
    setSaving(true)
    try {
      const data = {
        ...formData,
        acquisition_cost: parseFloat(formData.acquisition_cost) || 0,
        residual_value: parseFloat(formData.residual_value) || 0,
        accounting_depreciation_rate: parseFloat(formData.accounting_depreciation_rate) || 0,
        tax_depreciation_rate: parseFloat(formData.tax_depreciation_rate) || 0
      }
      if (editingAsset) {
        await apiClient.updateFixedAsset(selectedCompanyId, editingAsset.id, data)
        toaster.create({ title: t('fixed_assets.asset_updated'), type: 'success' })
      } else {
        await apiClient.createFixedAsset(selectedCompanyId, data)
        toaster.create({ title: t('fixed_assets.asset_created'), type: 'success' })
      }
      await loadAssets()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('fixed_assets.errors.save_failed'),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (asset: FixedAsset) => {
    if (!selectedCompanyId) return
    if (!confirm(t('fixed_assets.confirm_delete', { name: asset.name }))) return
    try {
      await apiClient.deleteFixedAsset(selectedCompanyId, asset.id)
      toaster.create({ title: t('fixed_assets.asset_deleted'), type: 'success' })
      await loadAssets()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('fixed_assets.errors.delete_failed'),
        type: 'error'
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { color: 'gray', label: status }
    return <Badge colorPalette={config.color}>{config.label}</Badge>
  }

  // Stats calculations
  const stats = {
    total: assets.length,
    active: assets.filter(a => a.status === 'ACTIVE').length,
    totalValue: assets.reduce((sum, a) => sum + (a.acquisition_cost || 0), 0),
    totalBookValue: assets.reduce((sum, a) => sum + (a.accounting_book_value || 0), 0)
  }

  // Journal totals
  const journalTotals = journalEntries.reduce(
    (acc, entry) => ({
      accountingAmount: acc.accountingAmount + (entry.accounting_depreciation_amount || 0),
      taxAmount: acc.taxAmount + (entry.tax_depreciation_amount || 0),
      count: acc.count + 1,
      posted: acc.posted + (entry.is_posted ? 1 : 0)
    }),
    { accountingAmount: 0, taxAmount: 0, count: 0, posted: 0 }
  )

  if (!selectedCompany) {
    return (
      <Box p={6}>
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>{t('common.select_company_first')}</Alert.Title>
        </Alert.Root>
      </Box>
    )
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Box>
          <Heading size="lg" mb={1}>{t('fixed_assets.title')}</Heading>
          <Text color={{ base: "gray.500", _dark: "gray.400" }}>{t('fixed_assets.subtitle')}</Text>
        </Box>
        <Button colorPalette="blue" onClick={() => openModal()}>
          <FiPlus /> {t('fixed_assets.add_asset')}
        </Button>
      </HStack>

      {/* Stats */}
      <HStack gap={4} mb={6} flexWrap="wrap">
        <Stat.Root bg="white" _dark={{ bg: 'gray.800' }} p={4} borderRadius="xl" borderWidth="1px" borderColor="gray.200" flex="1" minW="150px">
          <Stat.Label>{t('fixed_assets.stats.total_assets')}</Stat.Label>
          <Stat.ValueText>{stats.total}</Stat.ValueText>
          <Stat.HelpText>{stats.active} {t('fixed_assets.stats.active')}</Stat.HelpText>
        </Stat.Root>
        <Stat.Root bg="white" _dark={{ bg: 'gray.800' }} p={4} borderRadius="xl" borderWidth="1px" borderColor="gray.200" flex="1" minW="150px">
          <Stat.Label>{t('fixed_assets.stats.acquisition_value')}</Stat.Label>
          <Stat.ValueText fontSize="xl">{formatCurrency(stats.totalValue)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root bg="white" _dark={{ bg: 'gray.800' }} p={4} borderRadius="xl" borderWidth="1px" borderColor="gray.200" flex="1" minW="150px">
          <Stat.Label>{t('fixed_assets.stats.book_value')}</Stat.Label>
          <Stat.ValueText fontSize="xl">{formatCurrency(stats.totalBookValue)}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root bg="white" _dark={{ bg: 'gray.800' }} p={4} borderRadius="xl" borderWidth="1px" borderColor="gray.200" flex="1" minW="150px">
          <Stat.Label>{t('fixed_assets.stats.accumulated_depreciation')}</Stat.Label>
          <Stat.ValueText fontSize="xl">{formatCurrency(stats.totalValue - stats.totalBookValue)}</Stat.ValueText>
        </Stat.Root>
      </HStack>

      <Tabs.Root value={tabValue} onValueChange={(e) => setTabValue(e.value)} variant="enclosed">
        <Tabs.List bg="white" _dark={{ bg: 'gray.800' }} borderBottomWidth="1px" borderColor="gray.200" px={4}>
          <Tabs.Trigger value="assets" fontWeight="medium">{t('fixed_assets.tabs.assets')}</Tabs.Trigger>
          <Tabs.Trigger value="categories" fontWeight="medium">{t('fixed_assets.tabs.categories')}</Tabs.Trigger>
          <Tabs.Trigger value="calculation" fontWeight="medium">{t('fixed_assets.tabs.calculation')}</Tabs.Trigger>
          <Tabs.Trigger value="journal" fontWeight="medium">{t('fixed_assets.tabs.journal')}</Tabs.Trigger>
        </Tabs.List>

        {/* Assets Tab */}
        <Tabs.Content value="assets" px={0}>
          <Card.Root bg="white" _dark={{ bg: 'gray.800' }} mb={4}>
            <Card.Body py={3}>
              <HStack>
                <NativeSelect.Root maxW="200px">
                  <NativeSelect.Field
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">{t('fixed_assets.filters.all_statuses')}</option>
                    <option value="ACTIVE">{t('fixed_assets.status.active')}</option>
                    <option value="DEPRECIATED">{t('fixed_assets.status.depreciated')}</option>
                    <option value="DISPOSED">{t('fixed_assets.status.disposed')}</option>
                    <option value="SOLD">{t('fixed_assets.status.sold')}</option>
                  </NativeSelect.Field>
                </NativeSelect.Root>
                <Button variant="ghost" onClick={loadAssets} loading={loading}>
                  <FiRefreshCw /> {t('common.refresh')}
                </Button>
              </HStack>
            </Card.Body>
          </Card.Root>

          {loading ? (
            <Center py={12}>
              <Spinner size="xl" color={{ base: "blue.500", _dark: "blue.400" }} />
            </Center>
          ) : assets.length === 0 ? (
            <Card.Root bg="white" _dark={{ bg: 'gray.800' }}>
              <Card.Body py={12} textAlign="center">
                <Text color={{ base: "gray.500", _dark: "gray.400" }}>{t('fixed_assets.no_assets')}</Text>
                <Button mt={4} colorPalette="blue" onClick={() => openModal()}>
                  {t('fixed_assets.add_first_asset')}
                </Button>
              </Card.Body>
            </Card.Root>
          ) : (
            <Card.Root bg="white" _dark={{ bg: 'gray.800' }} overflow="hidden">
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header bg="gray.50" _dark={{ bg: 'gray.700' }}>
                    <Table.Row>
                      <Table.ColumnHeader>{t('fixed_assets.fields.inventory_number')}</Table.ColumnHeader>
                      <Table.ColumnHeader>{t('fixed_assets.fields.name')}</Table.ColumnHeader>
                      <Table.ColumnHeader>{t('fixed_assets.fields.category')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('fixed_assets.fields.acquisition_cost')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('fixed_assets.fields.book_value')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('fixed_assets.fields.depreciation_rate')}</Table.ColumnHeader>
                      <Table.ColumnHeader>{t('fixed_assets.fields.status')}</Table.ColumnHeader>
                      <Table.ColumnHeader w="60px"></Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {assets.map(asset => (
                      <Table.Row key={asset.id} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}>
                        <Table.Cell fontFamily="mono" fontWeight="medium">{asset.inventory_number}</Table.Cell>
                        <Table.Cell>
                          <Text fontWeight="medium">{asset.name}</Text>
                          {asset.description && (
                            <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>{asset.description}</Text>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {categories.find(c => c.id === asset.category_id)?.name || '-'}
                        </Table.Cell>
                        <Table.Cell textAlign="right">{formatCurrency(asset.acquisition_cost)}</Table.Cell>
                        <Table.Cell textAlign="right">{formatCurrency(asset.accounting_book_value || 0)}</Table.Cell>
                        <Table.Cell textAlign="right">{asset.accounting_depreciation_rate}%</Table.Cell>
                        <Table.Cell>{getStatusBadge(asset.status)}</Table.Cell>
                        <Table.Cell>
                          <Menu.Root>
                            <Menu.Trigger asChild>
                              <IconButton aria-label="Actions" variant="ghost" size="sm">
                                <FiMoreVertical />
                              </IconButton>
                            </Menu.Trigger>
                            <Menu.Positioner>
                              <Menu.Content>
                                <Menu.Item value="edit" onClick={() => openModal(asset)}>
                                  <FiEdit2 /> {t('common.edit')}
                                </Menu.Item>
                                <Menu.Item value="delete" color={{ base: "red.500", _dark: "red.400" }} onClick={() => handleDelete(asset)}>
                                  <FiTrash2 /> {t('common.delete')}
                                </Menu.Item>
                              </Menu.Content>
                            </Menu.Positioner>
                          </Menu.Root>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card.Root>
          )}
        </Tabs.Content>

        {/* Categories Tab */}
        <Tabs.Content value="categories" px={0}>
          <Alert.Root status="info" mb={4}>
            <Alert.Indicator />
            <Box>
              <Text fontWeight="medium">{t('fixed_assets.categories_info_title')}</Text>
              <Text fontSize="sm">{t('fixed_assets.categories_info_description')}</Text>
            </Box>
          </Alert.Root>

          <HStack gap={4} flexWrap="wrap">
            {categories.map(category => (
              <Card.Root key={category.id} bg="white" _dark={{ bg: 'gray.800' }} flex="1" minW="280px">
                <Card.Body>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="bold">{category.name}</Text>
                    <Badge colorPalette="blue">
                      {category.min_depreciation_rate}-{category.max_depreciation_rate}%
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }}>{category.description}</Text>
                </Card.Body>
              </Card.Root>
            ))}
          </HStack>

          {categories.length === 0 && (
            <Card.Root bg="white" _dark={{ bg: 'gray.800' }}>
              <Card.Body py={12} textAlign="center">
                <Text color={{ base: "gray.500", _dark: "gray.400" }}>{t('fixed_assets.no_categories')}</Text>
              </Card.Body>
            </Card.Root>
          )}
        </Tabs.Content>

        {/* Depreciation Calculation Tab */}
        <Tabs.Content value="calculation" px={0}>
          {/* Calculated Periods */}
          {calculatedPeriods.length > 0 && (
            <Card.Root bg="blue.50" _dark={{ bg: 'blue.900' }} mb={6}>
              <Card.Body>
                <Text fontWeight="medium" mb={3}>{t('fixed_assets.calculated_periods')}</Text>
                <Flex wrap="wrap" gap={2}>
                  {calculatedPeriods.map((period, idx) => (
                    <Badge
                      key={idx}
                      colorPalette={period.is_posted ? 'green' : 'yellow'}
                      px={3}
                      py={1}
                      borderRadius="md"
                    >
                      {period.period_display}
                      {period.is_posted && ' ✓'}
                    </Badge>
                  ))}
                </Flex>
                <Text fontSize="sm" color="blue.700" _dark={{ color: 'blue.200' }} mt={2}>
                  {t('fixed_assets.periods_legend')}
                </Text>
              </Card.Body>
            </Card.Root>
          )}

          {/* Period Selection */}
          <Card.Root bg="white" _dark={{ bg: 'gray.800' }} mb={6}>
            <Card.Body>
              <Text fontWeight="medium" mb={4}>{t('fixed_assets.calculate_monthly_depreciation')}</Text>
              <HStack gap={4} flexWrap="wrap">
                <Field.Root maxW="150px">
                  <Field.Label>{t('fixed_assets.year')}</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={calcYear} onChange={(e) => setCalcYear(parseInt(e.target.value))}>
                      {[calcYear - 1, calcYear, calcYear + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root maxW="180px">
                  <Field.Label>{t('fixed_assets.month')}</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={calcMonth} onChange={(e) => setCalcMonth(parseInt(e.target.value))}>
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>{name}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Box pt={8}>
                  <Button colorPalette="blue" onClick={handleCalculate} loading={calculating}>
                    <MdCalculate /> {t('fixed_assets.calculate_depreciation')}
                  </Button>
                </Box>
              </HStack>
              <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }} mt={3}>
                {t('fixed_assets.calculation_info')}
              </Text>
            </Card.Body>
          </Card.Root>

          {/* Calculation Result */}
          {calcResult && (
            <Card.Root bg={calcResult.calculated.length > 0 ? 'green.50' : 'yellow.50'} _dark={{ bg: calcResult.calculated.length > 0 ? 'green.900' : 'yellow.900' }} mb={6}>
              <Card.Body>
                <Text fontWeight="medium" mb={4}>
                  {calcResult.calculated.length > 0 ? t('fixed_assets.calculation_success') : t('fixed_assets.no_assets_to_depreciate')}
                </Text>
                {calcResult.calculated.length > 0 && (
                  <>
                    <HStack gap={4} mb={4} flexWrap="wrap">
                      <Box flex="1" minW="150px">
                        <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>{t('fixed_assets.assets_processed')}</Text>
                        <Text fontSize="2xl" fontWeight="bold">{calcResult.calculated.length}</Text>
                      </Box>
                      <Box flex="1" minW="150px">
                        <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>{t('fixed_assets.accounting_depreciation')}</Text>
                        <Text fontSize="xl" fontWeight="bold">{formatCurrency(calcResult.total_accounting_amount)}</Text>
                      </Box>
                      <Box flex="1" minW="150px">
                        <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>{t('fixed_assets.tax_depreciation')}</Text>
                        <Text fontSize="xl" fontWeight="bold">{formatCurrency(calcResult.total_tax_amount)}</Text>
                      </Box>
                      <Box flex="1" minW="150px">
                        <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>{t('fixed_assets.difference')}</Text>
                        <Text fontSize="xl" fontWeight="bold">
                          {formatCurrency(Math.abs(calcResult.total_tax_amount - calcResult.total_accounting_amount))}
                        </Text>
                      </Box>
                    </HStack>

                    {!postResult && (
                      <Card.Root bg="white" _dark={{ bg: 'gray.800' }} borderWidth="1px" borderColor="green.200">
                        <Card.Body>
                          <Flex justify="space-between" align="center">
                            <Box>
                              <Text fontWeight="medium">{t('fixed_assets.post_title')}</Text>
                              <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }}>
                                {t('fixed_assets.post_description')}
                              </Text>
                            </Box>
                            <Button colorPalette="green" onClick={handlePost} loading={posting}>
                              <FiCheck /> {t('fixed_assets.post_depreciation')}
                            </Button>
                          </Flex>
                        </Card.Body>
                      </Card.Root>
                    )}
                  </>
                )}
              </Card.Body>
            </Card.Root>
          )}

          {/* Post Result */}
          {postResult && (
            <Card.Root bg="blue.50" _dark={{ bg: 'blue.900' }}>
              <Card.Body>
                <Text fontWeight="medium" mb={3}>{t('fixed_assets.post_success')}</Text>
                <HStack gap={4} flexWrap="wrap">
                  <Box flex="1" minW="150px">
                    <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>{t('fixed_assets.journal_entry')}</Text>
                    <Text fontWeight="bold">#{postResult.journal_entry_id}</Text>
                  </Box>
                  <Box flex="1" minW="150px">
                    <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>{t('fixed_assets.total_amount')}</Text>
                    <Text fontWeight="bold">{formatCurrency(postResult.total_amount)}</Text>
                  </Box>
                  <Box flex="1" minW="150px">
                    <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>{t('fixed_assets.assets_count')}</Text>
                    <Text fontWeight="bold">{postResult.assets_count}</Text>
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>
          )}
        </Tabs.Content>

        {/* Depreciation Journal Tab */}
        <Tabs.Content value="journal" px={0}>
          <Card.Root bg="white" _dark={{ bg: 'gray.800' }} mb={4}>
            <Card.Body py={3}>
              <HStack gap={4}>
                <NativeSelect.Root maxW="150px">
                  <NativeSelect.Field value={journalYear} onChange={(e) => setJournalYear(parseInt(e.target.value))}>
                    {[journalYear - 2, journalYear - 1, journalYear, journalYear + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
                <NativeSelect.Root maxW="180px">
                  <NativeSelect.Field
                    value={journalMonth || ''}
                    onChange={(e) => setJournalMonth(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">{t('fixed_assets.all_months')}</option>
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>{name}</option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
                <Button variant="ghost" onClick={loadJournal} loading={journalLoading}>
                  <FiRefreshCw /> {t('common.refresh')}
                </Button>
              </HStack>
            </Card.Body>
          </Card.Root>

          {/* Summary */}
          <HStack gap={4} mb={4} flexWrap="wrap">
            <Stat.Root bg="white" _dark={{ bg: 'gray.800' }} p={3} borderRadius="lg" borderWidth="1px" borderColor="gray.200" flex="1" minW="120px">
              <Stat.Label>{t('fixed_assets.journal.entries')}</Stat.Label>
              <Stat.ValueText>{journalTotals.count}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root bg="white" _dark={{ bg: 'gray.800' }} p={3} borderRadius="lg" borderWidth="1px" borderColor="gray.200" flex="1" minW="120px">
              <Stat.Label>{t('fixed_assets.accounting_depreciation')}</Stat.Label>
              <Stat.ValueText fontSize="lg">{formatCurrency(journalTotals.accountingAmount)}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root bg="white" _dark={{ bg: 'gray.800' }} p={3} borderRadius="lg" borderWidth="1px" borderColor="gray.200" flex="1" minW="120px">
              <Stat.Label>{t('fixed_assets.tax_depreciation')}</Stat.Label>
              <Stat.ValueText fontSize="lg">{formatCurrency(journalTotals.taxAmount)}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root bg="white" _dark={{ bg: 'gray.800' }} p={3} borderRadius="lg" borderWidth="1px" borderColor="gray.200" flex="1" minW="120px">
              <Stat.Label>{t('fixed_assets.journal.posted')}</Stat.Label>
              <Stat.ValueText>{journalTotals.posted} / {journalTotals.count}</Stat.ValueText>
            </Stat.Root>
          </HStack>

          {journalLoading ? (
            <Center py={12}>
              <Spinner size="xl" color={{ base: "blue.500", _dark: "blue.400" }} />
            </Center>
          ) : journalEntries.length === 0 ? (
            <Card.Root bg="white" _dark={{ bg: 'gray.800' }}>
              <Card.Body py={12} textAlign="center">
                <Text color={{ base: "gray.500", _dark: "gray.400" }}>{t('fixed_assets.no_journal_entries')}</Text>
              </Card.Body>
            </Card.Root>
          ) : (
            <Card.Root bg="white" _dark={{ bg: 'gray.800' }} overflow="hidden">
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header bg="gray.50" _dark={{ bg: 'gray.700' }}>
                    <Table.Row>
                      <Table.ColumnHeader>{t('fixed_assets.journal.period')}</Table.ColumnHeader>
                      <Table.ColumnHeader>{t('fixed_assets.journal.asset')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('fixed_assets.journal.accounting_amount')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('fixed_assets.journal.accounting_book_value')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('fixed_assets.journal.tax_amount')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('fixed_assets.journal.tax_book_value')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('fixed_assets.difference')}</Table.ColumnHeader>
                      <Table.ColumnHeader>{t('fixed_assets.fields.status')}</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {journalEntries.map(entry => {
                      const difference = (entry.tax_depreciation_amount || 0) - (entry.accounting_depreciation_amount || 0)
                      return (
                        <Table.Row key={entry.id} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}>
                          <Table.Cell>{new Date(entry.period).toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })}</Table.Cell>
                          <Table.Cell>
                            <Text fontWeight="medium">{entry.fixed_asset_inventory_number}</Text>
                            <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>{entry.fixed_asset_name}</Text>
                          </Table.Cell>
                          <Table.Cell textAlign="right">{formatCurrency(entry.accounting_depreciation_amount)}</Table.Cell>
                          <Table.Cell textAlign="right">
                            <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>{formatCurrency(entry.accounting_book_value_before)}</Text>
                            <Text>{formatCurrency(entry.accounting_book_value_after)}</Text>
                          </Table.Cell>
                          <Table.Cell textAlign="right">{formatCurrency(entry.tax_depreciation_amount)}</Table.Cell>
                          <Table.Cell textAlign="right">
                            <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>{formatCurrency(entry.tax_book_value_before)}</Text>
                            <Text>{formatCurrency(entry.tax_book_value_after)}</Text>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            <Text color={difference > 0 ? 'green.600' : difference < 0 ? 'red.600' : 'gray.500'}>
                              {difference !== 0 ? formatCurrency(Math.abs(difference)) : '-'}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            {entry.is_posted ? (
                              <VStack gap={0} align="start">
                                <Badge colorPalette="green">{t('fixed_assets.journal.posted_status')}</Badge>
                                {entry.journal_entry_id && (
                                  <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>JE #{entry.journal_entry_id}</Text>
                                )}
                              </VStack>
                            ) : (
                              <Badge colorPalette="yellow">{t('fixed_assets.journal.unposted_status')}</Badge>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card.Root>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* Add/Edit Asset Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="800px">
            <Dialog.Header>
              <Dialog.Title>{editingAsset ? t('fixed_assets.edit_asset') : t('fixed_assets.add_new_asset')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <VStack gap={4}>
                <HStack gap={4} w="full">
                  <Field.Root required flex="1">
                    <Field.Label>{t('fixed_assets.fields.name')}</Field.Label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Лаптоп Dell XPS 15"
                    />
                  </Field.Root>
                  <Field.Root required flex="1">
                    <Field.Label>{t('fixed_assets.fields.inventory_number')}</Field.Label>
                    <Input
                      value={formData.inventory_number}
                      onChange={e => setFormData({ ...formData, inventory_number: e.target.value })}
                      placeholder="ДМА-001"
                    />
                  </Field.Root>
                </HStack>

                <Field.Root w="full">
                  <Field.Label>{t('fixed_assets.fields.description')}</Field.Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('fixed_assets.placeholders.description')}
                    rows={2}
                  />
                </Field.Root>

                <HStack gap={4} w="full">
                  <Field.Root flex="1">
                    <Field.Label>{t('fixed_assets.fields.category')}</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      >
                        <option value="">{t('fixed_assets.placeholders.select_category')}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                  <Field.Root flex="1">
                    <Field.Label>{t('fixed_assets.fields.depreciation_method')}</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={formData.depreciation_method}
                        onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value as 'LINEAR' | 'DECLINING_BALANCE' })}
                      >
                        <option value="LINEAR">{t('fixed_assets.methods.linear')}</option>
                        <option value="DECLINING_BALANCE">{t('fixed_assets.methods.declining_balance')}</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                </HStack>

                <HStack gap={4} w="full">
                  <Field.Root required flex="1">
                    <Field.Label>{t('fixed_assets.fields.acquisition_date')}</Field.Label>
                    <Input
                      type="date"
                      value={formData.acquisition_date}
                      onChange={e => setFormData({ ...formData, acquisition_date: e.target.value })}
                    />
                  </Field.Root>
                  <Field.Root required flex="1">
                    <Field.Label>{t('fixed_assets.fields.acquisition_cost')}</Field.Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.acquisition_cost}
                      onChange={e => setFormData({ ...formData, acquisition_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </Field.Root>
                  <Field.Root flex="1">
                    <Field.Label>{t('fixed_assets.fields.residual_value')}</Field.Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.residual_value}
                      onChange={e => setFormData({ ...formData, residual_value: e.target.value })}
                      placeholder="0.00"
                    />
                  </Field.Root>
                </HStack>

                <HStack gap={4} w="full">
                  <Field.Root flex="1">
                    <Field.Label>{t('fixed_assets.fields.accounting_rate')}</Field.Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.accounting_depreciation_rate}
                      onChange={e => setFormData({ ...formData, accounting_depreciation_rate: e.target.value })}
                      placeholder="%"
                    />
                  </Field.Root>
                  <Field.Root flex="1">
                    <Field.Label>{t('fixed_assets.fields.tax_rate')}</Field.Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.tax_depreciation_rate}
                      onChange={e => setFormData({ ...formData, tax_depreciation_rate: e.target.value })}
                      placeholder="%"
                    />
                  </Field.Root>
                </HStack>

                <HStack gap={4} w="full">
                  <Field.Root flex="1">
                    <Field.Label>{t('fixed_assets.fields.document_number')}</Field.Label>
                    <Input
                      value={formData.document_number}
                      onChange={e => setFormData({ ...formData, document_number: e.target.value })}
                      placeholder={t('fixed_assets.placeholders.document_number')}
                    />
                  </Field.Root>
                  <Field.Root flex="1">
                    <Field.Label>{t('fixed_assets.fields.document_date')}</Field.Label>
                    <Input
                      type="date"
                      value={formData.document_date}
                      onChange={e => setFormData({ ...formData, document_date: e.target.value })}
                    />
                  </Field.Root>
                </HStack>

                <HStack gap={4} w="full">
                  <Field.Root flex="1">
                    <Field.Label>{t('fixed_assets.fields.put_into_service_date')}</Field.Label>
                    <Input
                      type="date"
                      value={formData.put_into_service_date}
                      onChange={e => setFormData({ ...formData, put_into_service_date: e.target.value })}
                    />
                  </Field.Root>
                  {editingAsset && (
                    <Field.Root flex="1">
                      <Field.Label>{t('fixed_assets.fields.status')}</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'DEPRECIATED' | 'DISPOSED' | 'SOLD' })}
                        >
                          <option value="ACTIVE">{t('fixed_assets.status.active')}</option>
                          <option value="DEPRECIATED">{t('fixed_assets.status.depreciated')}</option>
                          <option value="DISPOSED">{t('fixed_assets.status.disposed')}</option>
                          <option value="SOLD">{t('fixed_assets.status.sold')}</option>
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Field.Root>
                  )}
                </HStack>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" mr={3} onClick={closeModal}>{t('common.cancel')}</Button>
              <Button
                colorPalette="blue"
                onClick={handleSubmit}
                loading={saving}
                disabled={!formData.name || !formData.inventory_number || !formData.acquisition_cost}
              >
                {editingAsset ? t('common.update') : t('common.create')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default FixedAssetsPage
