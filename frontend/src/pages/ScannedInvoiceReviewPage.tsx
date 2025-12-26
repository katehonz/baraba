import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Grid,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Card,
  Badge,
  Flex,
  Spinner,
  Separator,
  IconButton
} from '@chakra-ui/react'
import { FiArrowLeft, FiArrowRight, FiCheck, FiSave, FiAlertCircle } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { scannerApi } from '../api/scanner'
import { toaster } from '../components/ui/toaster'
import type { ScannedInvoice } from '../types'

function ScannedInvoiceReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedCompanyId } = useCompany()

  const [invoice, setInvoice] = useState<ScannedInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nextId, setNextId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    vendorName: '',
    vendorVatNumber: '',
    invoiceNumber: '',
    invoiceDate: '',
    invoiceTotal: '',
    totalTax: '',
    subtotal: ''
  })

  const loadInvoice = useCallback(async (invoiceId: number) => {
    if (!selectedCompanyId) return
    setLoading(true)
    try {
      const data = await scannerApi.getScannedInvoice(selectedCompanyId, invoiceId)
      setInvoice(data)
      setFormData({
        vendorName: data.vendorName || '',
        vendorVatNumber: data.vendorVatNumber || '',
        invoiceNumber: data.invoiceNumber || '',
        invoiceDate: data.invoiceDate || '',
        invoiceTotal: data.invoiceTotal?.toString() || '',
        totalTax: data.totalTax?.toString() || '',
        subtotal: data.subtotal?.toString() || ''
      })
      
      // Check for next pending
      try {
        const next = await scannerApi.getNextPendingScannedInvoice(selectedCompanyId, invoiceId)
        setNextId(next ? next.id : null)
      } catch (e) {
        console.warn("Could not fetch next invoice")
      }
      
    } catch (error) {
      toaster.create({ title: 'Грешка при зареждане', type: 'error', duration: 3000 })
      navigate('/scanned-invoices')
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId, navigate])

  useEffect(() => {
    if (id && !isNaN(Number(id))) {
      loadInvoice(Number(id))
    }
  }, [id, loadInvoice])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSaveAndNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [invoice, nextId, formData]) // Deps needed for closure

  const handleSave = async () => {
    if (!invoice || !selectedCompanyId) return
    setSaving(true)
    try {
      await scannerApi.updateScannedInvoice(selectedCompanyId, invoice.id, {
        ...invoice,
        vendorName: formData.vendorName,
        vendorVatNumber: formData.vendorVatNumber,
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        invoiceTotal: Number(formData.invoiceTotal),
        totalTax: Number(formData.totalTax),
        subtotal: Number(formData.subtotal),
        status: 'PENDING' // Or APPROVED if we had that status
      })
      toaster.create({ title: 'Запазено', type: 'success', duration: 2000 })
      return true
    } catch (error) {
      toaster.create({ title: 'Грешка при запис', type: 'error', duration: 3000 })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndNext = async () => {
    const success = await handleSave()
    if (success) {
      if (nextId) {
        navigate(`/scanned-invoices/${nextId}/review`)
      } else {
        toaster.create({ title: 'Няма повече фактури за преглед', type: 'info', duration: 3000 })
        navigate('/scanned-invoices')
      }
    }
  }

  const handleProcess = async () => {
    if (!invoice) return
    if (!confirm('Сигурни ли сте, че данните са верни и искате да осчетоводите фактурата?')) return
    
    // First save any changes
    await handleSave()
    
    setSaving(true)
    try {
      await scannerApi.processScannedInvoice(invoice.id)
      toaster.create({ title: 'Фактурата е осчетоводена успешно!', type: 'success', duration: 3000 })
      
      if (nextId) {
        navigate(`/scanned-invoices/${nextId}/review`)
      } else {
        navigate('/scanned-invoices')
      }
    } catch (error) {
      toaster.create({ title: 'Грешка при осчетоводяване', type: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Flex h="100vh" align="center" justify="center">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    )
  }

  if (!invoice) return null

  return (
    <Box h="calc(100vh - 64px)" overflow="hidden">
      <Grid templateColumns={{ base: "1fr", lg: "1fr 400px" }} h="100%">
        {/* Left: Document Viewer */}
        <Box bg="gray.100" p={4} h="100%" overflowY="auto" display="flex" flexDirection="column">
           <HStack mb={2}>
             <Button size="sm" variant="ghost" onClick={() => navigate('/scanned-invoices')}>
               <FiArrowLeft /> Назад към списъка
             </Button>
             <Text fontWeight="bold" flex={1} textAlign="center">
               {invoice.originalFileName}
             </Text>
           </HStack>
           
           <Box flex={1} bg="white" borderRadius="md" boxShadow="sm" display="flex" alignItems="center" justifyContent="center" border="1px dashed" borderColor="gray.300">
             <VStack color="gray.500">
               <FiAlertCircle size={48} />
               <Text>Прегледът на PDF не е наличен в демо режим</Text>
               <Text fontSize="sm">Оригинал: {invoice.originalFileName}</Text>
             </VStack>
           </Box>
        </Box>

        {/* Right: Data Form */}
        <Box p={6} h="100%" overflowY="auto" borderLeftWidth="1px" bg="white">
          <VStack align="stretch" gap={6}>
            <Heading size="md">Преглед на фактура</Heading>

            <HStack>
              <Badge colorPalette={invoice.direction === 'PURCHASE' ? 'blue' : 'green'}>
                {invoice.direction === 'PURCHASE' ? 'Покупка' : 'Продажба'}
              </Badge>
              <Badge colorPalette={invoice.status === 'PENDING' ? 'yellow' : 'green'}>
                {invoice.status}
              </Badge>
            </HStack>

            <Card.Root>
              <Card.Header pb={2}>
                <Heading size="sm">Данни за контрагента</Heading>
              </Card.Header>
              <Card.Body gap={4}>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>Име</Text>
                  <Input 
                    value={formData.vendorName} 
                    onChange={e => setFormData({...formData, vendorName: e.target.value})}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>ЕИК / ДДС Номер</Text>
                  <Input 
                    value={formData.vendorVatNumber} 
                    onChange={e => setFormData({...formData, vendorVatNumber: e.target.value})}
                  />
                </Box>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Header pb={2}>
                <Heading size="sm">Детайли за документа</Heading>
              </Card.Header>
              <Card.Body gap={4}>
                <HStack>
                  <Box flex={1}>
                    <Text fontSize="sm" color="gray.500" mb={1}>Номер</Text>
                    <Input 
                      value={formData.invoiceNumber} 
                      onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                    />
                  </Box>
                  <Box flex={1}>
                    <Text fontSize="sm" color="gray.500" mb={1}>Дата</Text>
                    <Input 
                      type="date"
                      value={formData.invoiceDate} 
                      onChange={e => setFormData({...formData, invoiceDate: e.target.value})}
                    />
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Header pb={2}>
                <Heading size="sm">Суми (BGN/EUR)</Heading>
              </Card.Header>
              <Card.Body gap={4}>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>Данъчна основа</Text>
                  <Input 
                    type="number"
                    value={formData.subtotal} 
                    onChange={e => setFormData({...formData, subtotal: e.target.value})}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>ДДС</Text>
                  <Input 
                    type="number"
                    value={formData.totalTax} 
                    onChange={e => setFormData({...formData, totalTax: e.target.value})}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1} fontWeight="bold">Общо</Text>
                  <Input 
                    type="number"
                    fontWeight="bold"
                    value={formData.invoiceTotal} 
                    onChange={e => setFormData({...formData, invoiceTotal: e.target.value})}
                  />
                </Box>
              </Card.Body>
            </Card.Root>

            <Separator />

            <VStack gap={3} pt={2}>
              <Button 
                colorScheme="blue" 
                size="lg" 
                width="100%" 
                onClick={handleSaveAndNext}
                loading={saving}
              >
                <FiSave style={{ marginRight: '8px' }} /> Запази и Следващ (Ctrl+Enter)
              </Button>
              
              <Button 
                colorScheme="green" 
                variant="outline" 
                width="100%" 
                onClick={handleProcess}
                loading={saving}
              >
                <FiCheck style={{ marginRight: '8px' }} /> Осчетоводи и Следващ
              </Button>

              <HStack w="100%" justify="space-between">
                 {/* Navigation buttons */}
                 <Button variant="ghost" disabled={true}><FiArrowLeft /> Предишен</Button>
                 <Button variant="ghost" disabled={!nextId} onClick={() => navigate(`/scanned-invoices/${nextId}/review`)}>
                   Следващ <FiArrowRight />
                 </Button>
              </HStack>
            </VStack>

          </VStack>
        </Box>
      </Grid>
    </Box>
  )
}

export default ScannedInvoiceReviewPage
