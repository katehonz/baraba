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
  Spinner,
  Dialog,
  Alert,
  HStack
} from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { JournalEntry } from '../types'
import { toaster } from '../components/ui/toaster'
import { SmartEntryForm } from '../components/SmartEntryForm'
import { useTranslation } from 'react-i18next'

const DOC_TYPE_COLORS: Record<string, string> = {
  INVOICE: 'blue',
  CREDIT_NOTE: 'orange',
  DEBIT_NOTE: 'purple',
  RECEIPT: 'green',
  PAYMENT: 'red',
  OTHER: 'gray'
}

function JournalEntriesPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [_formData, setFormData] = useState({
    description: '',
    document_number: '',
    document_type: 'INVOICE',
    document_date: new Date().toISOString().split('T')[0],
    currency: 'EUR',
    notes: ''
  })
  const [_saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadEntries()
    }
  }, [selectedCompanyId])

  const loadEntries = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await apiClient.getJournalEntries(selectedCompanyId)
      setEntries(response.data)
    } catch (err) {
      console.error('Failed to load entries:', err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (entry?: JournalEntry) => {
    if (entry) {
      setEditingEntry(entry)
      setFormData({
        description: entry.description || '',
        document_number: entry.document_number || '',
        document_type: entry.document_type,
        document_date: entry.document_date,
        currency: entry.currency,
        notes: entry.notes || ''
      })
    } else {
      setEditingEntry(null)
      setFormData({
        description: '',
        document_number: '',
        document_type: 'INVOICE',
        document_date: new Date().toISOString().split('T')[0],
        currency: 'EUR',
        notes: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingEntry(null)
  }

  const handleSubmit = async (data: any) => {
    if (!selectedCompanyId) return
    setSaving(true)
    try {
      if (editingEntry) {
        // Simple update for now, or unified update if implemented
        await apiClient.updateJournalEntry(selectedCompanyId, editingEntry.id, data)
        toaster.create({ title: t('journalEntriesPage.updated', { defaultValue: 'Entry updated' }), type: 'success' })
      } else {
        await apiClient.createUnifiedTransaction(selectedCompanyId, data)
        toaster.create({ title: t('journalEntriesPage.created', { defaultValue: 'Entry created' }), type: 'success' })
      }
      await loadEntries()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('journalEntriesPage.saveError', { defaultValue: 'Failed to save entry' }),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePost = async (entry: JournalEntry) => {
    if (!selectedCompanyId) return
    try {
      await apiClient.postJournalEntry(selectedCompanyId, entry.id)
      toaster.create({ title: t('journalEntriesPage.postedSuccess', { defaultValue: 'Entry posted' }), type: 'success' })
      await loadEntries()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('journalEntriesPage.postError', { defaultValue: 'Failed to post entry' }),
        type: 'error'
      })
    }
  }

  const handleUnpost = async (entry: JournalEntry) => {
    if (!selectedCompanyId) return
    try {
      await apiClient.unpostJournalEntry(selectedCompanyId, entry.id)
      toaster.create({ title: t('journalEntriesPage.unpostedSuccess', { defaultValue: 'Entry unposted' }), type: 'success' })
      await loadEntries()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('journalEntriesPage.unpostError', { defaultValue: 'Failed to unpost entry' }),
        type: 'error'
      })
    }
  }

  const handleDelete = async (entry: JournalEntry) => {
    if (!selectedCompanyId) return
    if (entry.is_posted) {
      toaster.create({ title: t('journalEntriesPage.cannotDeletePosted'), type: 'warning' })
      return
    }
    if (!confirm(t('journalEntriesPage.confirmDelete', { number: entry.document_number }))) return

    try {
      await apiClient.deleteJournalEntry(selectedCompanyId, entry.id)
      toaster.create({ title: t('journalEntriesPage.deleted', { defaultValue: 'Entry deleted' }), type: 'success' })
      await loadEntries()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('journalEntriesPage.deleteError', { defaultValue: 'Failed to delete entry' }),
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
          <Heading size="lg">{t('journalEntriesPage.title')}</Heading>
          <Text color="#718096">{selectedCompany.name}</Text>
        </Box>
        <Button colorScheme="blue" onClick={() => openModal()}>
          <FiPlus /> {t('journalEntriesPage.new')}
        </Button>
      </Flex>

      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t('journalEntriesPage.entryNumber')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('journalEntriesPage.documentDate')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('journalEntriesPage.type')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('journalEntriesPage.document')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('common.description')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('journalEntriesPage.debit')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('journalEntriesPage.credit')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('common.status')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {entries.map(entry => (
              <Table.Row key={entry.id}>
                <Table.Cell fontWeight="medium">{entry.entry_number || '-'}</Table.Cell>
                <Table.Cell>{entry.document_date}</Table.Cell>
                <Table.Cell>
                  <Badge colorScheme={DOC_TYPE_COLORS[entry.document_type]}>
                    {t(`documentTypes.${entry.document_type}`)}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{entry.document_number || '-'}</Table.Cell>
                <Table.Cell maxW="200px" truncate>{entry.description}</Table.Cell>
                <Table.Cell textAlign="right" fontFamily="mono">
                  {entry.base_total_debit?.toFixed(2) || '0.00'}
                </Table.Cell>
                <Table.Cell textAlign="right" fontFamily="mono">
                  {entry.base_total_credit?.toFixed(2) || '0.00'}
                </Table.Cell>
                <Table.Cell>
                  <Badge colorScheme={entry.is_posted ? 'green' : 'yellow'}>
                    {entry.is_posted ? t('journalEntriesPage.posted') : t('journalEntriesPage.draft')}
                  </Badge>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <HStack gap={1} justify="flex-end">
                    {!entry.is_posted ? (
                      <>
                        <IconButton
                          aria-label={t('journalEntriesPage.post')}
                          size="sm"
                          colorScheme="green"
                          variant="ghost"
                          onClick={() => handlePost(entry)}
                          title={t('journalEntriesPage.post')}
                        >
                          <FiCheck />
                        </IconButton>
                        <IconButton
                          aria-label={t('common.edit')}
                          size="sm"
                          variant="ghost"
                          onClick={() => openModal(entry)}
                          title={t('common.edit')}
                        >
                          <FiEdit2 />
                        </IconButton>
                        <IconButton
                          aria-label={t('common.delete')}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(entry)}
                          title={t('common.delete')}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton
                        aria-label={t('journalEntriesPage.unpost')}
                        size="sm"
                        colorScheme="orange"
                        variant="ghost"
                        onClick={() => handleUnpost(entry)}
                        title={t('journalEntriesPage.unpost')}
                      >
                        <FiX />
                      </IconButton>
                    )}
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {entries.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="#a0aec0">{t('journalEntriesPage.noEntries')}</Text>
          </Box>
        )}
      </Box>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()} size="full">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="1000px">
            <Dialog.Header>
              <Dialog.Title>{editingEntry ? t('journalEntriesPage.edit') : t('journalEntriesPage.smartEntry')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <SmartEntryForm
                companyId={selectedCompanyId!}
                onSave={handleSubmit}
                onCancel={closeModal}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default JournalEntriesPage