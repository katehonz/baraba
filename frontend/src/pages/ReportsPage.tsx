import { useState } from 'react'
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  Button,
  Flex,
  Alert,
  Tabs,
  Input,
  HStack,
  Badge,
  Stack
} from '@chakra-ui/react'
import { FiFileText, FiDownload, FiPieChart, FiList, FiCalendar, FiBook, FiTrendingUp, FiDatabase } from 'react-icons/fi'
import { useCompany } from '../contexts/CompanyContext'
import { apiClient } from '../api/client'
import { toaster } from '../components/ui/toaster'

interface ReportDefinition {
  id: string
  title: string
  titleBg: string
  description: string
  icon: any
  category: 'current' | 'standard' | 'statistics' | 'nap'
  hasDateRange?: boolean
  hasAccountFilter?: boolean
}

const REPORTS: ReportDefinition[] = [
  // Current Reports (Текущи справки) - WORKING
  {
    id: 'counterparts',
    title: 'Counterparts Report',
    titleBg: 'Справка контрагенти',
    description: 'Списък на контрагентите и техните данни',
    icon: FiDatabase,
    category: 'current'
  },
  {
    id: 'trial_balance',
    title: 'Trial Balance (Simple)',
    titleBg: 'Оборотна ведомост (проста)',
    description: 'Дебит, кредит и салдо по сметки',
    icon: FiList,
    category: 'current',
    hasDateRange: true
  },
  {
    id: 'trial_balance_6col',
    title: 'Trial Balance (6 columns)',
    titleBg: 'Оборотна ведомост (6 колони)',
    description: 'Начално салдо, обороти и крайно салдо по сметки',
    icon: FiList,
    category: 'current',
    hasDateRange: true
  },
  {
    id: 'journal_entries',
    title: 'Journal Entries',
    titleBg: 'Счетоводни записвания',
    description: 'Списък на всички счетоводни операции',
    icon: FiFileText,
    category: 'current',
    hasDateRange: true
  },
  {
    id: 'journal_chronological',
    title: 'Chronological Journal',
    titleBg: 'Хронологична справка',
    description: 'Всички счетоводни записвания по хронологичен ред',
    icon: FiBook,
    category: 'current',
    hasDateRange: true,
    hasAccountFilter: true
  },

  // Standard Reports (Стандартни отчети) - WORKING
  {
    id: 'income_statement',
    title: 'Income Statement',
    titleBg: 'Отчет за приходи и разходи',
    description: 'Приходи и разходи за периода',
    icon: FiTrendingUp,
    category: 'standard',
    hasDateRange: true
  },
  {
    id: 'balance_sheet_new',
    title: 'Balance Sheet',
    titleBg: 'Баланс',
    description: 'Активи, пасиви и собствен капитал',
    icon: FiPieChart,
    category: 'standard',
    hasDateRange: true
  }
]

interface ReportCardProps {
  report: ReportDefinition
  dateFrom: string
  dateTo: string
  accountCode: string
  onGenerate: (reportId: string, format: string, params: Record<string, any>) => void
  loading: boolean
}

function ReportCard({ report, dateFrom, dateTo, accountCode, onGenerate, loading }: ReportCardProps) {
  const buildParams = () => {
    const params: Record<string, any> = {}
    if (report.hasDateRange) {
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
    }
    if (report.hasAccountFilter && accountCode) {
      params.account_code = accountCode
    }
    return params
  }

  return (
    <Card.Root>
      <Card.Body>
        <Flex align="flex-start" gap={4}>
          <Box p={3} bg="#bee3f8" borderRadius="lg">
            <report.icon size={24} color="var(--chakra-colors-blue-600)" />
          </Box>
          <Box flex={1}>
            <Heading size="md" mb={1}>{report.titleBg}</Heading>
            <Text color="#718096" fontSize="xs" mb={1}>{report.title}</Text>
            <Text color="#718096" fontSize="sm" mb={3}>{report.description}</Text>
            {report.hasDateRange && (
              <Badge colorPalette="green" size="sm" mb={3}>
                <FiCalendar style={{ marginRight: 4 }} />
                Поддържа период
              </Badge>
            )}
            <Flex gap={2} wrap="wrap">
              <Button
                size="sm"
                colorPalette="blue"
                onClick={() => onGenerate(report.id, 'pdf', buildParams())}
                loading={loading}
              >
                <FiDownload /> PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGenerate(report.id, 'xlsx', buildParams())}
                loading={loading}
              >
                <FiDownload /> Excel
              </Button>
            </Flex>
          </Box>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

function ReportsPage() {
  const { selectedCompany, selectedCompanyId } = useCompany()
  const [loading, setLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('current')

  // Date filters
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [dateFrom, setDateFrom] = useState<string>(firstDayOfMonth.toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState<string>(today.toISOString().split('T')[0])
  const [accountCode, setAccountCode] = useState<string>('')

  const handleGenerateReport = async (reportId: string, format: string, params: Record<string, any>) => {
    if (!selectedCompanyId) {
      console.error('No selected company ID')
      return
    }

    setLoading(reportId)
    try {
      const fullParams = { company_id: selectedCompanyId, ...params }
      console.log('Sending report request:', { reportId, format, fullParams })
      const blob = await apiClient.generateReport(reportId, fullParams, format)

      // Download the file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `${reportId}_${dateStr}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toaster.create({ title: 'Отчетът е генериран', type: 'success' })
    } catch (err: any) {
      toaster.create({
        title: 'Грешка',
        description: err.error || 'Неуспешно генериране на отчет',
        type: 'error'
      })
    } finally {
      setLoading(null)
    }
  }

  if (!selectedCompany) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>Моля изберете фирма</Alert.Title>
      </Alert.Root>
    )
  }

  const filterReports = (category: string) => REPORTS.filter(r => r.category === category)

  const tabConfigs = [
    { value: 'current', label: 'Текущи справки', count: filterReports('current').length },
    { value: 'standard', label: 'Стандартни отчети', count: filterReports('standard').length },
    { value: 'statistics', label: 'Статистика', count: filterReports('statistics').length },
    { value: 'nap', label: 'НАП', count: filterReports('nap').length }
  ]

  return (
    <Box>
      <Box mb={6}>
        <Heading size="lg">Справки и отчети</Heading>
        <Text color="#718096">{selectedCompany.name}</Text>
      </Box>

      {/* Date Range Filters */}
      <Card.Root mb={6}>
        <Card.Body>
          <Stack direction={{ base: 'column', md: 'row' }} gap={4} align="flex-end">
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>От дата</Text>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                size="sm"
              />
            </Box>
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>До дата</Text>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                size="sm"
              />
            </Box>
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>Сметка (по избор)</Text>
              <Input
                placeholder="напр. 401"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                size="sm"
              />
            </Box>
            <HStack>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const startOfYear = new Date(today.getFullYear(), 0, 1)
                  setDateFrom(startOfYear.toISOString().split('T')[0])
                  setDateTo(today.toISOString().split('T')[0])
                }}
              >
                Тази година
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDateFrom(firstDayOfMonth.toISOString().split('T')[0])
                  setDateTo(today.toISOString().split('T')[0])
                }}
              >
                Този месец
              </Button>
            </HStack>
          </Stack>
        </Card.Body>
      </Card.Root>

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(details) => setActiveTab(details.value)}
        variant="enclosed"
      >
        <Tabs.List mb={4}>
          {tabConfigs.map(tab => (
            <Tabs.Trigger key={tab.value} value={tab.value}>
              {tab.label}
              <Badge ml={2} colorPalette="blue" size="sm">{tab.count}</Badge>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {tabConfigs.map(tab => (
          <Tabs.Content key={tab.value} value={tab.value}>
            {filterReports(tab.value).length === 0 ? (
              <Alert.Root status="info">
                <Alert.Indicator />
                <Alert.Title>Няма налични отчети в тази категория</Alert.Title>
              </Alert.Root>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                {filterReports(tab.value).map(report => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    accountCode={accountCode}
                    onGenerate={handleGenerateReport}
                    loading={loading === report.id}
                  />
                ))}
              </SimpleGrid>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Box>
  )
}

export default ReportsPage
