import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Badge,
  Card,
  Spinner,
  Center,
  Flex,
  Separator,
  Alert,
  Progress,
  Table,
} from '@chakra-ui/react'
import { FiUploadCloud, FiFile, FiCheck, FiInfo, FiArrowRight, FiX, FiLayers } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { scannerApi, type SessionStatusResponse } from '../api/scanner'
import { toaster } from '../components/ui/toaster'
import ScannerToJournalModal from '../components/ScannerToJournalModal'
import type { RecognizedInvoice } from '../types'

const MAX_FILE_SIZE_MB = 50
const POLL_INTERVAL_MS = 2000

type InvoiceType = 'purchase' | 'sales'
type UploadMode = 'single' | 'batch'

function DocumentScannerPage() {
  const { selectedCompany, selectedCompanyId } = useCompany()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Single file state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<RecognizedInvoice | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('purchase')
  const [fileError, setFileError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showJournalModal, setShowJournalModal] = useState(false)

  // Batch upload state
  const [uploadMode, setUploadMode] = useState<UploadMode>('single')
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [batchSessionId, setBatchSessionId] = useState<number | null>(null)
  const [batchStatus, setBatchStatus] = useState<SessionStatusResponse | null>(null)
  const [batchPolling, setBatchPolling] = useState(false)

  // Poll for batch status
  useEffect(() => {
    if (!batchSessionId || !batchPolling) return

    const pollStatus = async () => {
      try {
        const status = await scannerApi.getSessionStatus(batchSessionId)
        setBatchStatus(status)

        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          setBatchPolling(false)
          if (status.status === 'COMPLETED') {
            toaster.create({
              title: 'Пакетното сканиране завърши',
              description: `Обработени ${status.processedFiles} от ${status.totalFiles} файла`,
              type: 'success',
              duration: 5000
            })
          } else {
            toaster.create({
              title: 'Грешка при сканиране',
              description: status.errorMessage || 'Неизвестна грешка',
              type: 'error',
              duration: 5000
            })
          }
        }
      } catch (error) {
        console.error('Error polling batch status:', error)
      }
    }

    pollStatus()
    const interval = setInterval(pollStatus, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [batchSessionId, batchPolling])

  const handleSave = async () => {
    if (!data || !selectedCompanyId) return

    setSaving(true)
    try {
      await scannerApi.saveScannedInvoice(selectedCompanyId, data, file?.name)
      setSaveSuccess(true)
      toaster.create({ title: 'Фактурата е запазена успешно', type: 'success', duration: 3000 })
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при запазване', type: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateJournalEntry = () => {
    setShowJournalModal(true)
  }

  const handleJournalEntryCreated = (journalEntryId: string) => {
    setSaveSuccess(true)
    setShowJournalModal(false)
    toaster.create({
      title: 'Журнален запис създаден успешно',
      description: `Запис №${journalEntryId} е добавен в счетоводната книга`,
      type: 'success',
      duration: 5000
    })
    setData(null)
    setFile(null)
    setTimeout(() => setSaveSuccess(false), 5000)
  }

  const handleSingleFileChange = async (selectedFile: File | null) => {
    setFileError(null)
    setData(null)

    if (!selectedCompanyId) {
      setFileError('Моля изберете фирма')
      return
    }

    if (!selectedFile) return

    if (selectedFile.type !== 'application/pdf') {
      setFileError('Само PDF файлове са позволени')
      return
    }

    const fileSizeMB = selectedFile.size / (1024 * 1024)
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setFileError(`Файлът е твърде голям (${fileSizeMB.toFixed(1)} MB). Максимум: ${MAX_FILE_SIZE_MB} MB`)
      return
    }

    setFile(selectedFile)
    setLoading(true)

    try {
      const result = await scannerApi.scanInvoice(selectedFile, invoiceType, selectedCompanyId)
      setData(result)
      toaster.create({ title: 'Документът е сканиран успешно', type: 'success', duration: 3000 })
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при сканиране', type: 'error', duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  const handleBatchFilesSelect = (files: FileList | null) => {
    if (!files) return

    const validFiles: File[] = []
    const errors: string[] = []

    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf') {
        errors.push(`${file.name}: Само PDF файлове`)
      } else if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
        errors.push(`${file.name}: Твърде голям`)
      } else {
        validFiles.push(file)
      }
    })

    if (errors.length > 0) {
      toaster.create({
        title: 'Някои файлове са пропуснати',
        description: errors.slice(0, 3).join(', '),
        type: 'warning',
        duration: 5000
      })
    }

    setBatchFiles(prev => [...prev, ...validFiles])
  }

  const removeBatchFile = (index: number) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index))
  }

  const startBatchUpload = async () => {
    if (!selectedCompanyId || batchFiles.length === 0) return

    setLoading(true)
    setFileError(null)

    try {
      const response = await scannerApi.uploadBatch(batchFiles, invoiceType, selectedCompanyId)
      setBatchSessionId(response.sessionId)
      setBatchPolling(true)
      setBatchStatus({
        sessionId: response.sessionId,
        status: 'PROCESSING',
        totalFiles: response.totalFiles,
        processedFiles: 0,
        totalBatches: response.totalBatches,
        processedBatches: 0,
        progressPercent: 0,
        invoices: []
      })
      toaster.create({
        title: 'Пакетното качване започна',
        description: `${response.totalFiles} файла в ${response.totalBatches} пакета`,
        type: 'info',
        duration: 3000
      })
    } catch (error: any) {
      toaster.create({
        title: error.message || 'Грешка при качване',
        type: 'error',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelBatchUpload = async () => {
    if (!batchSessionId) return

    try {
      await scannerApi.cancelSession(batchSessionId)
      setBatchPolling(false)
      setBatchStatus(null)
      setBatchSessionId(null)
      toaster.create({ title: 'Сканирането е отменено', type: 'info', duration: 3000 })
    } catch (error: any) {
      toaster.create({ title: error.message || 'Грешка при отмяна', type: 'error', duration: 3000 })
    }
  }

  const resetBatch = () => {
    setBatchFiles([])
    setBatchSessionId(null)
    setBatchStatus(null)
    setBatchPolling(false)
  }

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)

    const files = event.dataTransfer.files
    if (uploadMode === 'single') {
      handleSingleFileChange(files?.[0])
    } else {
      handleBatchFilesSelect(files)
    }
  }, [selectedCompanyId, invoiceType, uploadMode])

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (selectedCompanyId) setIsDragOver(true)
  }, [selectedCompanyId])

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleUploadClick = () => {
    if (selectedCompanyId && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' }).format(amount || 0)

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>Моля изберете фирма</Alert.Title>
      </Alert.Root>
    )
  }

  if (!selectedCompany.ai_scanning_enabled) {
    return (
      <Box>
        <Heading size="lg" mb={6}>AI Сканиране на документи</Heading>
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Title>AI сканирането не е активирано за тази фирма</Alert.Title>
        </Alert.Root>
      </Box>
    )
  }

  return (
    <Box maxW="5xl" mx="auto">
      {/* Header */}
      <VStack gap={2} textAlign="center" mb={8}>
        <Flex
          w={16}
          h={16}
          bg="linear-gradient(135deg, #3182ce 0%, #667eea 100%)"
          borderRadius="full"
          align="center"
          justify="center"
          mb={2}
        >
          <FiFile size={32} color="white" />
        </Flex>
        <Heading size="xl">AI Сканиране на фактури</Heading>
        <Text color="#718096" maxW="xl">
          Качете PDF файлове с фактури и нашият AI ще извлече автоматично всички данни
        </Text>
      </VStack>

      {/* Mode Toggle */}
      <Center mb={4}>
        <HStack gap={0}>
          <Button
            colorScheme={uploadMode === 'single' ? 'purple' : 'gray'}
            variant={uploadMode === 'single' ? 'solid' : 'outline'}
            onClick={() => { setUploadMode('single'); resetBatch(); }}
            borderRightRadius={0}
            size="md"
          >
            <FiFile style={{ marginRight: 8 }} />
            Единичен файл
          </Button>
          <Button
            colorScheme={uploadMode === 'batch' ? 'purple' : 'gray'}
            variant={uploadMode === 'batch' ? 'solid' : 'outline'}
            onClick={() => { setUploadMode('batch'); setData(null); setFile(null); }}
            borderLeftRadius={0}
            size="md"
          >
            <FiLayers style={{ marginRight: 8 }} />
            Пакетно (10 стр. = $0.10)
          </Button>
        </HStack>
      </Center>

      {/* Invoice Type Toggle */}
      <Center mb={6}>
        <HStack gap={0}>
          <Button
            colorScheme={invoiceType === 'purchase' ? 'blue' : 'gray'}
            variant={invoiceType === 'purchase' ? 'solid' : 'outline'}
            onClick={() => setInvoiceType('purchase')}
            borderRightRadius={0}
            size="lg"
          >
            Покупки
          </Button>
          <Button
            colorScheme={invoiceType === 'sales' ? 'green' : 'gray'}
            variant={invoiceType === 'sales' ? 'solid' : 'outline'}
            onClick={() => setInvoiceType('sales')}
            borderLeftRadius={0}
            size="lg"
          >
            Продажби
          </Button>
        </HStack>
      </Center>

      {/* Upload Area */}
      <Card.Root
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragOver ? 'blue.400' : 'gray.200'}
        cursor={selectedCompanyId ? 'pointer' : 'not-allowed'}
        opacity={selectedCompanyId ? 1 : 0.6}
        onClick={handleUploadClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        transition="all 0.3s"
        _hover={{ borderColor: selectedCompanyId ? 'blue.400' : 'gray.200', shadow: selectedCompanyId ? 'lg' : 'none' }}
        mb={6}
      >
        <Card.Body py={12}>
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple={uploadMode === 'batch'}
            onChange={e => {
              if (uploadMode === 'single') {
                handleSingleFileChange(e.target.files?.[0] || null)
              } else {
                handleBatchFilesSelect(e.target.files)
              }
              e.target.value = ''
            }}
            display="none"
            disabled={!selectedCompanyId}
          />

          <VStack gap={4}>
            <Flex
              w={20}
              h={20}
              bg={isDragOver ? 'blue.50' : 'gray.50'}
              borderRadius="full"
              align="center"
              justify="center"
              transition="all 0.3s"
            >
              <FiUploadCloud size={48} color={isDragOver ? '#3182ce' : '#a0aec0'} />
            </Flex>

            {selectedCompanyId ? (
              <>
                <Text fontSize="lg" fontWeight="medium">
                  {uploadMode === 'single'
                    ? 'Плъзнете PDF файл тук или кликнете за избор'
                    : 'Плъзнете PDF файлове тук или кликнете за избор на много файлове'
                  }
                </Text>
                <Text color="#718096" fontSize="sm">
                  {uploadMode === 'batch'
                    ? `Файловете ще бъдат групирани по 10 страници. Поддържа до ${MAX_FILE_SIZE_MB} MB на файл.`
                    : `Поддържа PDF файлове до ${MAX_FILE_SIZE_MB} MB`
                  }
                </Text>
                <Button colorScheme="blue" size="lg">
                  {uploadMode === 'single' ? 'Изберете PDF файл' : 'Изберете PDF файлове'}
                </Button>
              </>
            ) : (
              <Text color="#718096">Моля изберете фирма</Text>
            )}

            {/* Single file indicator */}
            {uploadMode === 'single' && file && !loading && (
              <HStack bg={{ base: "green.50", _dark: "green.900/30" }} px={4} py={2} borderRadius="lg" borderWidth="1px" borderColor={{ base: "green.200", _dark: "green.700" }}>
                <FiCheck color="green" />
                <Text color={{ base: "green.700", _dark: "green.300" }} fontWeight="medium">{file.name}</Text>
                <Text color={{ base: "green.500", _dark: "green.400" }} fontSize="sm">({(file.size / (1024 * 1024)).toFixed(2)} MB)</Text>
              </HStack>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Batch Files List */}
      {uploadMode === 'batch' && batchFiles.length > 0 && !batchStatus && (
        <Card.Root mb={6}>
          <Card.Header>
            <Flex justify="space-between" align="center">
              <Heading size="md">Избрани файлове ({batchFiles.length})</Heading>
              <HStack>
                <Button size="sm" variant="ghost" onClick={() => setBatchFiles([])}>
                  Изчисти всички
                </Button>
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={startBatchUpload}
                  loading={loading}
                >
                  Започни сканиране
                </Button>
              </HStack>
            </Flex>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={2} maxH="200px" overflowY="auto">
              {batchFiles.map((f, idx) => (
                <HStack key={idx} justify="space-between" p={2} bg={{ base: "gray.50", _dark: "gray.800" }} borderRadius="md">
                  <HStack>
                    <FiFile />
                    <Text fontSize="sm">{f.name}</Text>
                    <Text fontSize="xs" color="gray.500">({(f.size / (1024 * 1024)).toFixed(2)} MB)</Text>
                  </HStack>
                  <Button size="xs" variant="ghost" onClick={() => removeBatchFile(idx)}>
                    <FiX />
                  </Button>
                </HStack>
              ))}
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Batch Progress */}
      {batchStatus && (
        <Card.Root mb={6}>
          <Card.Header>
            <Flex justify="space-between" align="center">
              <Heading size="md">
                {batchStatus.status === 'PROCESSING' ? 'Сканиране...' :
                 batchStatus.status === 'COMPLETED' ? 'Завършено' : 'Грешка'}
              </Heading>
              <Badge
                colorPalette={
                  batchStatus.status === 'COMPLETED' ? 'green' :
                  batchStatus.status === 'FAILED' ? 'red' : 'blue'
                }
                size="lg"
              >
                {batchStatus.processedFiles} / {batchStatus.totalFiles} файла
              </Badge>
            </Flex>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <Progress.Root value={batchStatus.progressPercent} size="lg">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>

              <Text fontSize="sm" color="gray.500" textAlign="center">
                Пакет {batchStatus.processedBatches} от {batchStatus.totalBatches}
                {batchStatus.status === 'PROCESSING' && ' • Обработка...'}
              </Text>

              {batchStatus.errorMessage && (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Title>{batchStatus.errorMessage}</Alert.Title>
                </Alert.Root>
              )}

              <HStack justify="center" gap={3}>
                {batchStatus.status === 'PROCESSING' && (
                  <Button variant="outline" colorScheme="red" onClick={cancelBatchUpload}>
                    Отмени
                  </Button>
                )}
                {(batchStatus.status === 'COMPLETED' || batchStatus.status === 'FAILED') && (
                  <Button colorScheme="blue" onClick={resetBatch}>
                    Ново сканиране
                  </Button>
                )}
              </HStack>

              {/* Results Table */}
              {batchStatus.invoices.length > 0 && (
                <>
                  <Separator />
                  <Heading size="sm">Резултати ({batchStatus.invoices.length})</Heading>
                  <Box maxH="300px" overflowY="auto">
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Доставчик/Клиент</Table.ColumnHeader>
                          <Table.ColumnHeader>Номер</Table.ColumnHeader>
                          <Table.ColumnHeader>Дата</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="right">Сума</Table.ColumnHeader>
                          <Table.ColumnHeader>Статус</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {batchStatus.invoices.map((inv, idx) => (
                          <Table.Row key={idx}>
                            <Table.Cell>
                              {inv.direction === 'PURCHASE' ? inv.vendorName : inv.customerName}
                            </Table.Cell>
                            <Table.Cell>{inv.invoiceId || '-'}</Table.Cell>
                            <Table.Cell>{inv.invoiceDate || '-'}</Table.Cell>
                            <Table.Cell textAlign="right">{formatCurrency(inv.invoiceTotal)}</Table.Cell>
                            <Table.Cell>
                              {inv.requiresManualReview ? (
                                <Badge colorPalette="orange" size="sm">Проверка</Badge>
                              ) : (
                                <Badge colorPalette="green" size="sm">OK</Badge>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                </>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* File Error */}
      {fileError && (
        <Alert.Root status="error" mb={6}>
          <Alert.Indicator />
          <Alert.Title>{fileError}</Alert.Title>
        </Alert.Root>
      )}

      {/* Loading State (single file) */}
      {uploadMode === 'single' && loading && (
        <Card.Root mb={6}>
          <Card.Body py={12}>
            <VStack gap={4}>
              <Spinner size="xl" color="blue.500" borderWidth="4px" />
              <Text fontSize="lg" fontWeight="medium">Сканиране на документа...</Text>
              <Text color="#718096">Извличане на данни с Azure Document Intelligence</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Scan Results (single file) */}
      {uploadMode === 'single' && data && !loading && (
        <Card.Root mb={6}>
          <Card.Header>
            <Flex justify="space-between" align="center">
              <Heading size="md">Резултати от сканирането</Heading>
              <HStack gap={2}>
                {data.requiresManualReview && (
                  <Badge colorPalette="orange" size="lg">Изисква проверка</Badge>
                )}
                <Badge colorPalette={data.direction === 'PURCHASE' ? 'blue' : 'green'} size="lg">
                  {data.direction === 'PURCHASE' ? 'Покупка' : data.direction === 'SALE' ? 'Продажба' : 'Неизвестно'}
                </Badge>
              </HStack>
            </Flex>
          </Card.Header>
          <Card.Body>
            <VStack gap={6} align="stretch">
              {data.requiresManualReview && data.manualReviewReason && (
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Title>{data.manualReviewReason}</Alert.Title>
                </Alert.Root>
              )}

              <Flex gap={6} wrap="wrap">
                <Box flex="1" minW="280px">
                  <Text fontWeight="semibold" mb={3} color="gray.600">
                    {data.direction === 'PURCHASE' ? 'Доставчик' : 'Клиент'}
                  </Text>
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between">
                      <Text color="gray.500">Име:</Text>
                      <Text fontWeight="medium">{data.direction === 'PURCHASE' ? data.vendorName : data.customerName || '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.500">ДДС номер:</Text>
                      <Text fontWeight="medium">{data.direction === 'PURCHASE' ? data.vendorVatNumber : data.customerVatNumber || '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.500">Адрес:</Text>
                      <Text fontWeight="medium" maxW="200px" textAlign="right">{data.direction === 'PURCHASE' ? data.vendorAddress : data.customerAddress || '-'}</Text>
                    </HStack>
                  </VStack>
                </Box>

                <Box flex="1" minW="280px">
                  <Text fontWeight="semibold" mb={3} color="gray.600">Документ</Text>
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between">
                      <Text color="gray.500">Номер:</Text>
                      <Text fontWeight="medium">{data.invoiceId || '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.500">Дата:</Text>
                      <Text fontWeight="medium">{data.invoiceDate || '-'}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.500">Падеж:</Text>
                      <Text fontWeight="medium">{data.dueDate || '-'}</Text>
                    </HStack>
                  </VStack>
                </Box>

                <Box flex="1" minW="280px">
                  <Text fontWeight="semibold" mb={3} color="gray.600">Суми</Text>
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between">
                      <Text color="gray.500">Данъчна основа:</Text>
                      <Text fontWeight="medium">{formatCurrency(data.subtotal)}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.500">ДДС:</Text>
                      <Text fontWeight="medium">{formatCurrency(data.totalTax)}</Text>
                    </HStack>
                    <Separator />
                    <HStack justify="space-between">
                      <Text color="gray.500" fontWeight="semibold">Общо:</Text>
                      <Text fontWeight="bold" fontSize="lg" color="blue.600">{formatCurrency(data.invoiceTotal)}</Text>
                    </HStack>
                  </VStack>
                </Box>
              </Flex>

              {data.validationStatus && data.validationStatus !== 'NOT_APPLICABLE' && (
                <HStack>
                  <FiInfo />
                  <Text fontSize="sm" color="gray.600">
                    VIES статус: {data.validationStatus === 'VALID' ? 'Валиден' :
                                   data.validationStatus === 'INVALID' ? 'Невалиден' :
                                   data.validationStatus === 'PENDING' ? 'Изчаква проверка' : 'Изисква ръчна проверка'}
                    {data.viesValidationMessage && ` - ${data.viesValidationMessage}`}
                  </Text>
                </HStack>
              )}

              <Separator />
              <Flex justify="flex-end" gap={3}>
                <Button
                  variant="outline"
                  onClick={() => { setData(null); setFile(null); }}
                >
                  Нулирай
                </Button>
                <Button
                  colorPalette="gray"
                  onClick={handleSave}
                  loading={saving}
                  disabled={saveSuccess}
                >
                  {saveSuccess ? 'Запазено' : 'Запази за по-късно'}
                </Button>
                <Button
                  colorPalette="blue"
                  onClick={handleCreateJournalEntry}
                >
                  <FiArrowRight style={{ marginRight: '8px' }} />
                  Създай журнален запис
                </Button>
              </Flex>
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      <ScannerToJournalModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        scannedData={data}
        onJournalEntryCreated={handleJournalEntryCreated}
      />
    </Box>
  )
}

export default DocumentScannerPage
