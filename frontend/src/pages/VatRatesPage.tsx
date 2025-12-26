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
  Checkbox,
  Alert
} from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { VatRate } from '../types'
import { toaster } from '../components/ui/toaster'

function VatRatesPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [vatRates, setVatRates] = useState<VatRate[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<VatRate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    percentage: '',
    vat_code: '',
    description: '',
    effective_from: new Date().toISOString().split('T')[0],
    is_active: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadVatRates()
    }
  }, [selectedCompanyId])

  const loadVatRates = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await apiClient.getVatRates(selectedCompanyId, { active_only: false })
      setVatRates(response.data)
    } catch (err) {
      console.error('Failed to load VAT rates:', err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (rate?: VatRate) => {
    if (rate) {
      setEditingRate(rate)
      setFormData({
        name: rate.name,
        percentage: rate.percentage?.toString() || '',
        vat_code: rate.vat_code || '',
        description: rate.description || '',
        effective_from: rate.effective_from || new Date().toISOString().split('T')[0],
        is_active: rate.is_active
      })
    } else {
      setEditingRate(null)
      setFormData({
        name: '',
        percentage: '',
        vat_code: '',
        description: '',
        effective_from: new Date().toISOString().split('T')[0],
        is_active: true
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRate(null)
  }

  const handleSubmit = async () => {
    if (!selectedCompanyId) return
    setSaving(true)
    try {
      const data = {
        ...formData,
        percentage: parseFloat(formData.percentage) || 0
      }
      if (editingRate) {
        await apiClient.updateVatRate(selectedCompanyId, editingRate.id, data)
        toaster.create({ title: t('vatRates.updated'), type: 'success' })
      } else {
        await apiClient.createVatRate(selectedCompanyId, data)
        toaster.create({ title: t('vatRates.created'), type: 'success' })
      }
      await loadVatRates()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('vatRates.saveFailed'),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (rate: VatRate) => {
    if (!selectedCompanyId) return
    if (!confirm(t('vatRates.confirmDelete', { name: rate.name }))) return

    try {
      await apiClient.deleteVatRate(selectedCompanyId, rate.id)
      toaster.create({ title: t('vatRates.deleted'), type: 'success' })
      await loadVatRates()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('vatRates.deleteFailed'),
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
          <Heading size="lg">{t('vatRates.title')}</Heading>
          <Text color="#718096">{selectedCompany.name}</Text>
        </Box>
        <Button colorScheme="blue" onClick={() => openModal()}>
          <FiPlus /> {t('vatRates.add')}
        </Button>
      </Flex>

      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t('vatRates.code')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('vatRates.name')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('vatRates.rate')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('vatRates.effectiveFrom')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('vatRates.status')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {vatRates.map(rate => (
              <Table.Row key={rate.id}>
                <Table.Cell fontFamily="mono">{rate.vat_code || '-'}</Table.Cell>
                <Table.Cell fontWeight="medium">{rate.name}</Table.Cell>
                <Table.Cell textAlign="right" fontFamily="mono" fontSize="lg" fontWeight="bold" color="#2b6cb0">
                  {rate.percentage}%
                </Table.Cell>
                <Table.Cell>{rate.effective_from}</Table.Cell>
                <Table.Cell>
                  <Badge colorScheme={rate.is_active ? 'green' : 'red'}>
                    {rate.is_active ? t('vatRates.active') : t('vatRates.inactive')}
                  </Badge>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <IconButton
                    aria-label={t('common.edit')}
                    size="sm"
                    variant="ghost"
                    onClick={() => openModal(rate)}
                  >
                    <FiEdit2 />
                  </IconButton>
                  <IconButton
                    aria-label={t('common.delete')}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDelete(rate)}
                  >
                    <FiTrash2 />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {vatRates.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="#a0aec0">{t('vatRates.noRates')}</Text>
          </Box>
        )}
      </Box>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{editingRate ? t('vatRates.edit') : t('vatRates.new')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Field.Root required>
                  <Field.Label>{t('vatRates.name')}</Field.Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('vatRates.namePlaceholder')}
                  />
                </Field.Root>

                <Flex gap={4} w="100%">
                  <Field.Root flex={1} required>
                    <Field.Label>{t('vatRates.rate')}</Field.Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.percentage}
                      onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    />
                  </Field.Root>
                  <Field.Root flex={1}>
                    <Field.Label>{t('vatRates.code')}</Field.Label>
                    <Input
                      value={formData.vat_code}
                      onChange={(e) => setFormData({ ...formData, vat_code: e.target.value })}
                      placeholder="20"
                    />
                  </Field.Root>
                </Flex>

                <Field.Root required>
                  <Field.Label>{t('vatRates.effectiveFrom')}</Field.Label>
                  <Input
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('vatRates.description')}</Field.Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Field.Root>

                <Box w="100%">
                  <Checkbox.Root
                    checked={formData.is_active}
                    onCheckedChange={(e) => setFormData({ ...formData, is_active: !!e.checked })}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>{t('vatRates.active')}</Checkbox.Label>
                  </Checkbox.Root>
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
              <Button colorScheme="blue" onClick={handleSubmit} loading={saving}>
                {editingRate ? t('common.update') : t('common.create')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default VatRatesPage
