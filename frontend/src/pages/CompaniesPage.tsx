import { useState } from 'react'
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
  Field
} from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { Company } from '../types'
import { toaster } from '../components/ui/toaster'

function CompaniesPage() {
  const { t } = useTranslation()
  const { companies, loading, refreshCompanies, selectedCompanyId, setSelectedCompanyId } = useCompany()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    eik: '',
    vat_number: '',
    address: '',
    city: '',
    country: 'BG',
    post_code: '',
    is_vat_registered: false,
    currency: 'EUR'
  })
  const [saving, setSaving] = useState(false)

  const openModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company)
      setFormData({
        name: company.name,
        eik: company.eik,
        vat_number: company.vat_number || '',
        address: company.address || '',
        city: company.city || '',
        country: company.country || 'BG',
        post_code: company.post_code || '',
        is_vat_registered: company.is_vat_registered,
        currency: company.currency
      })
    } else {
      setEditingCompany(null)
      setFormData({
        name: '',
        eik: '',
        vat_number: '',
        address: '',
        city: '',
        country: 'BG',
        post_code: '',
        is_vat_registered: false,
        currency: 'EUR'
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCompany(null)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (editingCompany) {
        await apiClient.updateCompany(editingCompany.id, formData)
        toaster.create({ title: t('companiesPage.updated', { defaultValue: 'Company updated' }), type: 'success' })
      } else {
        await apiClient.createCompany(formData)
        toaster.create({ title: t('companiesPage.created', { defaultValue: 'Company created' }), type: 'success' })
      }
      await refreshCompanies()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('companiesPage.saveError', { defaultValue: 'Failed to save company' }),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (company: Company) => {
    if (!confirm(t('companiesPage.confirmDelete', { name: company.name }))) return

    try {
      await apiClient.deleteCompany(company.id)
      toaster.create({ title: t('companiesPage.deleted', { defaultValue: 'Company deleted' }), type: 'success' })
      await refreshCompanies()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('companiesPage.deleteError', { defaultValue: 'Failed to delete company' }),
        type: 'error'
      })
    }
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
        <Heading size="lg">{t('companiesPage.title')}</Heading>
        <Button colorScheme="blue" onClick={() => openModal()}>
          <FiPlus /> {t('companiesPage.add')}
        </Button>
      </Flex>

      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader></Table.ColumnHeader>
              <Table.ColumnHeader>{t('companiesPage.name')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('companiesPage.eik')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('companiesPage.vatNumber')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('common.city')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('common.currency')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('common.status')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {companies.map(company => (
              <Table.Row key={company.id} bg={selectedCompanyId === company.id ? { base: 'blue.50', _dark: 'blue.900/30' } : undefined}>
                <Table.Cell>
                  {selectedCompanyId === company.id ? (
                    <FiCheck color="green" />
                  ) : (
                    <Button size="xs" variant="ghost" onClick={() => setSelectedCompanyId(company.id)}>
                      {t('common.select')}
                    </Button>
                  )}
                </Table.Cell>
                <Table.Cell fontWeight="medium">{company.name}</Table.Cell>
                <Table.Cell>{company.eik}</Table.Cell>
                <Table.Cell>{company.vat_number || '-'}</Table.Cell>
                <Table.Cell>{company.city || '-'}</Table.Cell>
                <Table.Cell>{company.currency}</Table.Cell>
                <Table.Cell>
                  {company.is_vat_registered ? (
                    <Badge colorScheme="green">{t('companiesPage.vatRegistered')}</Badge>
                  ) : (
                    <Badge colorScheme="gray">{t('companiesPage.nonVat')}</Badge>
                  )}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <IconButton
                    aria-label={t('common.edit')}
                    size="sm"
                    variant="ghost"
                    onClick={() => openModal(company)}
                  >
                    <FiEdit2 />
                  </IconButton>
                  <IconButton
                    aria-label={t('common.delete')}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDelete(company)}
                  >
                    <FiTrash2 />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {companies.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="#a0aec0">{t('companiesPage.noCompanies')}</Text>
          </Box>
        )}
      </Box>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{editingCompany ? t('companiesPage.edit') : t('companiesPage.new')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Field.Root required>
                  <Field.Label>{t('companiesPage.name')}</Field.Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('companiesPage.name')}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>{t('companiesPage.eik')} (9 digits)</Field.Label>
                  <Input
                    value={formData.eik}
                    onChange={(e) => setFormData({ ...formData, eik: e.target.value })}
                    placeholder="123456789"
                    maxLength={9}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('companiesPage.vatNumber')}</Field.Label>
                  <Input
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                    placeholder="BG123456789"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('companiesPage.address')}</Field.Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('common.city')}</Field.Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>{t('common.postCode')}</Field.Label>
                  <Input
                    value={formData.post_code}
                    onChange={(e) => setFormData({ ...formData, post_code: e.target.value })}
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
              <Button colorScheme="blue" onClick={handleSubmit} loading={saving}>
                {editingCompany ? t('common.update') : t('common.create')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default CompaniesPage