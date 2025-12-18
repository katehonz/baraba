import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Select,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  useColorModeValue,
  useToast,
  Spinner,
  Icon,
  Flex,
  Alert,
  AlertIcon,
  Divider,
  Badge,
  Code,
} from '@chakra-ui/react';
import { useCompany } from '../../contexts/CompanyContext';
import { vatApi, type VatFiles, type VatFilesRaw } from '../../api/vat';

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>
);

const monthNames = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
];

export default function VATFilesPage() {
  const { companyId, currentCompany } = useCompany();
  const toast = useToast();

  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth()); // Previous month by default

  const [loading, setLoading] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<VatFiles | null>(null);
  const [rawFiles, setRawFiles] = useState<VatFilesRaw | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const codeBg = useColorModeValue('gray.50', 'gray.900');

  const period = `${year}${String(month + 1).padStart(2, '0')}`;

  const handleGenerate = async () => {
    if (!companyId) {
      toast({ title: 'Моля изберете фирма', status: 'warning' });
      return;
    }

    setLoading(true);
    setGeneratedFiles(null);
    setRawFiles(null);
    setPreviewFile(null);

    try {
      // Get both UTF-8 (for display) and raw bytes (for download)
      const result = await vatApi.generate(companyId, period);
      setGeneratedFiles(result.files);
      setRawFiles(result.rawFiles);
      toast({
        title: 'Файловете са генерирани успешно',
        description: 'Можете да ги прегледате и изтеглите',
        status: 'success'
      });
    } catch (error: any) {
      toast({
        title: 'Грешка при генериране',
        description: error.message || 'Неуспешно генериране на файлове',
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (filename: string, bytes: Uint8Array) => {
    // Download raw Windows-1251 bytes
    const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const downloadAllAsZip = async () => {
    if (!rawFiles) return;

    // Download each file separately (for simplicity without JSZip)
    Object.entries(rawFiles).forEach(([filename, bytes]) => {
      downloadFile(filename, bytes);
    });

    toast({ title: 'Файловете са изтеглени', status: 'success' });
  };

  const getFileStats = (content: string) => {
    const lines = content.trim().split('\n').filter(l => l.trim());
    return {
      lines: lines.length,
      size: new Blob([content]).size
    };
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <Box maxW="5xl" mx="auto">
      {/* Header */}
      <Card bg={cardBg} mb={6}>
        <CardBody>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg" mb={1}>ДДС файлове за НАП</Heading>
              <Text color="gray.500">
                Генериране на DEKLAR.TXT, POKUPKI.TXT и PRODAGBI.TXT
              </Text>
            </Box>
            {currentCompany && (
              <Box textAlign="right">
                <Text fontWeight="bold">{currentCompany.name}</Text>
                <Text fontSize="sm" color="gray.500">
                  ДДС № {currentCompany.vatNumber || `BG${currentCompany.eik}`}
                </Text>
              </Box>
            )}
          </Flex>
        </CardBody>
      </Card>

      {/* Period Selection */}
      <Card bg={cardBg} mb={6}>
        <CardHeader>
          <Heading size="md">Данъчен период</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} alignItems="end">
            <FormControl>
              <FormLabel>Година</FormLabel>
              <Select value={year} onChange={e => setYear(parseInt(e.target.value))}>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Месец</FormLabel>
              <Select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                {monthNames.map((name, i) => (
                  <option key={i} value={i}>{String(i + 1).padStart(2, '0')} - {name}</option>
                ))}
              </Select>
            </FormControl>
            <Button
              colorScheme="brand"
              size="lg"
              onClick={handleGenerate}
              isLoading={loading}
              loadingText="Генериране..."
            >
              Генерирай файлове
            </Button>
          </SimpleGrid>

          <Alert status="info" mt={4} borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="medium">Период: {monthNames[month]} {year}</Text>
              <Text fontSize="sm">
                Ще се включат всички осчетоводени документи с ДДС дата в избрания месец
              </Text>
            </Box>
          </Alert>
        </CardBody>
      </Card>

      {/* Loading */}
      {loading && (
        <Card bg={cardBg} mb={6}>
          <CardBody>
            <Flex justify="center" align="center" py={12}>
              <VStack spacing={4}>
                <Spinner size="xl" color="brand.500" thickness="4px" />
                <Text color="gray.500">Генериране на файлове...</Text>
              </VStack>
            </Flex>
          </CardBody>
        </Card>
      )}

      {/* Generated Files */}
      {generatedFiles && !loading && (
        <VStack spacing={6} align="stretch">
          {/* Download All */}
          <Card bg={cardBg}>
            <CardBody>
              <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
                <Box>
                  <Text fontWeight="bold" fontSize="lg">Готови файлове</Text>
                  <Text fontSize="sm" color="gray.500">
                    Период: {monthNames[month]} {year} ({period})
                  </Text>
                </Box>
                <Button
                  colorScheme="green"
                  size="lg"
                  leftIcon={<Icon as={DownloadIcon} />}
                  onClick={downloadAllAsZip}
                >
                  Изтегли всички
                </Button>
              </Flex>
            </CardBody>
          </Card>

          {/* File Cards */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {Object.entries(generatedFiles).map(([filename, content]) => {
              const stats = getFileStats(content);
              const isSelected = previewFile === filename;

              return (
                <Card
                  key={filename}
                  bg={cardBg}
                  borderWidth="2px"
                  borderColor={isSelected ? 'brand.500' : borderColor}
                  cursor="pointer"
                  onClick={() => setPreviewFile(isSelected ? null : filename)}
                  _hover={{ borderColor: 'brand.300' }}
                  transition="all 0.2s"
                >
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <HStack>
                          <Icon as={FileIcon} color="brand.500" boxSize={6} />
                          <Text fontWeight="bold" fontFamily="mono">{filename}</Text>
                        </HStack>
                        <Badge colorScheme={stats.lines > 0 ? 'green' : 'gray'}>
                          {stats.lines} {stats.lines === 1 ? 'ред' : 'реда'}
                        </Badge>
                      </HStack>

                      <Text fontSize="sm" color="gray.500">
                        {filename === 'DEKLAR.TXT' && 'Справка-декларация'}
                        {filename === 'POKUPKI.TXT' && 'Дневник на покупките'}
                        {filename === 'PRODAGBI.TXT' && 'Дневник на продажбите'}
                      </Text>

                      <Divider />

                      <HStack justify="space-between">
                        <Text fontSize="xs" color="gray.400">
                          {(stats.size / 1024).toFixed(1)} KB
                        </Text>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Icon as={DownloadIcon} boxSize={4} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (rawFiles) {
                              downloadFile(filename, rawFiles[filename as keyof VatFilesRaw]);
                            }
                          }}
                        >
                          Изтегли
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              );
            })}
          </SimpleGrid>

          {/* File Preview */}
          {previewFile && generatedFiles[previewFile as keyof VatFiles] && (
            <Card bg={cardBg}>
              <CardHeader>
                <Flex justify="space-between" align="center">
                  <HStack>
                    <Icon as={FileIcon} color="brand.500" />
                    <Heading size="md">{previewFile}</Heading>
                  </HStack>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewFile(null)}
                  >
                    Затвори
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody pt={0}>
                <Box
                  bg={codeBg}
                  borderRadius="md"
                  p={4}
                  overflowX="auto"
                  maxH="400px"
                  overflowY="auto"
                >
                  <Code
                    display="block"
                    whiteSpace="pre"
                    fontFamily="mono"
                    fontSize="xs"
                    bg="transparent"
                  >
                    {generatedFiles[previewFile as keyof VatFiles]}
                  </Code>
                </Box>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  * Файлът е в Windows-1251 кодиране за съвместимост с НАП
                </Text>
              </CardBody>
            </Card>
          )}

          {/* Help */}
          <Card bg={cardBg}>
            <CardBody>
              <Alert status="info" variant="subtle" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontWeight="medium">Инструкции за подаване</Text>
                  <Text fontSize="sm" mt={1}>
                    1. Изтеглете файловете и ги запазете в една папка<br/>
                    2. Влезте в портала на НАП (portal.nap.bg)<br/>
                    3. Изберете "Подаване на декларации" → "ДДС"<br/>
                    4. Качете трите файла (DEKLAR.TXT, POKUPKI.TXT, PRODAGBI.TXT)
                  </Text>
                </Box>
              </Alert>
            </CardBody>
          </Card>
        </VStack>
      )}

      {/* No Company Selected */}
      {!companyId && (
        <Card bg={cardBg}>
          <CardBody py={12} textAlign="center">
            <Text color="gray.500" mb={4}>
              Моля изберете фирма от менюто, за да генерирате ДДС файлове
            </Text>
          </CardBody>
        </Card>
      )}
    </Box>
  );
}
