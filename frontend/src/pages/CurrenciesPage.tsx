import { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Table,
  Badge,
  Flex,
  Text,
  Spinner,
  Button,
  IconButton,
  Input,
  Dialog,
  Portal,
  Field,
  HStack,
  VStack,
  Tabs,
  NativeSelect
} from '@chakra-ui/react'
import { Checkbox } from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiRefreshCw } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../api/client'
import { Currency, ExchangeRate } from '../types'
import { toaster } from '../components/ui/toaster'

function CurrenciesPage() {
  const { t } = useTranslation()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [fetchingRates, setFetchingRates] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
  const [saving, setSaving] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_bg: '',
    symbol: '',
    decimal_places: 2,
    is_active: true,
    is_base_currency: false
  })

  // Fetch rates form
  const [fetchDate, setFetchDate] = useState('')
  const [fetchYear, setFetchYear] = useState(new Date().getFullYear())
  const [fetchMonth, setFetchMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    loadCurrencies()
    loadExchangeRates()
  }, [])

  const loadCurrencies = async () => {
    try {
      const response = await apiClient.getCurrencies()
      setCurrencies(response.data)
    } catch (err) {
      console.error('Failed to load currencies:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadExchangeRates = async () => {
    setRatesLoading(true)
    try {
      const response = await apiClient.getExchangeRates({ limit: 50 })
      setExchangeRates(response.data)
    } catch (err) {
      console.error('Failed to load exchange rates:', err)
    } finally {
      setRatesLoading(false)
    }
  }

  const openModal = (currency?: Currency) => {
    if (currency) {
      setEditingCurrency(currency)
      setFormData({
        code: currency.code,
        name: currency.name,
        name_bg: currency.name_bg || '',
        symbol: currency.symbol || '',
        decimal_places: currency.decimal_places,
        is_active: currency.is_active,
        is_base_currency: currency.is_base_currency
      })
    } else {
      setEditingCurrency(null)
      setFormData({
        code: '',
        name: '',
        name_bg: '',
        symbol: '',
        decimal_places: 2,
        is_active: true,
        is_base_currency: false
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCurrency(null)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (editingCurrency) {
        await apiClient.updateCurrency(editingCurrency.id, formData)
        toaster.create({ title: t('currencies.updated'), type: 'success' })
      } else {
        await apiClient.createCurrency(formData)
        toaster.create({ title: t('currencies.created'), type: 'success' })
      }
      closeModal()
      loadCurrencies()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('currencies.saveFailed'),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (currency: Currency) => {
    if (!confirm(t('currencies.confirmDelete', { code: currency.code }))) return

    try {
      await apiClient.deleteCurrency(currency.id)
      toaster.create({ title: t('currencies.deleted'), type: 'success' })
      loadCurrencies()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('currencies.deleteFailed'),
        type: 'error'
      })
    }
  }

  const handleToggleActive = async (currency: Currency) => {
    try {
      await apiClient.toggleCurrencyActive(currency.id)
      loadCurrencies()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('currencies.toggleFailed'),
        type: 'error'
      })
    }
  }

  const handleFetchLatest = async () => {
    setFetchingRates(true)
    try {
      const result = await apiClient.fetchLatestRates()
      if (result.success) {
        toaster.create({
          title: t('exchangeRates.fetchSuccess'),
          description: result.message,
          type: 'success'
        })
        loadExchangeRates()
        loadCurrencies()
      } else {
        toaster.create({
          title: t('common.error'),
          description: result.error,
          type: 'error'
        })
      }
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('exchangeRates.fetchFailed'),
        type: 'error'
      })
    } finally {
      setFetchingRates(false)
    }
  }

  const handleFetchDate = async () => {
    if (!fetchDate) return
    setFetchingRates(true)
    try {
      const result = await apiClient.fetchRatesForDate(fetchDate)
      if (result.success) {
        toaster.create({
          title: t('exchangeRates.fetchSuccess'),
          description: result.message,
          type: 'success'
        })
        loadExchangeRates()
      } else {
        toaster.create({
          title: t('common.error'),
          description: result.error,
          type: 'error'
        })
      }
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('exchangeRates.fetchFailed'),
        type: 'error'
      })
    } finally {
      setFetchingRates(false)
    }
  }

  const handleFetchMonth = async () => {
    setFetchingRates(true)
    try {
      const result = await apiClient.fetchRatesForMonth(fetchYear, fetchMonth)
      if (result.success) {
        toaster.create({
          title: t('exchangeRates.fetchSuccess'),
          description: result.message,
          type: 'success'
        })
        loadExchangeRates()
      } else {
        toaster.create({
          title: t('common.error'),
          description: result.error,
          type: 'error'
        })
      }
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('exchangeRates.fetchFailed'),
        type: 'error'
      })
    } finally {
      setFetchingRates(false)
    }
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" />
      </Flex>
    )
  }

  const months = [
    { value: 1, label: t('months.january') },
    { value: 2, label: t('months.february') },
    { value: 3, label: t('months.march') },
    { value: 4, label: t('months.april') },
    { value: 5, label: t('months.may') },
    { value: 6, label: t('months.june') },
    { value: 7, label: t('months.july') },
    { value: 8, label: t('months.august') },
    { value: 9, label: t('months.september') },
    { value: 10, label: t('months.october') },
    { value: 11, label: t('months.november') },
    { value: 12, label: t('months.december') }
  ]

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">{t('currencies.title')}</Heading>
        <Button colorScheme="blue" onClick={() => openModal()}>
          <FiPlus />
          <Text ml={2}>{t('currencies.add')}</Text>
        </Button>
      </Flex>

      <Tabs.Root defaultValue="currencies">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="currencies">{t('currencies.title')}</Tabs.Trigger>
          <Tabs.Trigger value="rates">{t('exchangeRates.title')}</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="currencies">
          <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>{t('currencies.code')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('currencies.name')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('currencies.symbol')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('currencies.decimals')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('currencies.status')}</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {currencies.map(currency => (
                  <Table.Row key={currency.id}>
                    <Table.Cell fontWeight="bold" fontFamily="mono">{currency.code}</Table.Cell>
                    <Table.Cell>
                      {currency.name}
                      {currency.name_bg && <Text fontSize="sm" color="#a0aec0">{currency.name_bg}</Text>}
                    </Table.Cell>
                    <Table.Cell fontSize="lg">{currency.symbol}</Table.Cell>
                    <Table.Cell>{currency.decimal_places}</Table.Cell>
                    <Table.Cell>
                      {currency.is_base_currency ? (
                        <Badge colorPalette="blue">{t('currencies.baseCurrency')}</Badge>
                      ) : currency.is_active ? (
                        <Badge colorPalette="green" cursor="pointer" onClick={() => handleToggleActive(currency)}>
                          {t('currencies.active')}
                        </Badge>
                      ) : (
                        <Badge colorPalette="gray" cursor="pointer" onClick={() => handleToggleActive(currency)}>
                          {t('currencies.inactive')}
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <IconButton
                        aria-label={t('common.edit')}
                        size="sm"
                        variant="ghost"
                        onClick={() => openModal(currency)}
                      >
                        <FiEdit2 />
                      </IconButton>
                      {!currency.is_base_currency && (
                        <IconButton
                          aria-label={t('common.delete')}
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleDelete(currency)}
                        >
                          <FiTrash2 />
                        </IconButton>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>

            {currencies.length === 0 && (
              <Box p={8} textAlign="center">
                <Text color="#a0aec0">{t('currencies.noCurrencies')}</Text>
              </Box>
            )}
          </Box>
        </Tabs.Content>

        <Tabs.Content value="rates">
          <VStack gap={4} align="stretch">
            {/* Fetch controls */}
            <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" p={4}>
              <Heading size="sm" mb={4}>{t('exchangeRates.fetchFromECB')}</Heading>
              <Flex gap={4} wrap="wrap">
                <Button
                  colorScheme="blue"
                  onClick={handleFetchLatest}
                  disabled={fetchingRates}
                >
                  {fetchingRates ? <Spinner size="sm" /> : <FiDownload />}
                  <Text ml={2}>{t('exchangeRates.fetchLatest')}</Text>
                </Button>

                <HStack>
                  <Input
                    type="date"
                    value={fetchDate}
                    onChange={(e) => setFetchDate(e.target.value)}
                    w="180px"
                  />
                  <Button
                    onClick={handleFetchDate}
                    disabled={fetchingRates || !fetchDate}
                  >
                    {t('exchangeRates.fetchForDate')}
                  </Button>
                </HStack>

                <HStack>
                  <NativeSelect.Root w="100px">
                    <NativeSelect.Field
                      value={fetchMonth}
                      onChange={(e) => setFetchMonth(parseInt(e.target.value))}
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                  <NativeSelect.Root w="100px">
                    <NativeSelect.Field
                      value={fetchYear}
                      onChange={(e) => setFetchYear(parseInt(e.target.value))}
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                  <Button
                    onClick={handleFetchMonth}
                    disabled={fetchingRates}
                  >
                    {t('exchangeRates.fetchForMonth')}
                  </Button>
                </HStack>
              </Flex>
            </Box>

            {/* Rates table */}
            <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
              <Flex justify="space-between" align="center" p={4} borderBottomWidth="1px">
                <Heading size="sm">{t('exchangeRates.latestRates')}</Heading>
                <IconButton
                  aria-label={t('common.refresh')}
                  size="sm"
                  variant="ghost"
                  onClick={loadExchangeRates}
                  disabled={ratesLoading}
                >
                  {ratesLoading ? <Spinner size="sm" /> : <FiRefreshCw />}
                </IconButton>
              </Flex>

              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>{t('exchangeRates.date')}</Table.ColumnHeader>
                    <Table.ColumnHeader>{t('exchangeRates.from')}</Table.ColumnHeader>
                    <Table.ColumnHeader>{t('exchangeRates.to')}</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">{t('exchangeRates.rate')}</Table.ColumnHeader>
                    <Table.ColumnHeader>{t('exchangeRates.source')}</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {exchangeRates.map(rate => (
                    <Table.Row key={rate.id}>
                      <Table.Cell>{rate.valid_date}</Table.Cell>
                      <Table.Cell fontFamily="mono">{rate.from_currency?.code}</Table.Cell>
                      <Table.Cell fontFamily="mono">{rate.to_currency?.code}</Table.Cell>
                      <Table.Cell textAlign="right" fontFamily="mono">
                        {typeof rate.rate === 'number' ? rate.rate.toFixed(6) : rate.rate}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={rate.rate_source === 'ECB' ? 'blue' : 'gray'}>
                          {rate.rate_source}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              {exchangeRates.length === 0 && (
                <Box p={8} textAlign="center">
                  <Text color="#a0aec0">{t('exchangeRates.noRates')}</Text>
                </Box>
              )}
            </Box>
          </VStack>
        </Tabs.Content>
      </Tabs.Root>

      {/* Currency Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>
                  {editingCurrency ? t('currencies.edit') : t('currencies.add')}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4}>
                  <Field.Root required>
                    <Field.Label>{t('currencies.code')}</Field.Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      maxLength={3}
                      placeholder="EUR"
                      disabled={!!editingCurrency}
                    />
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label>{t('currencies.name')}</Field.Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Euro"
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>{t('currencies.nameBg')}</Field.Label>
                    <Input
                      value={formData.name_bg}
                      onChange={(e) => setFormData({ ...formData, name_bg: e.target.value })}
                      placeholder="Евро"
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>{t('currencies.symbol')}</Field.Label>
                    <Input
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      maxLength={3}
                      placeholder="€"
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>{t('currencies.decimals')}</Field.Label>
                    <Input
                      type="number"
                      value={formData.decimal_places}
                      onChange={(e) => setFormData({ ...formData, decimal_places: parseInt(e.target.value) || 2 })}
                      min={0}
                      max={6}
                    />
                  </Field.Root>

                  <Checkbox.Root
                    checked={formData.is_active}
                    onCheckedChange={(e) => setFormData({ ...formData, is_active: !!e.checked })}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>{t('currencies.active')}</Checkbox.Label>
                  </Checkbox.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleSubmit}
                  disabled={saving || !formData.code || !formData.name}
                >
                  {saving ? <Spinner size="sm" /> : (editingCurrency ? t('common.save') : t('common.create'))}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}

export default CurrenciesPage
