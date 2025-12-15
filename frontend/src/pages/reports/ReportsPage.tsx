import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    icon: '📊',
  },
  {
    id: 'generalLedger',
    name: 'Главна книга',
    description: 'Детайлна справка по сметки с всички движения',
    icon: '📖',
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

  // Render report content based on selected type
  const renderReportContent = () => {
    if (!reportData) return null;

    switch (selectedReport) {
      case 'turnover':
        const ts = reportData;
        return (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Оборотна ведомост</h3>
              <p className="text-sm text-gray-500">
                {ts.companyName} | Период: {ts.fromDate} - {ts.toDate}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сметка</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" colSpan={2}>Начално салдо</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" colSpan={2}>Обороти</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" colSpan={2}>Крайно салдо</th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Код / Наименование</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Дебит</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Кредит</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Дебит</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Кредит</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Дебит</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Кредит</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ts.accounts.map((entry: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        <span className="font-mono font-medium text-gray-700">{entry.code}</span>
                        <span className="ml-2 text-gray-600">{entry.name}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{formatAmount(entry.openingDebit)}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{formatAmount(entry.openingCredit)}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{formatAmount(entry.periodDebit)}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{formatAmount(entry.periodCredit)}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{formatAmount(entry.closingDebit)}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{formatAmount(entry.closingCredit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'generalLedger':
        const gl = reportData;
        return (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Главна книга</h3>
              <p className="text-sm text-gray-500">
                {gl.account.name} | Период: {gl.fromDate} - {gl.toDate}
              </p>
            </div>
            <div className="divide-y divide-gray-200">
                <div className="bg-white">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Дата</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Документ</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Описание</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Дебит</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Кредит</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Салдо</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {gl.transactions.map((entry: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{new Date(entry.date).toLocaleDateString('bg-BG')}</td>
                            <td className="px-4 py-2 text-sm">{entry.documentNumber || entry.entryNumber}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{entry.description}</td>
                            <td className="px-4 py-2 text-sm text-right font-mono">{formatAmount(entry.debit)}</td>
                            <td className="px-4 py-2 text-sm text-right font-mono">{formatAmount(entry.credit)}</td>
                            <td className="px-4 py-2 text-sm text-right font-mono font-semibold">{formatAmount(entry.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const hasReportData = useMemo(() => !!reportData, [reportData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Отчети</h1>
          <p className="mt-1 text-sm text-gray-500">
            Генериране на счетоводни справки и отчети
          </p>
        </div>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedReport === report.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-2">{report.icon}</div>
            <h3 className="font-semibold text-gray-900">{report.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{report.description}</p>
          </button>
        ))}
        <Link to="/reports/counterparts" className="p-4 rounded-lg border-2 text-left transition-all border-gray-200 bg-white hover:border-gray-300">
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-semibold text-gray-900">Справки по контрагенти</h3>
            <p className="text-sm text-gray-500 mt-1">Обобщена справка за обороти по контрагенти</p>
        </Link>
        <Link to="/reports/audit-logs" className="p-4 rounded-lg border-2 text-left transition-all border-gray-200 bg-white hover:border-gray-300">
            <div className="text-2xl mb-2">🛡️</div>
            <h3 className="font-semibold text-gray-900">Одит лог</h3>
            <p className="text-sm text-gray-500 mt-1">Проследяване на действията на потребителите</p>
        </Link>
        <Link to="/reports/monthly-stats" className="p-4 rounded-lg border-2 text-left transition-all border-gray-200 bg-white hover:border-gray-300">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-semibold text-gray-900">Месечна статистика</h3>
            <p className="text-sm text-gray-500 mt-1">Справка за ценообразуване</p>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Параметри на отчета</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Period Preset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Период</label>
            <select
              value={periodPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {PERIOD_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">От дата</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">До дата</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сметка (опционално)</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Всички сметки</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional options for Turnover Sheet */}
        {selectedReport === 'turnover' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showZeroBalances}
                  onChange={(e) => setShowZeroBalances(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Показвай нулеви салда</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Ниво на агрегация:</label>
                <select
                  value={accountCodeDepth || ''}
                  onChange={(e) => setAccountCodeDepth(e.target.value ? parseInt(e.target.value) : null)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Всички нива</option>
                  <option value="1">1 символ</option>
                  <option value="2">2 символа</option>
                  <option value="3">3 символа</option>
                  <option value="4">4 символа</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Зареждане...' : 'Генерирай отчет'}
          </button>
        </div>
      </div>

      {/* Report Content */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!isLoading && renderReportContent()}

      {!isLoading && !hasReportData && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <p>Изберете параметри и натиснете "Генерирай отчет"</p>
        </div>
      )}
    </div>
  );
}
