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
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { Account } from '../types'
import { toaster } from '../components/ui/toaster'

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: 'blue',
  LIABILITY: 'orange',
  EQUITY: 'green',
  REVENUE: 'purple',
  EXPENSE: 'red'
}

function AccountsPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'ASSET' as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
    description: '',
    is_active: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadAccounts()
    }
  }, [selectedCompanyId])

  const loadAccounts = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await apiClient.getAccounts(selectedCompanyId)
      setAccounts(response.data)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        description: account.description || '',
        is_active: account.is_active
      })
    } else {
      setEditingAccount(null)
      setFormData({
        code: '',
        name: '',
        account_type: 'ASSET',
        description: '',
        is_active: true
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
      if (editingAccount) {
        await apiClient.updateAccount(selectedCompanyId, editingAccount.id, formData)
        toaster.create({ title: t('accountsPage.updated', { defaultValue: 'Account updated' }), type: 'success' })
      } else {
        await apiClient.createAccount(selectedCompanyId, formData)
        toaster.create({ title: t('accountsPage.created', { defaultValue: 'Account created' }), type: 'success' })
      }
      await loadAccounts()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('accountsPage.saveError', { defaultValue: 'Failed to save account' }),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (account: Account) => {
    if (!selectedCompanyId) return
    if (account.is_system) {
      toaster.create({ title: t('accountsPage.cannotDeleteSystem'), type: 'warning' })
      return
    }
    if (!confirm(t('accountsPage.confirmDelete', { code: account.code }))) return

    try {
      await apiClient.deleteAccount(selectedCompanyId, account.id)
      toaster.create({ title: t('accountsPage.deleted', { defaultValue: 'Account deleted' }), type: 'success' })
      await loadAccounts()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('accountsPage.deleteError', { defaultValue: 'Failed to delete account' }),
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
          <Heading size="lg">{t('accountsPage.title')}</Heading>
          <Text color="#718096">{selectedCompany.name}</Text>
        </Box>
        <Button colorScheme="blue" onClick={() => openModal()}>
          <FiPlus /> {t('accountsPage.add')}
        </Button>
      </Flex>

      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t('accountsPage.code')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('accountsPage.name')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('accountsPage.type')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('common.status')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('accountsPage.system')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {accounts.map(account => (
              <Table.Row key={account.id}>
                <Table.Cell fontWeight="medium" fontFamily="mono">{account.code}</Table.Cell>
                <Table.Cell>{account.name}</Table.Cell>
                <Table.Cell>
                  <Badge colorScheme={ACCOUNT_TYPE_COLORS[account.account_type]}>
                    {t(`accountTypes.${account.account_type}`)}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge colorScheme={account.is_active ? 'green' : 'red'}>
                    {account.is_active ? t('accountsPage.active') : t('accountsPage.inactive')}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {account.is_system && <Badge colorScheme="blue">{t('accountsPage.system')}</Badge>}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <IconButton
                    aria-label={t('common.edit')}
                    size="sm"
                    variant="ghost"
                    onClick={() => openModal(account)}
                  >
                    <FiEdit2 />
                  </IconButton>
                  {!account.is_system && (
                    <IconButton
                      aria-label={t('common.delete')}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDelete(account)}
                    >
                      <FiTrash2 />
                    </IconButton>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {accounts.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="#a0aec0">{t('accountsPage.noAccounts')}</Text>
          </Box>
        )}
      </Box>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{editingAccount ? t('accountsPage.edit') : t('accountsPage.new')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Field.Root required>
                  <Field.Label>{t('accountsPage.code')}</Field.Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. 501"
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>{t('accountsPage.name')}</Field.Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('accountsPage.name')}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>{t('accountsPage.type')}</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={formData.account_type}
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' })}
                    >
                      {ACCOUNT_TYPES.map(type => (
                        <option key={type} value={type}>{t(`accountTypes.${type}`)}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('common.description')}</Field.Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
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

export default AccountsPage