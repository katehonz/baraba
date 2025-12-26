import { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  NativeSelect,
  Card,
  Spinner,
  Flex,
  Badge,
  Code,
  Alert,
  Separator
} from '@chakra-ui/react'
import { FiDownload, FiFile, FiInfo } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { vatApi, type VatFiles, type VatFilesRaw } from '../api/vat'
import { toaster } from '../components/ui/toaster'
const monthNames = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
]

function VatFilesPage() {
  const { selectedCompany, selectedCompanyId } = useCompany()

  const currentDate = new Date()
  const [year, setYear] = useState(currentDate.getFullYear())
  const [month, setMonth] = useState(currentDate.getMonth())

  const [loading, setLoading] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState<VatFiles | null>(null)
  const [rawFiles, setRawFiles] = useState<VatFilesRaw | null>(null)
  const [previewFile, setPreviewFile] = useState<string | null>(null)

  const period = `${year}${String(month + 1).padStart(2, '0')}`

  const handleGenerate = async () => {
    if (!selectedCompanyId) {
      toaster.create({ title: 'Моля изберете фирма', type: 'warning', duration: 3000 })
      return
    }

    setLoading(true)
    setGeneratedFiles(null)
    setRawFiles(null)
    setPreviewFile(null)

    try {
      const result = await vatApi.generate(selectedCompanyId, period)
      setGeneratedFiles(result.files)
      setRawFiles(result.rawFiles)
      toaster.create({
        title: 'Файловете са генерирани успешно',
        description: 'Можете да ги прегледате и изтеглите',
        type: 'success',
        duration: 3000,
      })
    } catch (error: any) {
      toaster.create({
        title: 'Грешка при генериране',
        description: error.message || 'Неуспешно генериране на файлове',
        type: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = (filename: string, bytes: Uint8Array) => {
    const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  const downloadAllAsZip = async () => {
    if (!rawFiles) return

    Object.entries(rawFiles).forEach(([filename, bytes]) => {
      downloadFile(filename, bytes)
    })

    toaster.create({ title: 'Файловете са изтеглени', type: 'success', duration: 2000 })
  }

  const getFileStats = (content: string) => {
    const lines = content.trim().split('\n').filter(l => l.trim())
    return {
      lines: lines.length,
      size: new Blob([content]).size
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i)

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>Моля изберете фирма</Alert.Title>
      </Alert.Root>
    )
  }

  if (!selectedCompany.is_vat_registered) {
    return (
      <Box>
        <Heading size="lg" mb={6}>ДДС файлове за НАП</Heading>
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Title>Фирмата не е регистрирана по ДДС</Alert.Title>
        </Alert.Root>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Card.Root mb={6}>
        <Card.Body>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Box>
              <Heading size="lg" mb={1}>ДДС файлове за НАП</Heading>
              <Text color="#718096">
                Генериране на DEKLAR.TXT, POKUPKI.TXT и PRODAGBI.TXT
              </Text>
            </Box>
            {selectedCompany && (
              <Box textAlign="right">
                <Text fontWeight="bold">{selectedCompany.name}</Text>
                <Text fontSize="sm" color="#718096">
                  ДДС № {selectedCompany.vat_number || `BG${selectedCompany.eik}`}
                </Text>
              </Box>
            )}
          </Flex>
        </Card.Body>
      </Card.Root>

      {/* Period Selection */}
      <Card.Root mb={6}>
        <Card.Header>
          <Heading size="md">Данъчен период</Heading>
        </Card.Header>
        <Card.Body pt={0}>
          <HStack gap={4} flexWrap="wrap" alignItems="flex-end">
            <Box flex="1" minW="150px">
              <Text fontSize="sm" mb={1} fontWeight="medium">Година</Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={year}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setYear(parseInt(e.target.value))}
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Box>
            <Box flex="1" minW="200px">
              <Text fontSize="sm" mb={1} fontWeight="medium">Месец</Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={month}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMonth(parseInt(e.target.value))}
                >
                  {monthNames.map((name, i) => (
                    <option key={i} value={i}>{String(i + 1).padStart(2, '0')} - {name}</option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Box>
            <Button
              colorScheme="blue"
              size="lg"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" mr={2} /> : null}
              Генерирай файлове
            </Button>
          </HStack>

          <Alert.Root status="info" mt={4}>
            <FiInfo style={{ marginRight: '8px' }} />
            <Box>
              <Text fontWeight="medium">Период: {monthNames[month]} {year}</Text>
              <Text fontSize="sm">
                Ще се включат всички осчетоводени документи с ДДС дата в избрания месец
              </Text>
            </Box>
          </Alert.Root>
        </Card.Body>
      </Card.Root>

      {/* Loading */}
      {loading && (
        <Card.Root mb={6}>
          <Card.Body>
            <Flex justify="center" align="center" py={10}>
              <VStack gap={4}>
                <Spinner size="xl" color={{ base: "blue.500", _dark: "blue.400" }} borderWidth="4px" />
                <Text color={{ base: "#718096", _dark: "gray.400" }}>Генериране на файлове...</Text>
              </VStack>
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {/* Generated Files */}
      {generatedFiles && !loading && (
        <VStack gap={6} align="stretch">
          {/* Download All */}
          <Card.Root>
            <Card.Body>
              <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                <Box>
                  <Text fontWeight="bold" fontSize="lg">Готови файлове</Text>
                  <Text fontSize="sm" color="#718096">
                    Период: {monthNames[month]} {year} ({period})
                  </Text>
                </Box>
                <Button
                  colorScheme="green"
                  size="lg"
                  onClick={downloadAllAsZip}
                >
                  <FiDownload style={{ marginRight: '8px' }} /> Изтегли всички
                </Button>
              </Flex>
            </Card.Body>
          </Card.Root>

          {/* File Cards */}
          <HStack gap={4} flexWrap="wrap">
            {Object.entries(generatedFiles).map(([filename, content]) => {
              const stats = getFileStats(content)
              const isSelected = previewFile === filename

              return (
                <Card.Root
                  key={filename}
                  borderWidth="2px"
                  borderColor={isSelected ? 'blue.500' : 'gray.200'}
                  cursor="pointer"
                  onClick={() => setPreviewFile(isSelected ? null : filename)}
                  _hover={{ borderColor: 'blue.300' }}
                  transition="all 0.2s"
                  flex="1"
                  minW="250px"
                >
                  <Card.Body>
                    <VStack gap={3} align="stretch">
                      <HStack justify="space-between">
                        <HStack>
                          <Box color={{ base: "blue.500", _dark: "blue.400" }}>
                            <FiFile size={24} />
                          </Box>
                          <Text fontWeight="bold" fontFamily="mono">{filename}</Text>
                        </HStack>
                        <Badge colorPalette={stats.lines > 0 ? 'green' : 'gray'}>
                          {stats.lines} {stats.lines === 1 ? 'ред' : 'реда'}
                        </Badge>
                      </HStack>

                      <Text fontSize="sm" color="#718096">
                        {filename === 'DEKLAR.TXT' && 'Справка-декларация'}
                        {filename === 'POKUPKI.TXT' && 'Дневник на покупките'}
                        {filename === 'PRODAGBI.TXT' && 'Дневник на продажбите'}
                      </Text>

                      <Separator />

                      <HStack justify="space-between">
                        <Text fontSize="xs" color="#a0aec0">
                          {(stats.size / 1024).toFixed(1)} KB
                        </Text>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (rawFiles) {
                              downloadFile(filename, rawFiles[filename as keyof VatFilesRaw])
                            }
                          }}
                        >
                          <FiDownload size={16} /> Изтегли
                        </Button>
                      </HStack>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              )
            })}
          </HStack>

          {/* File Preview */}
          {previewFile && generatedFiles[previewFile as keyof VatFiles] && (
            <Card.Root>
              <Card.Header>
                <Flex justify="space-between" align="center">
                  <HStack>
                    <Box color={{ base: "blue.500", _dark: "blue.400" }}>
                      <FiFile />
                    </Box>
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
              </Card.Header>
              <Card.Body pt={0}>
                <Box
                  bg="#f7fafc"
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
                <Text fontSize="xs" color="#a0aec0" mt={2}>
                  * Файлът е в Windows-1251 кодиране за съвместимост с НАП
                </Text>
              </Card.Body>
            </Card.Root>
          )}

          {/* Help */}
          <Card.Root>
            <Card.Body>
              <Alert.Root status="info">
                <FiInfo style={{ marginRight: '8px' }} />
                <Box>
                  <Text fontWeight="medium">Инструкции за подаване</Text>
                  <Text fontSize="sm" mt={1}>
                    1. Изтеглете файловете и ги запазете в една папка<br/>
                    2. Влезте в портала на НАП (portal.nap.bg)<br/>
                    3. Изберете "Подаване на декларации" → "ДДС"<br/>
                    4. Качете трите файла (DEKLAR.TXT, POKUPKI.TXT, PRODAGBI.TXT)
                  </Text>
                </Box>
              </Alert.Root>
            </Card.Body>
          </Card.Root>
        </VStack>
      )}
    </Box>
  )
}

export default VatFilesPage
