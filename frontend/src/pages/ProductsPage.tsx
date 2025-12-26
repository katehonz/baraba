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
  Alert,
  HStack
} from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { Product } from '../types'
import { toaster } from '../components/ui/toaster'
import { useTranslation } from 'react-i18next'

const PRODUCT_TYPES = ['PRODUCT', 'SERVICE']

function ProductsPage() {
  const { t } = useTranslation()
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    product_code: '',
    type: 'PRODUCT' as 'PRODUCT' | 'SERVICE',
    description: '',
    product_group: '',
    uom_base: 'pcs',
    uom_standard: 'pcs',
    uom_conversion_factor: 1,
    tax_type: 'VAT',
    tax_code: '20'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadProducts()
    }
  }, [selectedCompanyId])

  const loadProducts = async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const response = await apiClient.getProducts(selectedCompanyId)
      setProducts(response.data)
    } catch (err) {
      console.error('Failed to load products:', err)
      toaster.create({
        title: t('common.error'),
        description: t('productsPage.loadError', { defaultValue: 'Failed to load products' }),
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        product_code: product.product_code,
        type: product.type,
        description: product.description,
        product_group: product.product_group || '',
        uom_base: product.uom_base,
        uom_standard: product.uom_standard,
        uom_conversion_factor: product.uom_conversion_factor,
        tax_type: product.tax_type,
        tax_code: product.tax_code
      })
    } else {
      setEditingProduct(null)
      setFormData({
        product_code: '',
        type: 'PRODUCT',
        description: '',
        product_group: '',
        uom_base: 'pcs',
        uom_standard: 'pcs',
        uom_conversion_factor: 1,
        tax_type: 'VAT',
        tax_code: '20'
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  const handleSubmit = async () => {
    if (!selectedCompanyId) return
    setSaving(true)
    try {
      if (editingProduct) {
        await apiClient.updateProduct(selectedCompanyId, editingProduct.id, formData)
        toaster.create({ title: t('productsPage.updated', { defaultValue: 'Product updated' }), type: 'success' })
      } else {
        await apiClient.createProduct(selectedCompanyId, formData)
        toaster.create({ title: t('productsPage.created', { defaultValue: 'Product created' }), type: 'success' })
      }
      await loadProducts()
      closeModal()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('productsPage.saveError', { defaultValue: 'Failed to save product' }),
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product: Product) => {
    if (!selectedCompanyId) return
    if (!confirm(t('productsPage.confirmDelete', { name: product.description }))) return

    try {
      await apiClient.deleteProduct(selectedCompanyId, product.id)
      toaster.create({ title: t('productsPage.deleted', { defaultValue: 'Product deleted' }), type: 'success' })
      await loadProducts()
    } catch (err: any) {
      toaster.create({
        title: t('common.error'),
        description: err.error || t('productsPage.deleteError', { defaultValue: 'Failed to delete product' }),
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
          <Heading size="lg">{t('productsPage.title')}</Heading>
          <Text color="#718096">{selectedCompany.name}</Text>
        </Box>
        <Button colorScheme="blue" onClick={() => openModal()}>
          <FiPlus /> {t('productsPage.add')}
        </Button>
      </Flex>

      <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="lg" shadow="sm" overflow="hidden">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t('productsPage.code')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('productsPage.type')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('common.description')}</Table.ColumnHeader>
              <Table.ColumnHeader>{t('productsPage.measureUnit')}</Table.ColumnHeader>
              <Table.ColumnHeader>Tax</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">{t('common.actions')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {products.map(product => (
              <Table.Row key={product.id}>
                <Table.Cell fontWeight="medium" fontFamily="mono">{product.product_code}</Table.Cell>
                <Table.Cell>
                  <Badge colorScheme={product.type === 'PRODUCT' ? 'blue' : 'purple'}>
                    {product.type === 'PRODUCT' ? t('productsPage.goods') : t('productsPage.service')}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{product.description}</Table.Cell>
                <Table.Cell>{product.uom_base}</Table.Cell>
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    <Text fontSize="xs" fontWeight="bold">{product.tax_code}</Text>
                    <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>{product.tax_type}</Text>
                  </VStack>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <IconButton
                    aria-label={t('common.edit')}
                    size="sm"
                    variant="ghost"
                    onClick={() => openModal(product)}
                  >
                    <FiEdit2 />
                  </IconButton>
                  <IconButton
                    aria-label={t('common.delete')}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDelete(product)}
                  >
                    <FiTrash2 />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {products.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="#a0aec0">{t('productsPage.noProducts')}</Text>
          </Box>
        )}
      </Box>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => !e.open && closeModal()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{editingProduct ? t('productsPage.edit') : t('productsPage.new')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <HStack w="full" gap={4}>
                  <Field.Root required w="50%">
                    <Field.Label>{t('productsPage.code')}</Field.Label>
                    <Input
                      value={formData.product_code}
                      onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                      placeholder="e.g. PRD-001"
                    />
                  </Field.Root>

                  <Field.Root required w="50%">
                    <Field.Label>{t('productsPage.type')}</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PRODUCT' | 'SERVICE' })}
                      >
                        {PRODUCT_TYPES.map(type => (
                          <option key={type} value={type}>{type === 'PRODUCT' ? t('productsPage.goods') : t('productsPage.service')}</option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                </HStack>

                <Field.Root required>
                  <Field.Label>{t('common.description')}</Field.Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('common.description')}
                  />
                </Field.Root>

                <HStack w="full" gap={4}>
                   <Field.Root required w="50%">
                    <Field.Label>{t('productsPage.uomBase')}</Field.Label>
                    <Input
                      value={formData.uom_base}
                      onChange={(e) => setFormData({ ...formData, uom_base: e.target.value })}
                    />
                  </Field.Root>
                  <Field.Root required w="50%">
                    <Field.Label>{t('productsPage.uomStandard')}</Field.Label>
                    <Input
                      value={formData.uom_standard}
                      onChange={(e) => setFormData({ ...formData, uom_standard: e.target.value })}
                    />
                  </Field.Root>
                </HStack>

                <HStack w="full" gap={4}>
                  <Field.Root required w="50%">
                    <Field.Label>{t('productsPage.taxType')}</Field.Label>
                    <Input
                      value={formData.tax_type}
                      onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                    />
                  </Field.Root>
                   <Field.Root required w="50%">
                    <Field.Label>{t('productsPage.taxCode')}</Field.Label>
                    <Input
                      value={formData.tax_code}
                      onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
                    />
                  </Field.Root>
                </HStack>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
              <Button colorScheme="blue" onClick={handleSubmit} loading={saving}>
                {editingProduct ? t('common.update') : t('common.create')}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}

export default ProductsPage