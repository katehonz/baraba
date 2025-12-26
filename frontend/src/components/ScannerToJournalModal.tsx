import { useState, useCallback } from 'react'
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Separator,
  Spinner,
  Dialog,
  Portal,
  CloseButton
} from '@chakra-ui/react'
import { FiFileText, FiArrowRight, FiCheck, FiAlertTriangle, FiInfo } from 'react-icons/fi'
import type { RecognizedInvoice } from '../types'
import { scannerApi } from '../api/scanner'
import { apiClient } from '../api/client'
import { useCompany } from '../contexts/CompanyContext'
import { toaster } from './ui/toaster'

interface ScannerToJournalModalProps {
  isOpen: boolean
  onClose: () => void
  scannedData: RecognizedInvoice | null
  onJournalEntryCreated?: (journalEntryId: string) => void
}

export default function ScannerToJournalModal({
  isOpen,
  onClose,
  scannedData,
  onJournalEntryCreated
}: ScannerToJournalModalProps) {
  const { selectedCompanyId } = useCompany()

  const [isCreating, setIsCreating] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

const generateJournalEntryData = useCallback((scanData: RecognizedInvoice) => {
    const isPurchase = scanData.direction === 'PURCHASE'
    const today = new Date().toISOString().split('T')[0]
    
    // Generate smarter entry lines based on invoice data
    const entryLines = []
    
    // 1. Main expense/revenue line (80% of subtotal)
    const mainAmount = scanData.subtotal * 0.8
    entryLines.push({
      line_number: 1,
      description: `${isPurchase ? 'Стоки и услуги по фактура' : 'Приходи от продажба на стоки'} ${scanData.invoiceId}`,
      debit_amount: isPurchase ? mainAmount : 0,
      credit_amount: isPurchase ? 0 : mainAmount,
      base_debit_amount: isPurchase ? mainAmount : 0,
      base_credit_amount: isPurchase ? 0 : mainAmount,
      debit_account_id: null, // Will be filled by user
      credit_account_id: null, // Will be filled by user
      counterpart_id: null, // Will be filled by user
      vat_rate_id: null, // VAT will be separate
      vat_amount: scanData.totalTax * 0.8,
      base_vat_amount: scanData.totalTax * 0.8,
      notes: 'Автоматично генерирано от AI сканиране - основна сума'
    })
    
    // 2. Additional expenses/revenue line (20% of subtotal)
    const additionalAmount = scanData.subtotal * 0.2
    entryLines.push({
      line_number: 2,
      description: `${isPurchase ? 'Допълнителни разходи по фактура' : 'Допълнителни приходи'} ${scanData.invoiceId}`,
      debit_amount: isPurchase ? additionalAmount : 0,
      credit_amount: isPurchase ? 0 : additionalAmount,
      base_debit_amount: isPurchase ? additionalAmount : 0,
      base_credit_amount: isPurchase ? 0 : additionalAmount,
      debit_account_id: null, // Will be filled by user
      credit_account_id: null, // Will be filled by user
      counterpart_id: null, // Will be filled by user
      vat_rate_id: null, // VAT will be separate
      vat_amount: scanData.totalTax * 0.2,
      base_vat_amount: scanData.totalTax * 0.2,
      notes: 'Автоматично генерирано от AI сканиране - допълнителни разходи'
    })
    
    // 3. VAT deductible line (full VAT amount)
    if (scanData.totalTax > 0) {
      entryLines.push({
        line_number: 3,
        description: `ДДС по фактура ${scanData.invoiceId}`,
        debit_amount: isPurchase ? scanData.totalTax : 0,
        credit_amount: isPurchase ? 0 : scanData.totalTax,
        base_debit_amount: isPurchase ? scanData.totalTax : 0,
        base_credit_amount: isPurchase ? 0 : scanData.totalTax,
        debit_account_id: null, // VAT account - to be filled
        credit_account_id: null, // VAT account - to be filled
        counterpart_id: null,
        vat_rate_id: null,
        vat_amount: scanData.totalTax,
        base_vat_amount: scanData.totalTax,
        notes: 'ДДС автоматично изчислен от AI сканиране'
      })
    }
    
    // 4. Counterparty payment/balance line
    entryLines.push({
      line_number: 4,
      description: `${isPurchase ? 'Задължение към доставчик' : 'Получено плащане от клиент'} ${isPurchase ? scanData.vendorName : scanData.customerName} - ф. ${scanData.invoiceId}`,
      debit_amount: isPurchase ? 0 : scanData.invoiceTotal,
      credit_amount: isPurchase ? scanData.invoiceTotal : 0,
      base_debit_amount: isPurchase ? 0 : scanData.invoiceTotal,
      base_credit_amount: isPurchase ? scanData.invoiceTotal : 0,
      debit_account_id: null, // Bank/Cash account - to be filled
      credit_account_id: null, // Bank/Cash account - to be filled
      counterpart_id: null, // Will be resolved
      vat_rate_id: null,
      vat_amount: 0,
      base_vat_amount: 0,
      notes: 'Балансиращ ред - плащане'
    })
    
    return {
      company_id: selectedCompanyId || undefined,
      document_number: scanData.invoiceId,
      document_type: isPurchase ? 'INVOICE' : 'INVOICE',
      document_date: scanData.invoiceDate || today,
      accounting_date: today,
      vat_date: scanData.invoiceDate || today,
      description: `${isPurchase ? 'Покупка на стоки/услуги' : 'Продажба на стоки/услуги'} от ${isPurchase ? scanData.vendorName : scanData.customerName} по ф. ${scanData.invoiceId}`,
      currency: 'EUR',
      exchange_rate: 1,
      total_debit: scanData.invoiceTotal,
      total_credit: scanData.invoiceTotal,
      base_total_debit: scanData.invoiceTotal,
      base_total_credit: scanData.invoiceTotal,
      vat_amount: scanData.totalTax,
      vat_operation_type: isPurchase ? 'PURCHASE_INTRA_COMMUNITY' : 'SALE_INTRA_COMMUNITY',
      vat_document_type: 'INVOICE',
      entry_lines: entryLines,
      vat_entry: {
        document_type: 'INVOICE',
        document_number: scanData.invoiceId,
        document_date: scanData.invoiceDate || today,
        posting_date: today,
        deal_type: isPurchase ? 'PURCHASE' : 'SALE',
        description: `${isPurchase ? 'Покупка' : 'Продажба'} от/към ${isPurchase ? scanData.vendorName : scanData.customerName} по ф. ${scanData.invoiceId}`,
        tax_base: scanData.subtotal,
        vat_amount: scanData.totalTax,
        vat_rate: scanData.subtotal > 0 ? (scanData.totalTax / scanData.subtotal) * 100 : 20,
        total_amount: scanData.invoiceTotal,
        is_purchase: isPurchase,
        is_included: true,
        counterpart_id: null, // Will be resolved
        company_id: selectedCompanyId || ''
      },
      debtor_counterpart_id: isPurchase ? undefined : null, // Customer for sales
      creditor_counterpart_id: isPurchase ? null : undefined, // Vendor for purchases
    }
  }, [selectedCompanyId])

  const handlePreview = useCallback(async () => {
    if (!scannedData || !selectedCompanyId) return

    try {
      const journalData = generateJournalEntryData(scannedData)
      setPreviewData(journalData)
    } catch (error) {
      toaster.create({
        title: 'Грешка при генериране на преглед',
        description: error instanceof Error ? error.message : 'Неизвестна грешка',
        type: 'error',
        duration: 5000
      })
    }
  }, [scannedData, selectedCompanyId, generateJournalEntryData])

  const handleCreateJournalEntry = useCallback(async () => {
    if (!scannedData || !selectedCompanyId) return

    setIsCreating(true)
    try {
      const journalData = generateJournalEntryData(scannedData)

      const response = await apiClient.createJournalEntry(selectedCompanyId, journalData as any)

      toaster.create({
        title: 'Успешно създаден журнал запис',
        description: `Фактура ${scannedData.invoiceId} е обработена`,
        type: 'success',
        duration: 5000
      })

      // Save scanned invoice for tracking
      await scannerApi.saveScannedInvoice(selectedCompanyId, scannedData, scannedData.invoiceId)

      onJournalEntryCreated?.(response.data.id)
      onClose()
    } catch (error) {
      toaster.create({
        title: 'Грешка при създаване на журнал запис',
        description: error instanceof Error ? error.message : 'Неизвестна грешка',
        type: 'error',
        duration: 5000
      })
    } finally {
      setIsCreating(false)
    }
  }, [scannedData, selectedCompanyId, generateJournalEntryData, onJournalEntryCreated, onClose])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' }).format(amount || 0)

  if (!scannedData) return null

  const isPurchase = scannedData.direction === 'PURCHASE'

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="900px">
            <Dialog.Header>
              <HStack gap={3}>
                <FiFileText />
                <Text fontWeight="bold">Интеграция със Счетоводна Книга</Text>
                <Badge colorPalette={isPurchase ? 'blue' : 'green'}>
                  {isPurchase ? 'Покупка' : 'Продажба'}
                </Badge>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={6} align="stretch">
                {/* Summary of Scanned Data */}
                <Box bg={{ base: "gray.50", _dark: "gray.800" }} p={4} borderRadius="lg">
                  <Text fontWeight="bold" mb={3}>Обобщение на сканираните данни</Text>
                  <HStack gap={6} flexWrap="wrap">
                    <Box>
                      <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>Фактура №</Text>
                      <Text fontWeight="bold">{scannedData.invoiceId}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>Дата</Text>
                      <Text fontWeight="bold">{scannedData.invoiceDate}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>Данъчна основа</Text>
                      <Text fontWeight="bold">{formatCurrency(scannedData.subtotal)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>ДДС</Text>
                      <Text fontWeight="bold" color={{ base: "green.600", _dark: "green.400" }}>{formatCurrency(scannedData.totalTax)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>Общо</Text>
                      <Text fontWeight="bold" color={{ base: "blue.600", _dark: "blue.400" }}>{formatCurrency(scannedData.invoiceTotal)}</Text>
                    </Box>
                  </HStack>
                </Box>

                <Separator />

                {/* Auto-generated preview */}
                {!previewData && (
                  <Box textAlign="center">
                    <Button
                      colorPalette="blue"
                      onClick={handlePreview}
                      size="lg"
                    >
                      <FiArrowRight style={{ marginRight: '8px' }} />
                      Генерирай преглед на журнал запис
                    </Button>
                  </Box>
                )}

{previewData && (
                   <Box bg={{ base: "blue.50", _dark: "blue.900/30" }} p={4} borderRadius="lg">
                     <Text fontWeight="bold" mb={3}>📋 Предварително генерирани данни</Text>
                     
                     {/* Summary */}
                     <VStack align="start" gap={2} mb={4}>
                       <Text><strong>📄 Фактура:</strong> {previewData.document_number}</Text>
                       <Text><strong>📅 Дата:</strong> {previewData.document_date}</Text>
                       <Text><strong>📝 Описание:</strong> {previewData.description}</Text>
                       <Text><strong>📊 Обща сума:</strong> {formatCurrency(previewData.total_debit)}</Text>
                       <Text><strong>💰 ДДС сума:</strong> {formatCurrency(previewData.vat_amount)}</Text>
                     </VStack>
                     
                     <Separator />
                     
                     {/* Entry Lines Preview */}
                     <Box mb={4}>
                       <Text fontWeight="bold" mb={2}>🧾 Счетоводни редове ({previewData.entry_lines?.length || 0}):</Text>
                       <VStack align="start" gap={1} fontSize="sm">
                         {previewData.entry_lines?.map((line: any, index: number) => (
                           <HStack key={index} gap={4}>
                             <Text minW="20px">{line.line_number}.</Text>
                             <Text flex="1">{line.description}</Text>
                             <Text color={{ base: "green.600", _dark: "green.400" }} minW="80px" textAlign="right">
                                {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                              </Text>
                              <Text color={{ base: "red.600", _dark: "red.400" }} minW="80px" textAlign="right">
                                {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                              </Text>
                           </HStack>
                         ))}
                       </VStack>
                     </Box>
                     
                     <Separator />
                     
                     {/* Instructions */}
                     <Box>
                        <Text fontWeight="bold" mb={2} color={{ base: "blue.700", _dark: "blue.300" }}>🎯 Какво да попълните:</Text>
                       <VStack align="start" gap={1} fontSize="sm">
                         <Text>• <strong>Сметки:</strong> Изберете дебитни/кредитни сметки за всеки ред</Text>
                         <Text>• <strong>Контрагенти:</strong> Проверете и при нужда създайте/изберете контрагент</Text>
                         <Text>• <strong>ДДС ставки:</strong> Проверете дали ДДС процента е правилна</Text>
                         <Text>• <strong>Балансиране:</strong> Уверете се, че дебит = кредит за всеки ред</Text>
                       </VStack>
                     </Box>
                     
                     <Separator my={3} />
                     
                     <HStack bg={{ base: "orange.50", _dark: "orange.900/30" }} p={3} borderRadius="lg" color={{ base: "orange.700", _dark: "orange.300" }}>
                       <FiAlertTriangle />
                       <Text fontSize="sm" fontWeight="bold">
                         ⚠️ Моля, прегледайте и попълнете всички сметки преди записване!
                       </Text>
                     </HStack>
                   </Box>
                 )}

                {/* Manual Review Warning */}
                {scannedData.requiresManualReview && (
                  <Box bg={{ base: "orange.50", _dark: "orange.900/30" }} p={4} borderRadius="lg" borderLeft="4px solid" borderColor={{ base: "orange.400", _dark: "orange.500" }}>
                    <HStack gap={3}>
                      <FiAlertTriangle color="orange" />
                      <Box>
                        <Text fontWeight="bold">Необходим е ръчен преглед</Text>
                        <Text fontSize="sm">{scannedData.manualReviewReason}</Text>
                      </Box>
                    </HStack>
                  </Box>
                )}

                {/* Instructions */}
                <Box bg={{ base: "blue.50", _dark: "blue.900/30" }} p={4} borderRadius="lg" borderLeft="4px solid" borderColor={{ base: "blue.400", _dark: "blue.500" }}>
                  <HStack gap={3}>
                    <FiInfo color="blue" />
                    <Box>
                      <Text fontWeight="bold">Как работи автоматизацията</Text>
                      <Text fontSize="sm">
                        AI ще генерира журнал запис с автоматично разпределени суми.
                        Ще трябва само да проверите и коригирате сметките и контрагентите преди финално записване.
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={3}>
                <Button variant="ghost" onClick={onClose}>
                  Затвори
                </Button>

                {!previewData && (
                  <Button
                    colorPalette="blue"
                    onClick={handlePreview}
                  >
                    <FiArrowRight style={{ marginRight: '8px' }} />
                    Генерирай преглед
                  </Button>
                )}

                {previewData && (
                  <Button
                    colorPalette="green"
                    onClick={handleCreateJournalEntry}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Spinner size="sm" mr={2} />
                        Създаване...
                      </>
                    ) : (
                      <>
                        <FiCheck style={{ marginRight: '8px' }} />
                        Създай журнал запис
                      </>
                    )}
                  </Button>
                )}
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
