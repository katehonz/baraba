import { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Button,
  Table,
  Flex,
  IconButton,
  Text,
  Input,
  Spinner,
  Dialog,
  VStack,
  Field,
  NativeSelect,
  Alert,
  HStack,
  Badge
} from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { Account, OpeningBalance } from '../types'
import { toaster } from '../components/ui/toaster'
import { useTranslation } from 'react-i18next'

function OpeningBalancesPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBalance, setEditingBalance] = useState<OpeningBalance | null>(null)
  const [filterDate, setFilterDate] = useState('')
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    debit: 0,
    credit: 0
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadData()
    }
  }, [selectedCompanyId, filterDate])

  const loadData = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const [balancesRes, accountsRes] = await Promise.all([
        apiClient.getOpeningBalances(selectedCompanyId, filterDate || undefined),
        apiClient.getAccounts(selectedCompanyId)
      ])
      setOpeningBalances(balancesRes.data)
      setAccounts(accountsRes.data.filter(a => a.is_active))
    } catch (err) {
      console.error('Failed to load data:', err)
      toaster.create({
        title: t('common.error'),
        description: t('openingBalances.loadError'),
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const openModal = (balance?: OpeningBalance) => {
    if (balance) {
      setEditingBalance(balance)
      setFormData({
        date: balance.date,
        account_id: balance.account_id,
        debit: balance.debit,
        credit: balance.credit
      })
    } else {
      setEditingBalance(null)
      setFormData({
        date: filterDate || new Date().toISOString().split('T')[0],
        account_id: '',
        debit: 0,
        credit: 0
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingBalance(null)
  }

  const handleSubmit = async () => {
    if (!selectedCompanyId) return

    if (!formData.account_id) {
      toaster.create({
        title: t('common.error'),
        description: t('openingBalances.selectAccount'),
        type: 'warning'
      })
      return
    }

    if (formData.debit === 0 && formData.credit === 0) {
      toaster.create({
        title: t('common.error'),
        description: t('openingBalances.enterAmount'),
        type: 'warning'
      })
      return
    }

    setSaving(true)
    try {
      if (editingBalance) {
        await apiClient.updateOpeningBalance(selectedCompanyId, editingBalance.id, formData)
        toaster.create({ title: t('openingBalances.updated'), type: 'success' })
      } else {
        await apiClient.createOpeningBalance(selectedCompanyId, formData)
        toaster.create({ title: t('openingBalances.created'), type: 'success' })
      }
      await loadData()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('openingBalances.saveError'),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (balance: OpeningBalance) => {
    if (!selectedCompanyId) return
    if (!confirm(t('openingBalances.confirmDelete'))) return

    try {
      await apiClient.deleteOpeningBalance(selectedCompanyId, balance.id)
      toaster.create({ title: t('openingBalances.deleted'), type: 'success' })
      await loadData()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('openingBalances.deleteError'),
        type: 'error'
      })
    }
  }

  const totalDebit = openingBalances.reduce((sum, b) => sum + Number(b.debit), 0)
  const totalCredit = openingBalances.reduce((sum, b) => sum + Number(b.credit), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>{t('common.selectCompany')}</Alert.Title>
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
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg">{t('openingBalances.title')}</Heading>
          <Text color="#718096">{selectedCompany.name}</Text>
        </Box>
        <HStack gap={4}>
          <HStack>
            <FiCalendar />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              placeholder={t('openingBalances.filterByDate')}
              width="180px"
            />
          </HStack>
          <Button colorScheme="blue" onClick={() => openModal()}>
            <FiPlus /> {t('openingBalances.add')}
          </Button>
        </HStack>
      </Flex>

      {/* Summary */}
      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" p={4} mb={4}>
        <HStack justify="space-between">
          <HStack gap={8}>
            <Box>
              <Text fontSize="sm" color="#718096">{t('openingBalances.totalDebit')}</Text>
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                {totalDebit.toLocaleString('bg-BG', { minimumFractionDigits: 2 })}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="#718096">{t('openingBalances.totalCredit')}</Text>
              <Text fontSize="xl" fontWeight="bold" color="green.600">
                {totalCredit.toLocaleString('bg-BG', { minimumFractionDigits: 2 })}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="#718096">{t('openingBalances.difference')}</Text>
              <Text fontSize="xl" fontWeight="bold" color={isBalanced ? 'green.600' : 'red.600'}>
                {Math.abs(totalDebit - totalCredit).toLocaleString('bg-BG', { minimumFractionDigits: 2 })}
              </Text>
            </Box>
          </HStack>
          <Badge colorScheme={isBalanced ? 'green' : 'red'} fontSize="md" p={2}>
            {isBalanced ? t('openingBalances.balanced') : t('openingBalances.notBalanced')}
          </Badge>
        </HStack>
      </Box>

      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t('openingBalances.date')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('openingBalances.accountCode')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('openingBalances.accountName')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('openingBalances.debit')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('openingBalances.credit')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {openingBalances.map(balance => {
              const account = accounts.find(a => a.id === balance.account_id)
              return (
                <Table.Row key={balance.id}>
                  <Table.Cell>{balance.date}</Table.Cell>
                  <Table.Cell fontWeight="medium" fontFamily="mono">
                    {account?.code || '-'}
                  </Table.Cell>
                  <Table.Cell>{account?.name || '-'}</Table.Cell>
                  <Table.Cell textAlign="right" color={Number(balance.debit) > 0 ? 'blue.600' : undefined}>
                    {Number(balance.debit) > 0 ? Number(balance.debit).toLocaleString('bg-BG', { minimumFractionDigits: 2 }) : '-'}
                  </Table.Cell>
                  <Table.Cell textAlign="right" color={Number(balance.credit) > 0 ? 'green.600' : undefined}>
                    {Number(balance.credit) > 0 ? Number(balance.credit).toLocaleString('bg-BG', { minimumFractionDigits: 2 }) : '-'}
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <IconButton
                      aria-label="Edit"
                      size="sm"
                      variant="ghost"
                      onClick={() => openModal(balance)}
                    >
                      <FiEdit2 />
                    </IconButton>
                    <IconButton
                      aria-label="Delete"
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDelete(balance)}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>

        {openingBalances.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="#a0aec0">{t('openingBalances.noData')}</Text>
          </Box>
        )}
      </Box>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {editingBalance ? t('openingBalances.edit') : t('openingBalances.new')}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Field.Root required>
                  <Field.Label>{t('openingBalances.date')}</Field.Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>{t('openingBalances.account')}</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={formData.account_id}
                      onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    >
                      <option value="">{t('openingBalances.selectAccount')}</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('openingBalances.debit')}</Field.Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.debit}
                    onChange={(e) => setFormData({
                      ...formData,
                      debit: parseFloat(e.target.value) || 0,
                      credit: parseFloat(e.target.value) > 0 ? 0 : formData.credit
                    })}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('openingBalances.credit')}</Field.Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit}
                    onChange={(e) => setFormData({
                      ...formData,
                      credit: parseFloat(e.target.value) || 0,
                      debit: parseFloat(e.target.value) > 0 ? 0 : formData.debit
                    })}
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
              <Button colorScheme="blue" onClick={handleSubmit} loading={saving}>
                {editingBalance ? t('common.update') : t('common.create')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default OpeningBalancesPage
