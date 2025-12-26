import { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Button,
  Table,
  Badge,
  Flex,
  IconButton,
  Text,
  Input,
  Spinner,
  Dialog,
  VStack,
  Field,
  NativeSelect,
  Alert
} from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2, FiList } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { BankAccount } from '../types'
import { toaster } from '../components/ui/toaster'

function BankAccountsPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()
  const navigate = useNavigate()
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  
  // Need to load GL accounts to select one for the bank account
  const [glAccounts, setGlAccounts] = useState<{id: string, code: string, name: string}[]>([])

  const [formData, setFormData] = useState({
    name: '',
    iban: '',
    currency: 'EUR',
    import_type: 'manual' as 'manual' | 'saltedge',
    account_id: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadBankAccounts()
      loadGlAccounts()
    }
  }, [selectedCompanyId])

  const loadBankAccounts = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await apiClient.getBankAccounts(selectedCompanyId)
      setBankAccounts(response.data)
    } catch (err) {
      console.error('Failed to load bank accounts:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const loadGlAccounts = async () => {
    if (!selectedCompanyId) return
    try {
      const response = await apiClient.getAccounts(selectedCompanyId)
      // Filter for bank accounts (usually start with 50)
      const banks = response.data.filter(a => a.code.startsWith('50'))
      setGlAccounts(banks)
    } catch (err) {
      console.error('Failed to load GL accounts', err)
    }
  }

  const openModal = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        name: account.name,
        iban: account.iban || '',
        currency: account.currency || 'EUR',
        import_type: account.import_type,
        account_id: account.account_id || ''
      })
    } else {
      setEditingAccount(null)
      setFormData({
        name: '',
        iban: '',
        currency: 'EUR',
        import_type: 'manual',
        account_id: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAccount(null)
  }

  const handleSubmit = async () => {
    if (!selectedCompanyId) return
    setSaving(true)
    try {
      const payload: any = { ...formData }
      if (!payload.account_id) delete payload.account_id
      
      if (editingAccount) {
        await apiClient.updateBankAccount(selectedCompanyId, editingAccount.id, payload)
        toaster.create({ title: t('bankAccountsPage.updated', { defaultValue: 'Bank Account updated' }), type: 'success' })
      } else {
        await apiClient.createBankAccount(selectedCompanyId, payload)
        toaster.create({ title: t('bankAccountsPage.created', { defaultValue: 'Bank Account created' }), type: 'success' })
      }
      await loadBankAccounts()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('bankAccountsPage.saveError', { defaultValue: 'Failed to save bank account' }),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (account: BankAccount) => {
    if (!selectedCompanyId) return
    if (!confirm(t('bankAccountsPage.confirmDelete', { iban: account.iban }))) return

    try {
      await apiClient.deleteBankAccount(selectedCompanyId, account.id)
      toaster.create({ title: t('bankAccountsPage.deleted', { defaultValue: 'Bank Account deleted' }), type: 'success' })
      await loadBankAccounts()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('bankAccountsPage.deleteError', { defaultValue: 'Failed to delete bank account' }),
        type: 'error'
      })
    }
  }

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>{t('common.selectCompanyFirst')}</Alert.Title>
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
          <Heading size="lg">{t('bankAccountsPage.title')}</Heading>
          <Text color="gray.500">{selectedCompany.name}</Text>
        </Box>
        <Button colorScheme="blue" onClick={() => openModal()}>
          <FiPlus /> {t('bankAccountsPage.add')}
        </Button>
      </Flex>

      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t('bankAccountsPage.bankName')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('bankAccountsPage.iban')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('bankAccountsPage.currency')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('bankAccountsPage.importType')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('bankAccountsPage.glAccount')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {bankAccounts.map(account => (
              <Table.Row key={account.id}>
                <Table.Cell fontWeight="medium">{account.name}</Table.Cell>
                <Table.Cell fontFamily="mono">{account.iban}</Table.Cell>
                <Table.Cell>{account.currency}</Table.Cell>
                <Table.Cell>
                  <Badge colorScheme={account.import_type === 'saltedge' ? 'purple' : 'gray'}>
                    {account.import_type === 'saltedge' ? t('bankAccountsPage.saltedgeImport') : t('bankAccountsPage.manualImport')}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {account.account_code ? <Badge variant="outline">{account.account_code}</Badge> : '-'}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <IconButton
                    aria-label={t('common.view')}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={() => navigate(`/bank-accounts/${account.id}/transactions`)}
                    title={t('common.view')}
                  >
                    <FiList />
                  </IconButton>
                  <IconButton
                    aria-label={t('common.edit')}
                    size="sm"
                    variant="ghost"
                    onClick={() => openModal(account)}
                  >
                    <FiEdit2 />
                  </IconButton>
                  <IconButton
                    aria-label={t('common.delete')}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDelete(account)}
                  >
                    <FiTrash2 />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {bankAccounts.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="gray.500">{t('bankAccountsPage.noAccounts')}</Text>
          </Box>
        )}
      </Box>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{editingAccount ? t('bankAccountsPage.edit') : t('bankAccountsPage.new')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Field.Root required>
                  <Field.Label>{t('bankAccountsPage.bankName')}</Field.Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. UniCredit BGN"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('bankAccountsPage.iban')}</Field.Label>
                  <Input
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    placeholder="BG..."
                  />
                </Field.Root>
                
                <Flex gap={4} width="100%">
                    <Field.Root width="50%">
                      <Field.Label>{t('bankAccountsPage.currency')}</Field.Label>
                      <Input
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        placeholder="BGN"
                      />
                    </Field.Root>

                    <Field.Root width="50%">
                      <Field.Label>{t('bankAccountsPage.importType')}</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={formData.import_type}
                          onChange={(e) => setFormData({ ...formData, import_type: e.target.value as 'manual' | 'saltedge' })}
                        >
                          <option value="manual">{t('bankAccountsPage.manualImport')}</option>
                          <option value="saltedge">{t('bankAccountsPage.saltedgeImport')}</option>
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Field.Root>
                </Flex>

                <Field.Root>
                  <Field.Label>{t('bankAccountsPage.glAccount')}</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={formData.account_id}
                      onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                      placeholder={t('common.select')}
                    >
                        <option value="">-- None --</option>
                      {glAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
              <Button colorScheme="blue" onClick={handleSubmit} loading={saving}>
                {editingAccount ? t('common.update') : t('common.create')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default BankAccountsPage