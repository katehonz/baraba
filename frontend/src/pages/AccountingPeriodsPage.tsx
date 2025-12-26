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
  Input,
  Textarea,
  NativeSelect,
  Spinner,
  Flex,
  Dialog,
  Field
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { accountingPeriodsApi } from '../api/accounting-periods'
import { AccountingPeriod } from '../types'
import { useCompany } from '../contexts/CompanyContext'
import { toaster } from '../components/ui/toaster'

function AccountingPeriodsPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null)
  const [closeNotes, setCloseNotes] = useState('')
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: null as number | null,
    status: '' as 'OPEN' | 'CLOSED' | ''
  })

  useEffect(() => {
    if (selectedCompanyId) {
      fetchPeriods()
    }
  }, [selectedCompanyId, filters])

  const fetchPeriods = async () => {
    if (!selectedCompanyId) return

    try {
      setLoading(true)
      const filterOptions: any = {}

      if (filters.year) filterOptions.year = filters.year
      if (filters.month) filterOptions.month = filters.month
      if (filters.status) filterOptions.status = filters.status

      const response = await accountingPeriodsApi.getAccountingPeriods(selectedCompanyId, filterOptions)
      setPeriods(response.data)
    } catch (error) {
      toaster.create({
        title: t('accountingPeriodsPage.fetchError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClosePeriod = async () => {
    if (!selectedCompanyId || !selectedPeriod) return

    try {
      const userId = 'current-user-id'

      await accountingPeriodsApi.closeAccountingPeriod(
        selectedCompanyId,
        selectedPeriod.year,
        selectedPeriod.month,
        userId,
        closeNotes
      )

      toaster.create({
        title: t('accountingPeriodsPage.periodClosed'),
        type: 'success'
      })

      setIsCloseModalOpen(false)
      setCloseNotes('')
      setSelectedPeriod(null)
      fetchPeriods()
    } catch (error) {
      toaster.create({
        title: t('accountingPeriodsPage.closeError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    }
  }

  const handleReopenPeriod = async (period: AccountingPeriod) => {
    if (!selectedCompanyId) return

    try {
      await accountingPeriodsApi.reopenAccountingPeriod(
        selectedCompanyId,
        period.year,
        period.month
      )

      toaster.create({
        title: t('accountingPeriodsPage.periodReopened'),
        type: 'success'
      })

      fetchPeriods()
    } catch (error) {
      toaster.create({
        title: t('accountingPeriodsPage.reopenError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    }
  }

  const handleInitializeYear = async () => {
    if (!selectedCompanyId || !filters.year) return

    try {
      setLoading(true)
      await accountingPeriodsApi.initializeYear(selectedCompanyId, filters.year)

      toaster.create({
        title: t('accountingPeriodsPage.yearInitialized'),
        description: t('accountingPeriodsPage.yearInitializedDescription', { year: filters.year }),
        type: 'success'
      })

      fetchPeriods()
    } catch (error) {
      toaster.create({
        title: t('accountingPeriodsPage.initializeError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const openCloseModal = (period: AccountingPeriod) => {
    setSelectedPeriod(period)
    setIsCloseModalOpen(true)
  }

  const getMonthName = (month: number) => {
    return new Date(2023, month - 1).toLocaleDateString('bg-BG', { month: 'long' })
  }

  const getStatusColor = (status: string) => {
    return status === 'OPEN' ? 'green' : 'red'
  }

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>{t('accountingPeriodsPage.noCompany')}</Alert.Title>
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
        <Heading size="lg">{t('accountingPeriodsPage.title')}</Heading>
        <Text color="gray.600" mt={2}>
          {t('accountingPeriodsPage.description')}
        </Text>
      </Box>

      {/* Filters */}
      <Box bg={{ base: "white", _dark: "gray.800" }} p={6} rounded="lg" shadow="sm">
        <Heading size="md" mb={4}>{t('accountingPeriodsPage.filters')}</Heading>
        <HStack gap={4}>
          <Field.Root>
            <Field.Label>{t('accountingPeriodsPage.year')}</Field.Label>
            <Input
              type="number"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              width="120px"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>{t('accountingPeriodsPage.month')}</Field.Label>
            <NativeSelect.Root width="200px">
              <NativeSelect.Field
                value={filters.month || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, month: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">{t('accountingPeriodsPage.allMonths')}</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label>{t('accountingPeriodsPage.status')}</Field.Label>
            <NativeSelect.Root width="150px">
              <NativeSelect.Field
                value={filters.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, status: e.target.value as 'OPEN' | 'CLOSED' | '' })}
              >
                <option value="">{t('accountingPeriodsPage.allStatuses')}</option>
                <option value="OPEN">{t('accountingPeriodsPage.open')}</option>
                <option value="CLOSED">{t('accountingPeriodsPage.closed')}</option>
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>
        </HStack>
      </Box>

      {/* Periods Table */}
      <Box bg={{ base: "white", _dark: "gray.800" }} p={6} rounded="lg" shadow="sm">
        {periods.length === 0 ? (
          <VStack gap={4} py={8}>
            <Text color="gray.600" fontSize="lg">
              {t('accountingPeriodsPage.noPeriodsForYear', { year: filters.year })}
            </Text>
            <Text color="gray.500">
              {t('accountingPeriodsPage.noPeriodsDescription')}
            </Text>
            <Button
              colorPalette="blue"
              onClick={handleInitializeYear}
              loading={loading}
            >
              {t('accountingPeriodsPage.initializeYear')}
            </Button>
          </VStack>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{t('accountingPeriodsPage.year')}</Table.ColumnHeader>
                <Table.ColumnHeader>{t('accountingPeriodsPage.month')}</Table.ColumnHeader>
                <Table.ColumnHeader>{t('accountingPeriodsPage.status')}</Table.ColumnHeader>
                <Table.ColumnHeader>{t('accountingPeriodsPage.closedAt')}</Table.ColumnHeader>
                <Table.ColumnHeader>{t('accountingPeriodsPage.actions')}</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {periods.map((period) => (
                <Table.Row key={`${period.year}-${period.month}`}>
                  <Table.Cell>{period.year}</Table.Cell>
                  <Table.Cell>{getMonthName(period.month)}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={getStatusColor(period.status)}>
                      {t(`accountingPeriods.${period.status.toLowerCase()}`)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{period.closed_at ? new Date(period.closed_at).toLocaleDateString() : '-'}</Table.Cell>
                  <Table.Cell>
                    {period.status === 'OPEN' ? (
                      <Button
                        size="sm"
                        colorPalette="red"
                        onClick={() => openCloseModal(period)}
                      >
                        {t('accountingPeriodsPage.close')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        colorPalette="green"
                        onClick={() => handleReopenPeriod(period)}
                      >
                        {t('accountingPeriodsPage.reopen')}
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>

      {/* Close Period Modal */}
      <Dialog.Root open={isCloseModalOpen} onOpenChange={(e) => !e.open && setIsCloseModalOpen(false)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {t('accountingPeriodsPage.closePeriod')} - {selectedPeriod && `${selectedPeriod.year} ${getMonthName(selectedPeriod.month)}`}
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Text>
                  {t('accountingPeriodsPage.closeWarning')}
                </Text>

                <Field.Root w="100%">
                  <Field.Label>{t('accountingPeriodsPage.notes')}</Field.Label>
                  <Textarea
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder={t('accountingPeriodsPage.notesPlaceholder')}
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" mr={3} onClick={() => setIsCloseModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button colorPalette="red" onClick={handleClosePeriod}>
                {t('accountingPeriodsPage.confirmClose')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  )
}

export default AccountingPeriodsPage
