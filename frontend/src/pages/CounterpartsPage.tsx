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
  Alert,
  HStack
} from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2, FiBarChart2, FiCheck } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { viesApi } from '../api/vies'
import { Counterpart } from '../types'
import { toaster } from '../components/ui/toaster'
import { useTranslation } from 'react-i18next'

function CounterpartsPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [counterparts, setCounterparts] = useState<Counterpart[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCounterpart, setEditingCounterpart] = useState<Counterpart | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    eik: '',
    vat_number: '',
    address: '',
    long_address: '',
    city: '',
    country: 'BG',
    email: '',
    phone: '',
    is_customer: false,
    is_supplier: false,
    is_employee: false,
    is_vat_registered: false
  })
  const [saving, setSaving] = useState(false)
  const [validatingVies, setValidatingVies] = useState(false)
  
  // Turnover Report State
  const [turnoverModalOpen, setTurnoverModalOpen] = useState(false)
  const [turnoverData, setTurnoverData] = useState<any[]>([])
  const [loadingTurnover, setLoadingTurnover] = useState(false)
  const [turnoverPeriod, setTurnoverPeriod] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (selectedCompanyId) {
      loadCounterparts()
    }
  }, [selectedCompanyId])

  const loadCounterparts = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await apiClient.getCounterparts(selectedCompanyId)
      setCounterparts(response.data)
    } catch (err) {
      console.error('Failed to load counterparts:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTurnover = async () => {
    if (!selectedCompanyId) return
    setLoadingTurnover(true)
    try {
      const response = await apiClient.getCounterpartTurnover(
        selectedCompanyId,
        turnoverPeriod.startDate,
        turnoverPeriod.endDate
      )
      setTurnoverData(response.data)
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || 'Failed to fetch turnover',
        type: 'error'
      })
    } finally {
      setLoadingTurnover(false)
    }
  }

  const openModal = (counterpart?: Counterpart) => {
    if (counterpart) {
      setEditingCounterpart(counterpart)
      setFormData({
        name: counterpart.name,
        eik: counterpart.eik || '',
        vat_number: counterpart.vat_number || '',
        address: counterpart.address || '',
        long_address: counterpart.long_address || '',
        city: counterpart.city || '',
        country: counterpart.country || 'BG',
        email: counterpart.email || '',
        phone: counterpart.phone || '',
        is_customer: counterpart.is_customer,
        is_supplier: counterpart.is_supplier,
        is_employee: counterpart.is_employee,
        is_vat_registered: counterpart.is_vat_registered
      })
    } else {
      setEditingCounterpart(null)
      setFormData({
        name: '',
        eik: '',
        vat_number: '',
        address: '',
        long_address: '',
        city: '',
        country: 'BG',
        email: '',
        phone: '',
        is_customer: true,
        is_supplier: false,
        is_employee: false,
        is_vat_registered: false
      })
    }
    setIsModalOpen(true)
  }

  const handleViesValidation = async () => {
    const vatNumber = formData.vat_number.trim()
    if (!vatNumber) {
      toaster.create({ title: 'Enter VAT number first', type: 'warning' })
      return
    }

    // Ensure VAT number has country prefix
    let fullVatNumber = vatNumber
    if (!vatNumber.match(/^[A-Z]{2}/)) {
      fullVatNumber = 'BG' + vatNumber
    }

    setValidatingVies(true)
    try {
      const result = await viesApi.validateVat(fullVatNumber)

      if (result.valid) {
        // Extract EIK from VAT number (remove BG prefix for Bulgarian companies)
        let eik = formData.eik
        if (fullVatNumber.startsWith('BG')) {
          eik = fullVatNumber.substring(2)
        }

        setFormData({
          ...formData,
          name: result.name || formData.name,
          eik: eik,
          vat_number: fullVatNumber,
          long_address: result.longAddress || '',
          is_vat_registered: true
        })

        toaster.create({
          title: 'VIES Validation Successful',
          description: `${result.name}`,
          type: 'success'
        })
      } else {
        toaster.create({
          title: 'VAT number not valid in VIES',
          type: 'warning'
        })
      }
    } catch (err: any) {
      toaster.create({
        title: 'VIES Validation Failed',
        description: err.message || 'Could not validate VAT number',
        type: 'error'
      })
    } finally {
      setValidatingVies(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCounterpart(null)
  }

  const handleSubmit = async () => {
    if (!selectedCompanyId) return
    if (!formData.is_customer && !formData.is_supplier && !formData.is_employee) {
      toaster.create({ title: t('counterpartsPage.selectType'), type: 'warning' })
      return
    }
    setSaving(true)
    try {
      if (editingCounterpart) {
        await apiClient.updateCounterpart(selectedCompanyId, editingCounterpart.id, formData)
        toaster.create({ title: t('counterpartsPage.updated', { defaultValue: 'Counterpart updated' }), type: 'success' })
      } else {
        await apiClient.createCounterpart(selectedCompanyId, formData)
        toaster.create({ title: t('counterpartsPage.created', { defaultValue: 'Counterpart created' }), type: 'success' })
      }
      await loadCounterparts()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('counterpartsPage.saveError', { defaultValue: 'Failed to save counterpart' }),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (counterpart: Counterpart) => {
    if (!selectedCompanyId) return
    if (!confirm(t('counterpartsPage.confirmDelete', { name: counterpart.name }))) return

    try {
      await apiClient.deleteCounterpart(selectedCompanyId, counterpart.id)
      toaster.create({ title: t('counterpartsPage.deleted', { defaultValue: 'Counterpart deleted' }), type: 'success' })
      await loadCounterparts()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('counterpartsPage.deleteError', { defaultValue: 'Failed to delete counterpart' }),
        type: 'error'
      })
    }
  }

  const filteredCounterparts = counterparts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.eik && c.eik.includes(searchTerm)) ||
    (c.vat_number && c.vat_number.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
          <Heading size="lg">{t('counterpartsPage.title')}</Heading>
          <Text color="#718096">{selectedCompany.name}</Text>
        </Box>
        <Flex gap={2}>
          <Button variant="outline" onClick={() => setTurnoverModalOpen(true)}>
            <FiBarChart2 /> {t('counterpartsPage.turnover')}
          </Button>
          <Button colorScheme="blue" onClick={() => openModal()}>
            <FiPlus /> {t('counterpartsPage.add')}
          </Button>
        </Flex>
      </Flex>

      <Box mb={4}>
        <Flex maxW="400px">
          <Input
            placeholder={t('counterpartsPage.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Flex>
      </Box>

      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t('counterpartsPage.name')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('companiesPage.eik')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('companiesPage.vatNumber')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('common.city')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('counterpartsPage.type')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('companiesPage.vatRegistered')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredCounterparts.map(cp => (
              <Table.Row key={cp.id}>
                <Table.Cell fontWeight="medium">{cp.name}</Table.Cell>
                <Table.Cell fontFamily="mono">{cp.eik || '-'}</Table.Cell>
                <Table.Cell fontFamily="mono">{cp.vat_number || '-'}</Table.Cell>
                <Table.Cell>{cp.city || '-'}</Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    {cp.is_customer && <Badge colorScheme="blue" size="sm">{t('counterpartsPage.customer')}</Badge>}
                    {cp.is_supplier && <Badge colorScheme="green" size="sm">{t('counterpartsPage.supplier')}</Badge>}
                    {cp.is_employee && <Badge colorScheme="purple" size="sm">{t('counterpartsPage.employee')}</Badge>}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  {cp.is_vat_registered && <Badge colorScheme="green">{t('companiesPage.vatRegistered')}</Badge>}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <IconButton
                    aria-label={t('common.edit')}
                    size="sm"
                    variant="ghost"
                    onClick={() => openModal(cp)}
                  >
                    <FiEdit2 />
                  </IconButton>
                  <IconButton
                    aria-label={t('common.delete')}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDelete(cp)}
                  >
                    <FiTrash2 />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {filteredCounterparts.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="#a0aec0">
              {searchTerm ? t('counterpartsPage.noMatch') : t('counterpartsPage.noCounterparts')}
            </Text>
          </Box>
        )}
      </Box>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="600px">
            <Dialog.Header>
              <Dialog.Title>{editingCounterpart ? t('counterpartsPage.edit') : t('counterpartsPage.new')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Field.Root required>
                  <Field.Label>{t('counterpartsPage.name')}</Field.Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Field.Root>

                <Flex gap={4} w="100%">
                  <Field.Root flex={1}>
                    <Field.Label>{t('companiesPage.eik')}</Field.Label>
                    <Input
                      value={formData.eik}
                      onChange={(e) => setFormData({ ...formData, eik: e.target.value })}
                      maxLength={13}
                    />
                  </Field.Root>
                  <Field.Root flex={1}>
                    <Field.Label>{t('companiesPage.vatNumber')}</Field.Label>
                    <Flex gap={2}>
                      <Input
                        value={formData.vat_number}
                        onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                        placeholder="BG123456789"
                      />
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={handleViesValidation}
                        loading={validatingVies}
                        title={t('counterpartsPage.validateVies')}
                      >
                        <FiCheck /> VIES
                      </Button>
                    </Flex>
                  </Field.Root>
                </Flex>

                <Field.Root>
                  <Field.Label>{t('counterpartsPage.address')}</Field.Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </Field.Root>

                {formData.long_address && (
                  <Field.Root>
                    <Field.Label>{t('counterpartsPage.viesAddress')}</Field.Label>
                    <Input
                      value={formData.long_address}
                      onChange={(e) => setFormData({ ...formData, long_address: e.target.value })}
                      bg={{ base: "gray.50", _dark: "gray.700" }}
                    />
                  </Field.Root>
                )}

                <Flex gap={4} w="100%">
                  <Field.Root flex={1}>
                    <Field.Label>{t('common.city')}</Field.Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </Field.Root>
                  <Field.Root flex={1}>
                    <Field.Label>{t('common.country')}</Field.Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </Field.Root>
                </Flex>

                <Flex gap={4} w="100%">
                  <Field.Root flex={1}>
                    <Field.Label>{t('common.email')}</Field.Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </Field.Root>
                  <Field.Root flex={1}>
                    <Field.Label>{t('common.phone')}</Field.Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </Field.Root>
                </Flex>

                <Box w="100%">
                  <Text fontWeight="medium" mb={2}>{t('counterpartsPage.selectType')}</Text>
                  <HStack gap={4}>
                    <Checkbox.Root
                      checked={formData.is_customer}
                      onCheckedChange={(e) => setFormData({ ...formData, is_customer: !!e.checked })}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>{t('counterpartsPage.customer')}</Checkbox.Label>
                    </Checkbox.Root>
                    <Checkbox.Root
                      checked={formData.is_supplier}
                      onCheckedChange={(e) => setFormData({ ...formData, is_supplier: !!e.checked })}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>{t('counterpartsPage.supplier')}</Checkbox.Label>
                    </Checkbox.Root>
                    <Checkbox.Root
                      checked={formData.is_employee}
                      onCheckedChange={(e) => setFormData({ ...formData, is_employee: !!e.checked })}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>{t('counterpartsPage.employee')}</Checkbox.Label>
                    </Checkbox.Root>
                  </HStack>
                </Box>

                <Box w="100%">
                  <Checkbox.Root
                    checked={formData.is_vat_registered}
                    onCheckedChange={(e) => setFormData({ ...formData, is_vat_registered: !!e.checked })}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>{t('companiesPage.vatRegistered')}</Checkbox.Label>
                  </Checkbox.Root>
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
              <Button colorScheme="blue" onClick={handleSubmit} loading={saving}>
                {editingCounterpart ? t('common.update') : t('common.create')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root open={turnoverModalOpen} onOpenChange={(e) => setTurnoverModalOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="900px">
            <Dialog.Header>
              <Dialog.Title>{t('counterpartsPage.turnover')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Flex gap={4} align="flex-end">
                  <Field.Root>
                    <Field.Label>{t('counterpartsPage.startDate')}</Field.Label>
                    <Input
                      type="date"
                      value={turnoverPeriod.startDate}
                      onChange={(e) => setTurnoverPeriod({ ...turnoverPeriod, startDate: e.target.value })}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>{t('counterpartsPage.endDate')}</Field.Label>
                    <Input
                      type="date"
                      value={turnoverPeriod.endDate}
                      onChange={(e) => setTurnoverPeriod({ ...turnoverPeriod, endDate: e.target.value })}
                    />
                  </Field.Root>
                  <Button onClick={fetchTurnover} loading={loadingTurnover}>
                    {t('counterpartsPage.generate')}
                  </Button>
                </Flex>

                <Box maxH="500px" overflowY="auto">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>{t('counterpartsPage.name')}</Table.ColumnHeader>
                        <Table.ColumnHeader>{t('counterpartsPage.account')}</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">{t('journalEntriesPage.debit')}</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">{t('journalEntriesPage.credit')}</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">{t('counterpartsPage.balance')}</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {(turnoverData || []).map((item: any, idx: number) => {
                         const debit = Number(item.total_debit || 0)
                         const credit = Number(item.total_credit || 0)
                         const balance = debit - credit
                         return (
                          <Table.Row key={idx}>
                            <Table.Cell fontWeight="medium">
                              {item.counterpart_name}
                              <Text fontSize="xs" color="gray.500">{item.vat_number}</Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant="outline">{item.account_code || '???'}</Badge>
                            </Table.Cell>
                            <Table.Cell textAlign="right">{debit.toFixed(2)}</Table.Cell>
                            <Table.Cell textAlign="right">{credit.toFixed(2)}</Table.Cell>
                            <Table.Cell textAlign="right" fontWeight="bold" color={balance > 0 ? 'blue.600' : balance < 0 ? 'red.600' : 'gray.600'}>
                              {balance.toFixed(2)}
                            </Table.Cell>
                          </Table.Row>
                        )
                      })}
                      {(turnoverData || []).length === 0 && !loadingTurnover && (
                        <Table.Row>
                          <Table.Cell colSpan={5} textAlign="center" color="gray.500">
                            No turnover data for this period
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={() => setTurnoverModalOpen(false)}>{t('common.close')}</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default CounterpartsPage