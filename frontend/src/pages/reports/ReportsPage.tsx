import { useState, useMemo, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Flex,
  Button,
  VStack,
  HStack,
  Spinner,
  useColorModeValue,
  Link,
  Select,
  Input,
  Checkbox,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import { reportsApi } from '../../api/reports';
import { accountsApi } from '../../api/accounts';
import { useCompany } from '../../contexts/CompanyContext';
import type { Account } from '../../types';

type ReportType = 'turnover' | 'generalLedger';

interface ReportConfig {
  id: ReportType;
  name: string;
  description: string;
  icon: string;
}

const REPORT_TYPES: ReportConfig[] = [
  {
    id: 'turnover',
    name: 'Оборотна ведомост',
    description: 'Обобщена справка за обороти и салда по сметки',
    icon: '~',
  },
  {
    id: 'generalLedger',
    name: 'Главна книга',
    description: 'Детайлна справка по сметки с всички движения',
    icon: '#',
  },
];

const PERIOD_PRESETS = [
  { id: 'currentMonth', name: 'Текущ месец' },
  { id: 'lastMonth', name: 'Предходен месец' },
  { id: 'currentQuarter', name: 'Текущо тримесечие' },
  { id: 'lastQuarter', name: 'Предходно тримесечие' },
  { id: 'currentYear', name: 'Текуща година' },
  { id: 'lastYear', name: 'Предходна година' },
  { id: 'custom', name: 'Избор на период' },
];

function getPresetDates(presetId: string): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (presetId) {
    case 'currentMonth':
      return {
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0],
      };
    case 'lastMonth':
      return {
        startDate: new Date(year, month - 1, 1).toISOString().split('T')[0],
        endDate: new Date(year, month, 0).toISOString().split('T')[0],
      };
    case 'currentQuarter': {
      const quarterStart = Math.floor(month / 3) * 3;
      return {
        startDate: new Date(year, quarterStart, 1).toISOString().split('T')[0],
        endDate: new Date(year, quarterStart + 3, 0).toISOString().split('T')[0],
      };
    }
    case 'lastQuarter': {
      const lastQuarterStart = Math.floor(month / 3) * 3 - 3;
      const lastQuarterYear = lastQuarterStart < 0 ? year - 1 : year;
      const adjustedStart = lastQuarterStart < 0 ? lastQuarterStart + 12 : lastQuarterStart;
      return {
        startDate: new Date(lastQuarterYear, adjustedStart, 1).toISOString().split('T')[0],
        endDate: new Date(lastQuarterYear, adjustedStart + 3, 0).toISOString().split('T')[0],
      };
    }
    case 'currentYear':
      return {
        startDate: new Date(year, 0, 1).toISOString().split('T')[0],
        endDate: new Date(year, 11, 31).toISOString().split('T')[0],
      };
    case 'lastYear':
      return {
        startDate: new Date(year - 1, 0, 1).toISOString().split('T')[0],
        endDate: new Date(year - 1, 11, 31).toISOString().split('T')[0],
      };
    default:
      return {
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0],
      };
  }
}

export default function Reports() {
  const { companyId } = useCompany();
  const [selectedReport, setSelectedReport] = useState<ReportType>('turnover');
  const [periodPreset, setPeriodPreset] = useState('currentMonth');
  const [startDate, setStartDate] = useState(() => getPresetDates('currentMonth').startDate);
  const [endDate, setEndDate] = useState(() => getPresetDates('currentMonth').endDate);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [accountCodeDepth, setAccountCodeDepth] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (companyId) {
      accountsApi.getByCompany(companyId).then(setAccounts);
    }
  }, [companyId]);

  const handlePresetChange = (preset: string) => {
    setPeriodPreset(preset);
    if (preset !== 'custom') {
      const { startDate: newStart, endDate: newEnd } = getPresetDates(preset);
      setStartDate(newStart);
      setEndDate(newEnd);
    }
  };

  const handleGenerateReport = async () => {
    if (!companyId) return;

    setIsLoading(true);
    setReportData(null);

    try {
      if (selectedReport === 'turnover') {
        const data = await reportsApi.getTurnoverSheet({
          companyId: companyId,
          fromDate: startDate,
          toDate: endDate,
          showZeroBalances: showZeroBalances,
          accountCodeDepth: accountCodeDepth || undefined,
        });
        setReportData(data);
      } else if (selectedReport === 'generalLedger') {
        if (!selectedAccountId) {
          alert('Моля, изберете сметка за този отчет');
          setIsLoading(false);
          return;
        }
        const data = await reportsApi.getGeneralLedger({
          companyId: companyId,
          accountId: parseInt(selectedAccountId, 10),
          fromDate: startDate,
          toDate: endDate,
        });
        setReportData(data);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Грешка при генериране на отчет');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (selectedReport) {
      case 'turnover':
        const ts = reportData;
        return (
          <Box bg={cardBg} borderRadius="lg" shadow="sm" overflow="hidden">
            <Box px={6} py={4} borderBottom="1px" borderColor={borderColor} bg={useColorModeValue('gray.50', 'gray.700')}>
              <Heading size="md">Оборотна ведомост</Heading>
              <Text fontSize="sm" color="gray.500">
                {ts.companyName} | Период: {ts.fromDate} - {ts.toDate}
              </Text>
            </Box>
            <TableContainer>
              <Table size="sm">
                <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                  <Tr>
                    <Th>Сметка</Th>
                    <Th isNumeric colSpan={2}>Начално салдо</Th>
                    <Th isNumeric colSpan={2}>Обороти</Th>
                    <Th isNumeric colSpan={2}>Крайно салдо</Th>
                  </Tr>
                  <Tr bg={useColorModeValue('gray.100', 'gray.600')}>
                    <Th fontSize="xs">Код / Наименование</Th>
                    <Th fontSize="xs" isNumeric>Дебит</Th>
                    <Th fontSize="xs" isNumeric>Кредит</Th>
                    <Th fontSize="xs" isNumeric>Дебит</Th>
                    <Th fontSize="xs" isNumeric>Кредит</Th>
                    <Th fontSize="xs" isNumeric>Дебит</Th>
                    <Th fontSize="xs" isNumeric>Кредит</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {ts.accounts.map((entry: any, idx: number) => (
                    <Tr key={idx} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                      <Td>
                        <Text as="span" fontFamily="mono" fontWeight="medium" color="gray.700">{entry.code}</Text>
                        <Text as="span" ml={2} color="gray.600">{entry.name}</Text>
                      </Td>
                      <Td isNumeric fontFamily="mono">{formatAmount(entry.openingDebit)}</Td>
                      <Td isNumeric fontFamily="mono">{formatAmount(entry.openingCredit)}</Td>
                      <Td isNumeric fontFamily="mono">{formatAmount(entry.periodDebit)}</Td>
                      <Td isNumeric fontFamily="mono">{formatAmount(entry.periodCredit)}</Td>
                      <Td isNumeric fontFamily="mono">{formatAmount(entry.closingDebit)}</Td>
                      <Td isNumeric fontFamily="mono">{formatAmount(entry.closingCredit)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 'generalLedger':
        const gl = reportData;
        return (
          <Box bg={cardBg} borderRadius="lg" shadow="sm" overflow="hidden">
            <Box px={6} py={4} borderBottom="1px" borderColor={borderColor} bg={useColorModeValue('gray.50', 'gray.700')}>
              <Heading size="md">Главна книга</Heading>
              <Text fontSize="sm" color="gray.500">
                {gl.account.name} | Период: {gl.fromDate} - {gl.toDate}
              </Text>
            </Box>
            <TableContainer>
              <Table size="sm">
                <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                  <Tr>
                    <Th>Дата</Th>
                    <Th>Документ</Th>
                    <Th>Описание</Th>
                    <Th isNumeric>Дебит</Th>
                    <Th isNumeric>Кредит</Th>
                    <Th isNumeric>Салдо</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {gl.transactions.map((entry: any, idx: number) => (
                    <Tr key={idx} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                      <Td>{new Date(entry.date).toLocaleDateString('bg-BG')}</Td>
                      <Td>{entry.documentNumber || entry.entryNumber}</Td>
                      <Td color="gray.600">{entry.description}</Td>
                      <Td isNumeric fontFamily="mono">{formatAmount(entry.debit)}</Td>
                      <Td isNumeric fontFamily="mono">{formatAmount(entry.credit)}</Td>
                      <Td isNumeric fontFamily="mono" fontWeight="semibold">{formatAmount(entry.balance)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        );
      default:
        return null;
    }
  };

  const hasReportData = useMemo(() => !!reportData, [reportData]);

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box>
        <Heading size="lg">Отчети</Heading>
        <Text mt={1} fontSize="sm" color="gray.500">
          Генериране на счетоводни справки и отчети
        </Text>
      </Box>

      {/* Report Selection */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        {REPORT_TYPES.map((report) => (
          <Box
            key={report.id}
            as="button"
            onClick={() => setSelectedReport(report.id)}
            p={4}
            borderRadius="lg"
            border="2px"
            borderColor={selectedReport === report.id ? 'blue.500' : borderColor}
            bg={selectedReport === report.id ? 'blue.50' : cardBg}
            textAlign="left"
            transition="all 0.2s"
            _hover={{ borderColor: 'blue.300' }}
          >
            <Text fontSize="2xl" mb={2}>{report.icon}</Text>
            <Text fontWeight="semibold">{report.name}</Text>
            <Text fontSize="sm" color="gray.500" mt={1}>{report.description}</Text>
          </Box>
        ))}
        <Link as={RouterLink} to="/reports/counterparts" _hover={{ textDecoration: 'none' }}>
          <Box p={4} borderRadius="lg" border="2px" borderColor={borderColor} bg={cardBg} h="full" _hover={{ borderColor: 'gray.300' }}>
            <Text fontSize="2xl" mb={2}>@</Text>
            <Text fontWeight="semibold">Справки по контрагенти</Text>
            <Text fontSize="sm" color="gray.500" mt={1}>Обобщена справка за обороти по контрагенти</Text>
          </Box>
        </Link>
        <Link as={RouterLink} to="/reports/audit-logs" _hover={{ textDecoration: 'none' }}>
          <Box p={4} borderRadius="lg" border="2px" borderColor={borderColor} bg={cardBg} h="full" _hover={{ borderColor: 'gray.300' }}>
            <Text fontSize="2xl" mb={2}>!</Text>
            <Text fontWeight="semibold">Одит лог</Text>
            <Text fontSize="sm" color="gray.500" mt={1}>Проследяване на действията на потребителите</Text>
          </Box>
        </Link>
        <Link as={RouterLink} to="/reports/monthly-stats" _hover={{ textDecoration: 'none' }}>
          <Box p={4} borderRadius="lg" border="2px" borderColor={borderColor} bg={cardBg} h="full" _hover={{ borderColor: 'gray.300' }}>
            <Text fontSize="2xl" mb={2}>^</Text>
            <Text fontWeight="semibold">Месечна статистика</Text>
            <Text fontSize="sm" color="gray.500" mt={1}>Справка за ценообразуване</Text>
          </Box>
        </Link>
      </SimpleGrid>

      {/* Filters */}
      <Box bg={cardBg} borderRadius="lg" shadow="sm" p={6}>
        <Heading size="md" mb={4}>Параметри на отчета</Heading>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Период</Text>
            <Select value={periodPreset} onChange={(e) => handlePresetChange(e.target.value)} size="sm">
              {PERIOD_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </Select>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>От дата</Text>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPeriodPreset('custom'); }}
              size="sm"
            />
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>До дата</Text>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriodPreset('custom'); }}
              size="sm"
            />
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Сметка (опционално)</Text>
            <Select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} size="sm">
              <option value="">Всички сметки</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
              ))}
            </Select>
          </Box>
        </SimpleGrid>

        {selectedReport === 'turnover' && (
          <HStack mt={4} pt={4} borderTop="1px" borderColor={borderColor} spacing={6} wrap="wrap">
            <Checkbox isChecked={showZeroBalances} onChange={(e) => setShowZeroBalances(e.target.checked)}>
              <Text fontSize="sm">Показвай нулеви салда</Text>
            </Checkbox>

            <HStack>
              <Text fontSize="sm">Ниво на агрегация:</Text>
              <Select
                value={accountCodeDepth || ''}
                onChange={(e) => setAccountCodeDepth(e.target.value ? parseInt(e.target.value) : null)}
                size="sm"
                w="auto"
              >
                <option value="">Всички нива</option>
                <option value="1">1 символ</option>
                <option value="2">2 символа</option>
                <option value="3">3 символа</option>
                <option value="4">4 символа</option>
              </Select>
            </HStack>
          </HStack>
        )}

        <Box mt={6}>
          <Button colorScheme="blue" onClick={handleGenerateReport} isLoading={isLoading}>
            Генерирай отчет
          </Button>
        </Box>
      </Box>

      {/* Report Content */}
      {isLoading && (
        <Flex align="center" justify="center" h="64">
          <Spinner size="lg" color="blue.500" />
        </Flex>
      )}

      {!isLoading && renderReportContent()}

      {!isLoading && !hasReportData && (
        <Box bg={cardBg} borderRadius="lg" shadow="sm" p={12} textAlign="center">
          <Text fontSize="4xl" mb={4}>~</Text>
          <Text color="gray.500">Изберете параметри и натиснете "Генерирай отчет"</Text>
        </Box>
      )}
    </VStack>
  );
}
