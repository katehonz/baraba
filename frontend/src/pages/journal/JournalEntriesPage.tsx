
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { journalApi } from '../../api/journal';
import { useCompany } from '../../contexts/CompanyContext';
import { JournalEntry } from '../../types';

// Check if entry is from VAT form (has documentType like '01', '02', etc.)
const isVatEntry = (entry: JournalEntry): boolean => {
  return !!entry.documentType && /^\d{2}$/.test(entry.documentType);
};

export default function JournalEntriesPage() {
  const { companyId } = useCompany();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'POSTED' | 'DRAFT'>('ALL');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      journalApi.getAll(companyId)
        .then(data => {
          setEntries(data);
          setError(null);
        })
        .catch(err => {
          setError(err.message);
          setEntries([]);
        })
        .finally(() => setLoading(false));
    }
  }, [companyId]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter(entry => {
        if (statusFilter === 'POSTED') return entry.isPosted;
        if (statusFilter === 'DRAFT') return !entry.isPosted;
        return true;
      })
      .filter(entry => {
        if (!search) return true;
        const searchTerm = search.toLowerCase();
        return (
          entry.description.toLowerCase().includes(searchTerm) ||
          entry.documentNumber?.toLowerCase().includes(searchTerm) ||
          entry.entryNumber.toString().includes(searchTerm)
        );
      })
      .filter(entry => {
        if (!fromDate) return true;
        return new Date(entry.documentDate) >= new Date(fromDate);
      })
      .filter(entry => {
        if (!toDate) return true;
        return new Date(entry.documentDate) <= new Date(toDate);
      });
  }, [entries, statusFilter, search, fromDate, toDate]);

  const handlePost = async (id: number) => {
    try {
      const updatedEntry = await journalApi.post(id);
      setEntries(prev => prev.map(e => e.id === id ? updatedEntry : e));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Грешка при осчетоводяване');
    }
  };

  const handleUnpost = async (id: number) => {
    if (!confirm('Сигурни ли сте, че искате да разосчетоводите този запис?')) return;
    try {
      const updatedEntry = await journalApi.unpost(id);
      setEntries(prev => prev.map(e => e.id === id ? updatedEntry : e));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Грешка при разосчетоводяване');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Сигурни ли сте, че искате да изтриете този запис?')) return;
    try {
      await journalApi.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Грешка при изтриване');
    }
  };

  const formatCurrency = (amount: number, currency = 'BGN') => {
    return new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bg-BG');
  };

    const getEditUrl = (entry: JournalEntry) => {
        return isVatEntry(entry) ? `/vat/entry/${entry.id}` : `/journal/entries/edit/${entry.id}`;
    };

  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setStatusFilter('ALL');
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Моля, изберете фирма от менюто</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Журнални записи</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredEntries.length > 0 ? `${filteredEntries.length.toLocaleString('bg-BG')} записа` : 'Няма записи'}
          </p>
        </div>
        <Link
          to="/journal/entries/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          + Нов запис
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Търсене</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Търси по описание, номер..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">От дата</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">До дата</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[
              { value: 'ALL', label: 'Всички' },
              { value: 'DRAFT', label: 'Чернови' },
              { value: 'POSTED', label: 'Осчетоводени' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value as typeof statusFilter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {(search || fromDate || toDate || statusFilter !== 'ALL') && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Изчисти филтрите
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Номер
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Описание
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сума
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Зареждане...
                    </td>
                </tr>
            ) : error ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                        {error}
                    </td>
                </tr>
            ): filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Няма журнални записи
                </td>
              </tr>
            ) : (
                filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600 flex items-center">
                      <Link to={getEditUrl(entry)}>
                        {entry.entryNumber}
                      </Link>
                    </div>
                    {entry.documentNumber && (
                      <div className="text-xs text-gray-500 ml-4">
                        Док: {entry.documentNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(entry.documentDate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Сч: {formatDate(entry.accountingDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {entry.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(entry.totalAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${entry.isPosted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {entry.isPosted ? 'Осчетоводен' : 'Чернова'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!entry.isPosted ? (
                      <>
                        <button
                          onClick={() => handlePost(entry.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Осчетоводи
                        </button>
                        <Link
                          to={getEditUrl(entry)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Редактирай
                        </Link>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Изтрий
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to={getEditUrl(entry)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Преглед
                        </Link>
                        <button
                          onClick={() => handleUnpost(entry.id)}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Разосчетоводи
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
