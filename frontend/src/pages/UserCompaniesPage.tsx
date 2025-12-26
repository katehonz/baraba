import { useState, useEffect, ChangeEvent } from 'react'
import {
  Box,
  Heading,
  Text,
  Button,
  Table,
  Flex,
  Badge,
  Spinner,
  IconButton,
  Field,
  Checkbox,
  NativeSelect,
  Dialog
} from '@chakra-ui/react'
import { FiPlus, FiTrash2, FiStar } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useTheme, createThemeStyles } from '../contexts/ThemeContext'
import { usersApi, User } from '../api/users'
import { toaster } from '../components/ui/toaster'
import { useCompany } from '../contexts/CompanyContext'

interface UserCompanyItem {
  id: number
  userId: number
  companyId: string
  isDefault: boolean
  username: string
  companyName: string
}

interface DialogOpenChangeEvent {
  open: boolean
}

export default function UserCompaniesPage() {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const styles = createThemeStyles(resolvedTheme)
  const { companies } = useCompany()

  const [userCompanies, setUserCompanies] = useState<UserCompanyItem[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Filter states
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')

  // Form states
  const [formUserId, setFormUserId] = useState<string>('')
  const [formCompanyId, setFormCompanyId] = useState<string>('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [ucData, usersData] = await Promise.all([
        usersApi.getUserCompanies(
          filterUserId ? Number(filterUserId) : undefined,
          filterCompanyId || undefined
        ),
        usersApi.getUsers()
      ])
      setUserCompanies(ucData)
      setUsers(usersData)
    } catch (error: unknown) {
      const err = error as { error?: string }
      toaster.create({
        title: t('userCompanies.loadError'),
        description: err?.error || t('common.error'),
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterUserId, filterCompanyId])

  const handleAdd = async () => {
    if (!formUserId || !formCompanyId) {
      toaster.create({
        title: t('userCompanies.selectBoth'),
        type: 'warning'
      })
      return
    }

    setIsSaving(true)
    try {
      await usersApi.addUserCompany({
        userId: Number(formUserId),
        companyId: formCompanyId,
        isDefault: formIsDefault
      })
      toaster.create({
        title: t('userCompanies.added'),
        type: 'success'
      })
      setIsModalOpen(false)
      resetForm()
      fetchData()
    } catch (error: unknown) {
      const err = error as { error?: string }
      toaster.create({
        title: t('userCompanies.addError'),
        description: err?.error || t('common.error'),
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await usersApi.removeUserCompany(deleteId)
      toaster.create({
        title: t('userCompanies.removed'),
        type: 'success'
      })
      setDeleteId(null)
      fetchData()
    } catch (error: unknown) {
      const err = error as { error?: string }
      toaster.create({
        title: t('userCompanies.removeError'),
        description: err?.error || t('common.error'),
        type: 'error'
      })
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await usersApi.setDefaultCompany(id)
      toaster.create({
        title: t('userCompanies.defaultSet'),
        type: 'success'
      })
      fetchData()
    } catch (error: unknown) {
      const err = error as { error?: string }
      toaster.create({
        title: t('userCompanies.defaultError'),
        description: err?.error || t('common.error'),
        type: 'error'
      })
    }
  }

  const resetForm = () => {
    setFormUserId('')
    setFormCompanyId('')
    setFormIsDefault(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    resetForm()
  }

  const closeDeleteDialog = () => {
    setDeleteId(null)
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" {...styles.textPrimary}>
            {t('userCompanies.title')}
          </Heading>
          <Text {...styles.textSecondary}>
            {t('userCompanies.subtitle')}
          </Text>
        </Box>

        <Button colorPalette="blue" onClick={() => { resetForm(); setIsModalOpen(true) }}>
          <FiPlus style={{ marginRight: '8px' }} />
          {t('userCompanies.add')}
        </Button>
      </Flex>

      {/* Filters */}
      <Box mb={4} p={4} borderRadius="md" {...styles.bgCard}>
        <Flex gap={4} wrap="wrap">
          <Box minW="200px">
            <Field.Root>
              <Field.Label>{t('userCompanies.filterUser')}</Field.Label>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field
                  value={filterUserId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterUserId(e.target.value)}
                >
                  <option value="">{t('userCompanies.allUsers')}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id.toString()}>{u.username}</option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
          </Box>
          <Box minW="200px">
            <Field.Root>
              <Field.Label>{t('userCompanies.filterCompany')}</Field.Label>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field
                  value={filterCompanyId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterCompanyId(e.target.value)}
                >
                  <option value="">{t('userCompanies.allCompanies')}</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
          </Box>
        </Flex>
      </Box>

      {/* Table */}
      {isLoading ? (
        <Flex justify="center" py={10}>
          <Spinner size="xl" />
        </Flex>
      ) : userCompanies.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Text {...styles.textSecondary}>{t('userCompanies.noData')}</Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table.Root variant="outline">
            <Table.Header>
              <Table.Row {...styles.bgCard}>
                <Table.ColumnHeader {...styles.textPrimary}>{t('userCompanies.user')}</Table.ColumnHeader>
                <Table.ColumnHeader {...styles.textPrimary}>{t('userCompanies.company')}</Table.ColumnHeader>
                <Table.ColumnHeader {...styles.textPrimary}>{t('userCompanies.default')}</Table.ColumnHeader>
                <Table.ColumnHeader {...styles.textPrimary} textAlign="right">{t('common.actions')}</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {userCompanies.map((uc) => (
                <Table.Row key={uc.id} {...styles.bgCard}>
                  <Table.Cell {...styles.textPrimary}>{uc.username}</Table.Cell>
                  <Table.Cell {...styles.textPrimary}>{uc.companyName}</Table.Cell>
                  <Table.Cell>
                    {uc.isDefault ? (
                      <Badge colorPalette="green">{t('userCompanies.yes')}</Badge>
                    ) : (
                      <Badge colorPalette="gray">{t('userCompanies.no')}</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Flex justify="flex-end" gap={2}>
                      {!uc.isDefault && (
                        <IconButton
                          aria-label={t('userCompanies.setDefault')}
                          size="sm"
                          variant="ghost"
                          colorPalette="yellow"
                          onClick={() => handleSetDefault(uc.id)}
                        >
                          <FiStar />
                        </IconButton>
                      )}
                      <IconButton
                        aria-label={t('common.delete')}
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => setDeleteId(uc.id)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog.Root open={isModalOpen} onOpenChange={(e: DialogOpenChangeEvent) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t('userCompanies.addNew')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>{t('userCompanies.user')}</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={formUserId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormUserId(e.target.value)}
                    >
                      <option value="">{t('userCompanies.selectUser')}</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id.toString()}>{u.username}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('userCompanies.company')}</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={formCompanyId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormCompanyId(e.target.value)}
                    >
                      <option value="">{t('userCompanies.selectCompany')}</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Checkbox.Root
                  checked={formIsDefault}
                  onCheckedChange={(e) => setFormIsDefault(!!e.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>{t('userCompanies.isDefault')}</Checkbox.Label>
                </Checkbox.Root>
              </Flex>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeModal}>
                {t('common.cancel')}
              </Button>
              <Button colorPalette="blue" onClick={handleAdd} loading={isSaving}>
                {t('common.create')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={deleteId !== null} onOpenChange={(e: DialogOpenChangeEvent) => !e.open && closeDeleteDialog()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t('userCompanies.confirmRemove')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {deleteId && userCompanies.find(uc => uc.id === deleteId) && (
                <Text>
                  {t('userCompanies.confirmRemoveText', {
                    user: userCompanies.find(uc => uc.id === deleteId)?.username,
                    company: userCompanies.find(uc => uc.id === deleteId)?.companyName
                  })}
                </Text>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeDeleteDialog}>
                {t('common.cancel')}
              </Button>
              <Button colorPalette="red" onClick={handleDelete}>
                {t('common.delete')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
