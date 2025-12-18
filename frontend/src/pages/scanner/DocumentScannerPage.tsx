import { useState, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  ButtonGroup,
  Input,
  FormControl,
  FormLabel,
  Badge,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Divider,
  useColorModeValue,
  useToast,
  Icon,
  Flex,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  Spinner,
  Center,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { scannerApi } from '../../api/scanner';
import { useTranslation } from 'react-i18next';
import type { RecognizedInvoice } from '../../types';

// Icons
const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
  </svg>
);

const DocumentIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
);

const MAX_FILE_SIZE_MB = 50;

type InvoiceType = 'purchase' | 'sales';

export default function DocumentScannerPage() {
  const { t } = useTranslation();
  const { companyId } = useCompany();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<RecognizedInvoice | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('purchase');
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const dropzoneBg = useColorModeValue('gray.50', 'gray.700');
  const dropzoneHoverBg = useColorModeValue('blue.50', 'blue.900');

  const handleSave = async () => {
    if (!data || !companyId) return;

    setSaving(true);
    try {
      await scannerApi.saveScannedInvoice(companyId, data, file?.name);
      setSaveSuccess(true);
      toast({ title: t('scanner.invoiceSavedSuccessfully'), status: 'success' });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      toast({ title: error.message || t('scanner.errorSaving'), status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (selectedFile: File | null) => {
    setFileError(null);
    setData(null);

    if (!companyId) {
      setFileError(t('scanner.pleaseSelectCompany'));
      return;
    }

    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setFileError(t('common.pdfOnly'));
      return;
    }

    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setFileError(t('scanner.fileTooLarge', { size: fileSizeMB.toFixed(1), maxSize: MAX_FILE_SIZE_MB }));
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const result = await scannerApi.scanInvoice(selectedFile, invoiceType, companyId);
      setData(result);
      toast({ title: t('scanner.documentScannedSuccessfully'), status: 'success' });
    } catch (error: any) {
      toast({ title: error.message || t('scanner.scanError'), status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const droppedFile = event.dataTransfer.files?.[0];
    handleFileChange(droppedFile);
  }, [companyId, invoiceType]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (companyId) setIsDragOver(true);
  }, [companyId]);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleUploadClick = () => {
    if (companyId && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'BGN' }).format(amount || 0);

  return (
    <Box maxW="5xl" mx="auto">
      {/* Header */}
      <VStack spacing={2} textAlign="center" mb={8}>
        <Flex
          w={16}
          h={16}
          bg="linear-gradient(135deg, #3182ce 0%, #667eea 100%)"
          borderRadius="full"
          align="center"
          justify="center"
          mb={2}
        >
          <Icon as={DocumentIcon} color="white" />
        </Flex>
        <Heading size="xl">{t('scanner.aiScanningTitle')}</Heading>
        <Text color="gray.500" maxW="xl">
          {t('scanner.aiScanningDesc')}
        </Text>
      </VStack>

      {/* Invoice Type Toggle */}
      <Center mb={6}>
        <ButtonGroup size="lg" isAttached variant="outline">
          <Button
            colorScheme={invoiceType === 'purchase' ? 'blue' : 'gray'}
            variant={invoiceType === 'purchase' ? 'solid' : 'outline'}
            onClick={() => setInvoiceType('purchase')}
            leftIcon={<Text>🛒</Text>}
          >
            {t('scanner.purchaseInvoices')}
          </Button>
          <Button
            colorScheme={invoiceType === 'sales' ? 'green' : 'gray'}
            variant={invoiceType === 'sales' ? 'solid' : 'outline'}
            onClick={() => setInvoiceType('sales')}
            leftIcon={<Text>💰</Text>}
          >
            {t('scanner.salesInvoices')}
          </Button>
        </ButtonGroup>
      </Center>

      {/* Upload Area */}
      <Card
        bg={cardBg}
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragOver ? 'blue.400' : borderColor}
        cursor={companyId ? 'pointer' : 'not-allowed'}
        opacity={companyId ? 1 : 0.6}
        onClick={handleUploadClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        transition="all 0.3s"
        _hover={{ borderColor: companyId ? 'blue.400' : borderColor, shadow: companyId ? 'lg' : 'none' }}
        mb={6}
      >
        <CardBody py={12}>
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={e => handleFileChange(e.target.files?.[0] || null)}
            display="none"
            disabled={!companyId}
          />

          <VStack spacing={4}>
            <Flex
              w={20}
              h={20}
              bg={isDragOver ? dropzoneHoverBg : dropzoneBg}
              borderRadius="full"
              align="center"
              justify="center"
              transition="all 0.3s"
            >
              <Icon as={UploadIcon} color={isDragOver ? 'blue.500' : 'gray.400'} />
            </Flex>

            {companyId ? (
              <>
                <Text fontSize="lg" fontWeight="medium">
                  {t('scanner.dragFileText')}
                </Text>
                <Text color="gray.500" fontSize="sm">
                  {t('scanner.supportsPdfText', { maxSize: MAX_FILE_SIZE_MB })}
                </Text>
                <Button colorScheme="blue" size="lg">
                  {t('scanner.selectPdfFile')}
                </Button>
              </>
            ) : (
              <Text color="gray.500">{t('scanner.pleaseSelectCompany')}</Text>
            )}

            {file && !loading && (
              <HStack bg="green.50" px={4} py={2} borderRadius="lg" borderWidth="1px" borderColor="green.200">
                <Icon as={CheckIcon} color="green.500" />
                <Text color="green.700" fontWeight="medium">{file.name}</Text>
                <Text color="green.500" fontSize="sm">({(file.size / (1024 * 1024)).toFixed(2)} MB)</Text>
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* File Error */}
      {fileError && (
        <Alert status="error" borderRadius="lg" mb={6}>
          <AlertIcon />
          {fileError}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Card bg={cardBg} mb={6}>
          <CardBody py={12}>
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" thickness="4px" />
              <Text fontSize="lg" fontWeight="medium">{t('scanner.scanningDocument')}</Text>
              <Text color="gray.500">{t('scanner.extractingData')}</Text>
              <Progress size="sm" isIndeterminate w="50%" colorScheme="blue" borderRadius="full" />
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Results */}
      {data && (
        <Card bg={cardBg} mb={6} overflow="hidden">
          <CardHeader bg={useColorModeValue('green.50', 'green.900')} borderBottomWidth="1px" borderColor={borderColor}>
            <HStack justify="space-between">
              <HStack>
                <Flex w={10} h={10} bg="green.100" borderRadius="full" align="center" justify="center">
                  <Icon as={CheckIcon} color="green.600" />
                </Flex>
                 <Box>
                   <Heading size="md">{t('scanner.extractedData')}</Heading>
                   <Text fontSize="sm" color="gray.500">{t('scanner.successfullyRecognized')}</Text>
                 </Box>
              </HStack>
              <Badge
                colorScheme={data.direction === 'PURCHASE' ? 'blue' : data.direction === 'SALE' ? 'green' : 'yellow'}
                fontSize="md"
                px={3}
                py={1}
              >
                {data.direction === 'PURCHASE' ? 'Purchase' : data.direction === 'SALE' ? 'Sale' : 'Unknown'}
              </Badge>
            </HStack>
          </CardHeader>

          <CardBody>
            <VStack spacing={6} align="stretch">
              {/* Manual Review Warning */}
               {data.requiresManualReview && (
                 <Alert status="warning" borderRadius="lg">
                   <AlertIcon as={WarningIcon} />
                   <Box>
                     <AlertTitle>{t('scanner.manualReviewRequired')}</AlertTitle>
                     <AlertDescription>{data.manualReviewReason}</AlertDescription>
                   </Box>
                 </Alert>
               )}

              {/* Vendor Section */}
               <Box>
                 <Text fontWeight="bold" color="gray.600" mb={3}>{t('scanner.vendor')}</Text>
                 <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                   <FormControl>
                     <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.name')}</FormLabel>
                    <Input value={data.vendorName || ''} isReadOnly bg={dropzoneBg} />
                  </FormControl>
                   <FormControl>
                     <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.vatNumber')}</FormLabel>
                     <Input value={data.vendorVatNumber || ''} isReadOnly bg={dropzoneBg} fontFamily="mono" />
                   </FormControl>
                   <FormControl>
                     <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.address')}</FormLabel>
                    <Input value={data.vendorAddress || ''} isReadOnly bg={dropzoneBg} />
                  </FormControl>
                </SimpleGrid>
              </Box>

              <Divider />

              {/* Customer Section */}
               <Box>
                 <Text fontWeight="bold" color="gray.600" mb={3}>{t('scanner.customer')}</Text>
                 <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                   <FormControl>
                     <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.name')}</FormLabel>
                    <Input value={data.customerName || ''} isReadOnly bg={dropzoneBg} />
                  </FormControl>
                   <FormControl>
                     <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.vatNumber')}</FormLabel>
                     <Input value={data.customerVatNumber || ''} isReadOnly bg={dropzoneBg} fontFamily="mono" />
                   </FormControl>
                   <FormControl>
                     <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.address')}</FormLabel>
                    <Input value={data.customerAddress || ''} isReadOnly bg={dropzoneBg} />
                  </FormControl>
                </SimpleGrid>
              </Box>

              <Divider />

              {/* Invoice Details */}
               <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                 <FormControl>
                   <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.invoiceNumber')}</FormLabel>
                   <Input value={data.invoiceId || ''} isReadOnly bg={dropzoneBg} fontFamily="mono" />
                 </FormControl>
                 <FormControl>
                   <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.invoiceDate')}</FormLabel>
                   <Input value={data.invoiceDate || ''} isReadOnly bg={dropzoneBg} />
                 </FormControl>
                 <FormControl>
                   <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.dueDate')}</FormLabel>
                   <Input value={data.dueDate || ''} isReadOnly bg={dropzoneBg} />
                 </FormControl>
                 <FormControl>
                   <FormLabel fontSize="xs" color="gray.500" textTransform="uppercase">{t('scanner.viesStatus')}</FormLabel>
                  <Badge
                    colorScheme={
                      data.validationStatus === 'VALID' ? 'green' :
                      data.validationStatus === 'INVALID' ? 'red' :
                      data.validationStatus === 'PENDING' ? 'yellow' : 'gray'
                    }
                    fontSize="sm"
                    px={3}
                    py={2}
                    w="full"
                    textAlign="center"
                  >
                    {data.validationStatus === 'VALID' ? 'Valid' :
                     data.validationStatus === 'INVALID' ? 'Invalid' :
                     data.validationStatus === 'PENDING' ? 'Pending' :
                     data.validationStatus === 'NOT_APPLICABLE' ? 'N/A' : 'Review'}
                  </Badge>
                </FormControl>
              </SimpleGrid>

              <Divider />

              {/* Amounts */}
               <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                 <Stat bg={dropzoneBg} p={4} borderRadius="xl">
                   <StatLabel>{t('scanner.taxBase')}</StatLabel>
                   <StatNumber>{formatCurrency(data.subtotal)}</StatNumber>
                 </Stat>
                 <Stat bg={dropzoneBg} p={4} borderRadius="xl">
                   <StatLabel>{t('scanner.vat')}</StatLabel>
                   <StatNumber>{formatCurrency(data.totalTax)}</StatNumber>
                 </Stat>
                 <Stat bg="blue.50" p={4} borderRadius="xl" borderWidth="1px" borderColor="blue.200">
                   <StatLabel color="blue.600">{t('scanner.totalAmountLabel')}</StatLabel>
                   <StatNumber color="blue.700" fontSize="2xl">{formatCurrency(data.invoiceTotal)}</StatNumber>
                 </Stat>
               </SimpleGrid>

              {/* Suggested Accounts */}
              {data.suggestedAccounts && (
                <>
                  <Divider />
                   <Box>
                     <Text fontWeight="bold" color="gray.600" mb={3}>{t('scanner.suggestedAccounts')}</Text>
                     <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                       {data.suggestedAccounts.counterpartyAccount && (
                         <Stat bg="purple.50" p={4} borderRadius="xl" borderWidth="1px" borderColor="purple.200">
                           <StatLabel color="purple.600">
                             {data.direction === 'PURCHASE' ? t('scanner.suppliers') : t('scanner.customers')}
                           </StatLabel>
                          <StatNumber fontSize="sm" color="purple.900">
                            {data.suggestedAccounts.counterpartyAccount.code} - {data.suggestedAccounts.counterpartyAccount.name}
                          </StatNumber>
                        </Stat>
                      )}
                       {data.suggestedAccounts.vatAccount && (
                         <Stat bg="orange.50" p={4} borderRadius="xl" borderWidth="1px" borderColor="orange.200">
                           <StatLabel color="orange.600">{t('scanner.vatAccount')}</StatLabel>
                          <StatNumber fontSize="sm" color="orange.900">
                            {data.suggestedAccounts.vatAccount.code} - {data.suggestedAccounts.vatAccount.name}
                          </StatNumber>
                        </Stat>
                      )}
                       {data.suggestedAccounts.expenseOrRevenueAccount && (
                         <Stat bg="teal.50" p={4} borderRadius="xl" borderWidth="1px" borderColor="teal.200">
                           <StatLabel color="teal.600">
                             {data.direction === 'PURCHASE' ? t('scanner.expense') : t('scanner.revenue')}
                           </StatLabel>
                          <StatNumber fontSize="sm" color="teal.900">
                            {data.suggestedAccounts.expenseOrRevenueAccount.code} - {data.suggestedAccounts.expenseOrRevenueAccount.name}
                          </StatNumber>
                        </Stat>
                      )}
                    </SimpleGrid>
                  </Box>
                </>
              )}

              {/* Success Message */}
               {saveSuccess && (
                 <Alert status="success" borderRadius="lg">
                   <AlertIcon />
                   {t('scanner.invoiceSavedSuccessfully')}
                 </Alert>
               )}

              {/* Save Button */}
              <HStack justify="flex-end" pt={4} borderTopWidth="1px" borderColor={borderColor}>
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleSave}
                  isLoading={saving}
                  loadingText={t('scanner.saving')}
                  leftIcon={<Icon as={DocumentIcon} boxSize={5} />}
                >
                  {t('scanner.saveForProcessing')}
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Azure Setup Instructions */}
      <Accordion allowToggle>
        <AccordionItem border="none">
          <Card bg={cardBg}>
            <AccordionButton p={6}>
              <HStack flex="1">
                <Flex w={10} h={10} bg="blue.600" borderRadius="lg" align="center" justify="center">
                  <Text fontSize="xl" color="white">☁️</Text>
                </Flex>
                <Box textAlign="left">
                   <Heading size="md">{t('scanner.azureSetupTitle')}</Heading>
                   <Text fontSize="sm" color="gray.500">{t('scanner.configurationInstructions')}</Text>
                 </Box>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={6}>
              <VStack spacing={4} align="stretch">
                <Alert status="info" borderRadius="lg">
                  <AlertIcon />
                  <Box>
                     <AlertTitle>{t('scanner.whereToEnterKeys')}</AlertTitle>
                     <AlertDescription>
                       {t('scanner.whereToEnterKeysDesc')}
                     </AlertDescription>
                   </Box>
                </Alert>

                <List spacing={4}>
                  <ListItem>
                    <HStack align="start">
                      <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>1</Badge>
                      <Box>
                        <Text fontWeight="medium">{t('scanner.createAzureAccount')}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {t('scanner.createAzureAccountDesc')}
                        </Text>
                      </Box>
                    </HStack>
                  </ListItem>
                  <ListItem>
                    <HStack align="start">
                      <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>2</Badge>
                      <Box>
                        <Text fontWeight="medium">{t('scanner.createDocIntelligenceResource')}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {t('scanner.createDocIntelligenceResourceDesc')}
                        </Text>
                      </Box>
                    </HStack>
                  </ListItem>
                  <ListItem>
                    <HStack align="start">
                      <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>3</Badge>
                      <Box>
                        <Text fontWeight="medium">{t('scanner.choosePricingPlan')}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {t('scanner.choosePricingPlanDesc')}
                        </Text>
                      </Box>
                    </HStack>
                  </ListItem>
                  <ListItem>
                    <HStack align="start">
                      <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>4</Badge>
                      <Box>
                        <Text fontWeight="medium">{t('scanner.getKeys')}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {t('scanner.getKeysDesc')}
                        </Text>
                      </Box>
                    </HStack>
                  </ListItem>
                </List>

                <Alert status="warning" borderRadius="lg">
                  <AlertIcon />
                  <Box>
                     <AlertTitle>{t('scanner.azureLimits')}</AlertTitle>
                     <AlertDescription fontSize="sm">
                       {t('scanner.azureLimitsDesc')}
                     </AlertDescription>
                   </Box>
                </Alert>
              </VStack>
            </AccordionPanel>
          </Card>
        </AccordionItem>
      </Accordion>
    </Box>
  );
}
