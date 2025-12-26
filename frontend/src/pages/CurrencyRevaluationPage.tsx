import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Table,
  Badge,
  HStack,
  VStack,
  Heading,
  Text,
  Alert,
  NativeSelect,
  Spinner,
  Flex,
  Dialog,
  Tabs,
  Stat,
  Card,
  Field
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { currencyRevaluationsApi } from '../api/currency-revaluations'
import {
  CurrencyRevaluation,
  RevaluationPreview,
  CurrencyRevaluationLine
} from '../types'
import { useCompany } from '../contexts/CompanyContext'
import { toaster } from '../components/ui/toaster'

function CurrencyRevaluationPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()

  const [revaluations, setRevaluations] = useState<CurrencyRevaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [preview, setPreview] = useState<RevaluationPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedRevaluation, setSelectedRevaluation] = useState<CurrencyRevaluation | null>(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      fetchRevaluations()
    }
  }, [selectedCompanyId])

  const fetchRevaluations = async () => {
    if (!selectedCompanyId) return

    try {
      setLoading(true)
      const response = await currencyRevaluationsApi.getCurrencyRevaluations(selectedCompanyId)
      setRevaluations(response.data)
    } catch (error) {
      toaster.create({
        title: t('currencyRevaluation.fetchError'),
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    if (!selectedCompanyId) return

    try {
      setPreviewLoading(true)
      const result = await currencyRevaluationsApi.previewRevaluation(
        selectedCompanyId,
        selectedYear,
        selectedMonth
      )

      if (result.success && result.data) {
        setPreview(result.data)
      } else {
        toaster.create({
          title: t('currencyRevaluation.previewError'),
          description: result.error,
          type: 'error'
        })
      }
    } catch (error) {
      toaster.create({
        title: t('currencyRevaluation.previewError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!selectedCompanyId) return

    try {
      await currencyRevaluationsApi.createRevaluation(
        selectedCompanyId,
        selectedYear,
        selectedMonth
      )

      toaster.create({
        title: t('currencyRevaluation.createSuccess'),
        type: 'success'
      })

      setPreview(null)
      fetchRevaluations()
    } catch (error) {
      toaster.create({
        title: t('currencyRevaluation.createError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    }
  }

  const handlePost = async () => {
    if (!selectedCompanyId || !selectedRevaluation) return

    try {
      const result = await currencyRevaluationsApi.postRevaluation(
        selectedCompanyId,
        selectedRevaluation.id
      )

      if (result.success) {
        toaster.create({
          title: t('currencyRevaluation.postSuccess'),
          type: 'success'
        })
        setIsPostModalOpen(false)
        fetchRevaluations()
      } else {
        toaster.create({
          title: t('currencyRevaluation.postError'),
          description: result.error,
          type: 'error'
        })
      }
    } catch (error) {
      toaster.create({
        title: t('currencyRevaluation.postError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    }
  }

  const handleReverse = async (revaluation: CurrencyRevaluation) => {
    if (!selectedCompanyId) return

    try {
      const result = await currencyRevaluationsApi.reverseRevaluation(
        selectedCompanyId,
        revaluation.id
      )

      if (result.success) {
        toaster.create({
          title: t('currencyRevaluation.reverseSuccess'),
          type: 'success'
        })
        fetchRevaluations()
      } else {
        toaster.create({
          title: t('currencyRevaluation.reverseError'),
          description: result.error,
          type: 'error'
        })
      }
    } catch (error) {
      toaster.create({
        title: t('currencyRevaluation.reverseError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    }
  }

  const handleDelete = async (revaluation: CurrencyRevaluation) => {
    if (!selectedCompanyId) return

    try {
      await currencyRevaluationsApi.deleteRevaluation(selectedCompanyId, revaluation.id)

      toaster.create({
        title: t('currencyRevaluation.deleteSuccess'),
        type: 'success'
      })
      fetchRevaluations()
    } catch (error) {
      toaster.create({
        title: t('currencyRevaluation.deleteError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    }
  }

  const openPostModal = (revaluation: CurrencyRevaluation) => {
    setSelectedRevaluation(revaluation)
    setIsPostModalOpen(true)
  }

  const openDetailModal = async (revaluation: CurrencyRevaluation) => {
    if (!selectedCompanyId) return

    try {
      const response = await currencyRevaluationsApi.getCurrencyRevaluation(
        selectedCompanyId,
        revaluation.id
      )
      setSelectedRevaluation(response.data)
      setIsDetailModalOpen(true)
    } catch (error) {
      toaster.create({
        title: t('currencyRevaluation.fetchError'),
        type: 'error'
      })
    }
  }

  const getMonthName = (month: number) => {
    return new Date(2023, month - 1).toLocaleDateString('bg-BG', { month: 'long' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'yellow'
      case 'POSTED': return 'green'
      case 'REVERSED': return 'red'
      default: return 'gray'
    }
  }

  const formatNumber = (num: number | string) => {
    const n = typeof num === 'string' ? parseFloat(num) : num
    return n.toLocaleString('bg-BG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>{t('common.selectCompanyFirst', 'Please select a company first')}</Alert.Title>
      </Alert.Root>
    )
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" />
      </Flex>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="lg">{t('currencyRevaluation.title')}</Heading>
        <Text color="gray.600" mt={2}>
          {t('currencyRevaluation.description')}
        </Text>
      </Box>

      <Tabs.Root defaultValue="history">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="history">{t('currencyRevaluation.tabs.history')}</Tabs.Trigger>
          <Tabs.Trigger value="calculate">{t('currencyRevaluation.tabs.calculate')}</Tabs.Trigger>
        </Tabs.List>

        {/* History Tab */}
        <Tabs.Content value="history">
          <Box bg={{ base: "white", _dark: "gray.800" }} p={6} rounded="lg" shadow="sm">
            {revaluations.length === 0 ? (
              <Text color="gray.500">{t('currencyRevaluation.noRevaluations')}</Text>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>{t('currencyRevaluation.period')}</Table.ColumnHeader>
                    <Table.ColumnHeader>{t('currencyRevaluation.status')}</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.gains')}</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.losses')}</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.netResult')}</Table.ColumnHeader>
                    <Table.ColumnHeader>{t('common.actions')}</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {revaluations.map((rev) => (
                    <Table.Row key={rev.id}>
                      <Table.Cell>{getMonthName(rev.month)} {rev.year}</Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={getStatusColor(rev.status)}>
                          {t(`currencyRevaluation.status.${rev.status.toLowerCase()}`)}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="right" color="green.600">
                        {formatNumber(rev.total_gains)} EUR
                      </Table.Cell>
                      <Table.Cell textAlign="right" color="red.600">
                        {formatNumber(rev.total_losses)} EUR
                      </Table.Cell>
                      <Table.Cell
                        textAlign="right"
                        color={parseFloat(String(rev.net_result)) >= 0 ? 'green.600' : 'red.600'}
                      >
                        {formatNumber(rev.net_result)} EUR
                      </Table.Cell>
                      <Table.Cell>
                        <HStack gap={2}>
                          <Button size="sm" variant="outline" onClick={() => openDetailModal(rev)}>
                            {t('common.view', 'View')}
                          </Button>
                          {rev.status === 'PENDING' && (
                            <>
                              <Button size="sm" colorPalette="green" onClick={() => openPostModal(rev)}>
                                {t('currencyRevaluation.post')}
                              </Button>
                              <Button size="sm" colorPalette="red" variant="outline" onClick={() => handleDelete(rev)}>
                                {t('common.delete')}
                              </Button>
                            </>
                          )}
                          {rev.status === 'POSTED' && (
                            <Button size="sm" colorPalette="orange" variant="outline" onClick={() => handleReverse(rev)}>
                              {t('currencyRevaluation.reverse')}
                            </Button>
                          )}
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Box>
        </Tabs.Content>

        {/* Calculate Tab */}
        <Tabs.Content value="calculate">
          <VStack gap={6} align="stretch">
            {/* Period Selection */}
            <Card.Root>
              <Card.Header>
                <Heading size="md">{t('currencyRevaluation.selectPeriod')}</Heading>
              </Card.Header>
              <Card.Body>
                <HStack gap={4}>
                  <Field.Root maxW="200px">
                    <Field.Label>{t('currencyRevaluation.year')}</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={selectedYear}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedYear(parseInt(e.target.value))}
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - i
                          return <option key={year} value={year}>{year}</option>
                        })}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root maxW="200px">
                    <Field.Label>{t('currencyRevaluation.month')}</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={selectedMonth}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonth(parseInt(e.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>

                  <Box pt={8}>
                    <Button colorPalette="blue" onClick={handlePreview} loading={previewLoading}>
                      {t('currencyRevaluation.preview')}
                    </Button>
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>

            {/* Preview Results */}
            {preview && (
              <Card.Root>
                <Card.Header>
                  <Heading size="md">
                    {t('currencyRevaluation.previewResults')} - {getMonthName(preview.month)} {preview.year}
                  </Heading>
                </Card.Header>
                <Card.Body>
                  <VStack gap={6} align="stretch">
                    {/* Summary Stats */}
                    <HStack gap={4} flexWrap="wrap">
                      <Stat.Root bg={{ base: "gray.50", _dark: "gray.800" }} p={4} borderRadius="lg" flex="1" minW="150px">
                        <Stat.Label>{t('currencyRevaluation.totalGains')}</Stat.Label>
                        <Stat.ValueText color="green.600">{formatNumber(preview.total_gains)} EUR</Stat.ValueText>
                      </Stat.Root>
                      <Stat.Root bg={{ base: "gray.50", _dark: "gray.800" }} p={4} borderRadius="lg" flex="1" minW="150px">
                        <Stat.Label>{t('currencyRevaluation.totalLosses')}</Stat.Label>
                        <Stat.ValueText color="red.600">{formatNumber(preview.total_losses)} EUR</Stat.ValueText>
                      </Stat.Root>
                      <Stat.Root bg={{ base: "gray.50", _dark: "gray.800" }} p={4} borderRadius="lg" flex="1" minW="150px">
                        <Stat.Label>{t('currencyRevaluation.netResult')}</Stat.Label>
                        <Stat.ValueText color={parseFloat(String(preview.net_result)) >= 0 ? 'green.600' : 'red.600'}>
                          {formatNumber(preview.net_result)} EUR
                        </Stat.ValueText>
                      </Stat.Root>
                    </HStack>

                    {/* Lines Table */}
                    {preview.lines.length > 0 ? (
                      <Table.Root size="sm">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeader>{t('currencyRevaluation.account')}</Table.ColumnHeader>
                            <Table.ColumnHeader>{t('currencyRevaluation.currency')}</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.foreignBalance')}</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.recordedEUR')}</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.rate')}</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.revaluedEUR')}</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.difference')}</Table.ColumnHeader>
                            <Table.ColumnHeader>{t('currencyRevaluation.type')}</Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {preview.lines.map((line: CurrencyRevaluationLine, idx: number) => (
                            <Table.Row key={idx}>
                              <Table.Cell>{line.account_code || line.account_id}</Table.Cell>
                              <Table.Cell>{line.currency_code || line.currency_id}</Table.Cell>
                              <Table.Cell textAlign="right">{formatNumber(line.foreign_net_balance)}</Table.Cell>
                              <Table.Cell textAlign="right">{formatNumber(line.recorded_base_balance)}</Table.Cell>
                              <Table.Cell textAlign="right">{parseFloat(String(line.exchange_rate)).toFixed(6)}</Table.Cell>
                              <Table.Cell textAlign="right">{formatNumber(line.revalued_base_balance)}</Table.Cell>
                              <Table.Cell textAlign="right" color={line.is_gain ? 'green.600' : 'red.600'}>
                                {formatNumber(line.revaluation_difference)}
                              </Table.Cell>
                              <Table.Cell>
                                <Badge colorPalette={line.is_gain ? 'green' : 'red'}>
                                  {line.is_gain ? t('currencyRevaluation.gain') : t('currencyRevaluation.loss')}
                                </Badge>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    ) : (
                      <Alert.Root status="info">
                        <Alert.Indicator />
                        <Alert.Title>{t('currencyRevaluation.noDifferences')}</Alert.Title>
                      </Alert.Root>
                    )}

                    {/* Create Button */}
                    {preview.lines.length > 0 && (
                      <Button colorPalette="green" onClick={handleCreate}>
                        {t('currencyRevaluation.createRevaluation')}
                      </Button>
                    )}
                  </VStack>
                </Card.Body>
              </Card.Root>
            )}
          </VStack>
        </Tabs.Content>
      </Tabs.Root>

      {/* Post Confirmation Modal */}
      <Dialog.Root open={isPostModalOpen} onOpenChange={(e) => !e.open && setIsPostModalOpen(false)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t('currencyRevaluation.confirmPost')}</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              <Text>{t('currencyRevaluation.postWarning')}</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" mr={3} onClick={() => setIsPostModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button colorPalette="green" onClick={handlePost}>
                {t('currencyRevaluation.post')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Detail Modal */}
      <Dialog.Root open={isDetailModalOpen} onOpenChange={(e) => !e.open && setIsDetailModalOpen(false)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="900px">
            <Dialog.Header>
              <Dialog.Title>
                {t('currencyRevaluation.revaluationDetails')}
                {selectedRevaluation && ` - ${getMonthName(selectedRevaluation.month)} ${selectedRevaluation.year}`}
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              {selectedRevaluation?.lines && (
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>{t('currencyRevaluation.account')}</Table.ColumnHeader>
                      <Table.ColumnHeader>{t('currencyRevaluation.currency')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.foreignBalance')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.recordedEUR')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.revaluedEUR')}</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">{t('currencyRevaluation.difference')}</Table.ColumnHeader>
                      <Table.ColumnHeader>{t('currencyRevaluation.type')}</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {selectedRevaluation.lines.map((line) => (
                      <Table.Row key={line.id}>
                        <Table.Cell>{line.account_code} - {line.account_name}</Table.Cell>
                        <Table.Cell>{line.currency_code}</Table.Cell>
                        <Table.Cell textAlign="right">{formatNumber(line.foreign_net_balance)}</Table.Cell>
                        <Table.Cell textAlign="right">{formatNumber(line.recorded_base_balance)}</Table.Cell>
                        <Table.Cell textAlign="right">{formatNumber(line.revalued_base_balance)}</Table.Cell>
                        <Table.Cell textAlign="right" color={line.is_gain ? 'green.600' : 'red.600'}>
                          {formatNumber(line.revaluation_difference)}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={line.is_gain ? 'green' : 'red'}>
                            {line.is_gain ? t('currencyRevaluation.gain') : t('currencyRevaluation.loss')}
                          </Badge>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={() => setIsDetailModalOpen(false)}>
                {t('common.close', 'Close')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  )
}

export default CurrencyRevaluationPage
