import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import { accountsApi } from '../../api/accounts';
import { counterpartsApi } from '../../api/counterparts';
import { currenciesApi } from '../../api/currencies';
import { journalApi } from '../../api/journal';
import { viesApi } from '../../api/vies';
import type { Account, Counterpart, Currency, CreateJournalEntryInput, CreateEntryLineInput } from '../../types';

const newEmptyLine = (): CreateEntryLineInput => ({
    accountId: 0,
    debitAmount: 0,
    creditAmount: 0,
    description: '',
    currencyCode: 'BGN',
    currencyAmount: 0,
    exchangeRate: 1,
});

export default function JournalEntryFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { companyId } = useCompany();
    const isEdit = !!id;

    const [formData, setFormData] = useState<CreateJournalEntryInput>({
        documentNumber: '',
        description: '',
        companyId: companyId || 0,
        lines: [newEmptyLine(), newEmptyLine()],
    });
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [counterparts, setCounterparts] = useState<Counterpart[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Counterpart modal state
    const [showCounterpartModal, setShowCounterpartModal] = useState(false);
    const [counterpartSearch, setCounterpartSearch] = useState('');
    const [showNewCounterpartForm, setShowNewCounterpartForm] = useState(false);
    const [newCounterpart, setNewCounterpart] = useState({
      name: '',
      eik: '',
      vatNumber: '',
    });
    const [viesLoading, setViesLoading] = useState(false);
    const [viesResult, setViesResult] = useState<{ valid: boolean; name?: string; longAddress?: string; countryCode?: string; vatNumber?: string; errorMessage?: string; source?: string } | null>(null);

    useEffect(() => {
        if (companyId) {
            accountsApi.getByCompany(companyId).then(setAccounts);
            counterpartsApi.getByCompany(companyId).then(setCounterparts);
            currenciesApi.getAll().then(setCurrencies);
        }
    }, [companyId]);

    useEffect(() => {
        if (isEdit && id) {
            setIsLoading(true);
            journalApi.getById(parseInt(id, 10))
                .then(data => {
                    const { entry, lines } = data;
                    setFormData({
                        documentNumber: entry.documentNumber,
                        description: entry.description,
                        companyId: entry.companyId,
                        counterpartId: entry.counterpartId ?? undefined,
                        lines: lines.map(line => ({
                            accountId: line.accountId,
                            debitAmount: line.debitAmount,
                            creditAmount: line.creditAmount,
                            description: line.description,
                        })),
                    });
                })
                .catch(err => setError(err.message))
                .finally(() => setIsLoading(false));
        }
    }, [id, isEdit]);


    const handleLineChange = (index: number, field: keyof CreateEntryLineInput, value: any) => {
        const newLines = [...(formData.lines || [])];
        const line = { ...newLines[index], [field]: value };

        if (line.currencyCode !== 'BGN' && (field === 'currencyAmount' || field === 'exchangeRate')) {
            const amount = (line.currencyAmount || 0) * (line.exchangeRate || 1);
            if (line.debitAmount && line.debitAmount > 0) {
                line.debitAmount = amount;
            } else {
                line.creditAmount = amount;
            }
        }

        newLines[index] = line;
        setFormData({ ...formData, lines: newLines });
    };
    
    const addLine = () => {
        setFormData({ ...formData, lines: [...(formData.lines || []), newEmptyLine()] });
    };

    const removeLine = (index: number) => {
        const newLines = [...(formData.lines || [])];
        newLines.splice(index, 1);
        setFormData({ ...formData, lines: newLines });
    };

    const handleValidateVat = async () => {
      if (!newCounterpart.vatNumber || newCounterpart.vatNumber.length < 3) {
        setError('Въведете валиден ДДС номер (напр. BG123456789)');
        return;
      }
  
      setViesLoading(true);
      setError('');
      setViesResult(null);
  
      try {
        const result = await viesApi.validateVat(newCounterpart.vatNumber);
        setViesResult(result);
  
        if (result.valid) {
          setNewCounterpart(prev => ({
            ...prev,
            name: result.name || prev.name,
            eik: result.vatNumber.replace(/^BG/i, '') || prev.eik,
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Грешка при валидация');
      } finally {
        setViesLoading(false);
      }
    };
  
    const handleCreateCounterpart = async () => {
      if (!newCounterpart.name.trim() || !companyId) return;
  
      try {
        const created = await counterpartsApi.create({
          companyId,
          name: newCounterpart.name,
          eik: newCounterpart.eik || undefined,
          vatNumber: newCounterpart.vatNumber || undefined,
        });
        setCounterparts(prev => [...prev, created]);
        setFormData(prev => ({ ...prev, counterpartId: created.id }));
        setShowNewCounterpartForm(false);
        setShowCounterpartModal(false);
        setNewCounterpart({
          name: '',
          eik: '',
          vatNumber: '',
        });
        setViesResult(null);
        setCounterpartSearch('');
      } catch (err) {
        console.error('Error creating counterpart:', err);
      }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!companyId) {
            setError('Моля, изберете фирма');
            return;
        }

        const input: CreateJournalEntryInput = { ...formData, companyId };

        try {
            if (isEdit && id) {
                await journalApi.update(parseInt(id, 10), input);
            } else {
                await journalApi.create(input);
            }
            navigate('/journal/entries');
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (isLoading) {
        return <div>Зареждане...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">{isEdit ? 'Редакция на запис' : 'Нов запис'}</h1>
            {error && <div className="text-red-500">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label>Номер на документ</label>
                    <input
                        type="text"
                        value={formData.documentNumber}
                        onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                        className="w-full p-2 border"
                    />
                </div>
                <div>
                    <label>Описание</label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-2 border"
                    />
                </div>
                <div>
                    <label>Контрагент</label>
                    <select
                        value={formData.counterpartId || ''}
                        onChange={(e) => setFormData({ ...formData, counterpartId: parseInt(e.target.value, 10) })}
                        className="w-full p-2 border"
                    >
                                  <option value="">-- Изберете контрагент --</option>
                                  {counterparts.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                              </select>
                          </div>
                        
                          <button type="button" onClick={() => setShowCounterpartModal(true)}>+ Нов контрагент</button>
                        
                          {showCounterpartModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
                                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                      <h2 className="text-lg font-semibold text-gray-900">
                                        {showNewCounterpartForm ? 'Нов контрагент' : 'Избери контрагент'}
                                      </h2>
                                      <button
                                        onClick={() => {
                                          setShowCounterpartModal(false);
                                          setShowNewCounterpartForm(false);
                                          setCounterpartSearch('');
                                          setNewCounterpart({ name: '', eik: '', vatNumber: '' });
                                          setViesResult(null);
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    {showNewCounterpartForm ? (
                                        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                                          {viesResult && (
                                            <div className={`rounded-lg p-3 text-sm ${
                                              viesResult.valid
                                                ? 'bg-green-50 border border-green-200 text-green-700'
                                                : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                                            }`}>
                                              {viesResult.valid ? (
                                                <div>
                                                  <div className="font-medium">Валиден ДДС номер ({viesResult.source})</div>
                                                  {viesResult.name && <div className="mt-1">Име: {viesResult.name}</div>}
                                                  {viesResult.longAddress && <div>Адрес: {viesResult.longAddress}</div>}
                                                </div>
                                              ) : (
                                                <div className="font-medium">{viesResult.errorMessage || 'ДДС номерът не е валиден'}</div>
                                              )}
                                            </div>
                                          )}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ДДС номер</label>
                                            <div className="flex gap-2">
                                              <input
                                                type="text"
                                                value={newCounterpart.vatNumber}
                                                onChange={(e) => setNewCounterpart({ ...newCounterpart, vatNumber: e.target.value.toUpperCase() })}
                                                className="block flex-1 rounded-md border-gray-300 shadow-sm sm:text-sm"
                                                placeholder="BG123456789"
                                              />
                                              <button
                                                type="button"
                                                onClick={handleValidateVat}
                                                disabled={viesLoading || !newCounterpart.vatNumber}
                                                className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                                              >
                                                {viesLoading ? 'Проверка...' : 'Провери VIES'}
                                              </button>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Име *</label>
                                            <input
                                              type="text"
                                              value={newCounterpart.name}
                                              onChange={(e) => setNewCounterpart({ ...newCounterpart, name: e.target.value })}
                                              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                              placeholder="Име на контрагента..."
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ЕИК</label>
                                            <input
                                              type="text"
                                              value={newCounterpart.eik}
                                              onChange={(e) => setNewCounterpart({ ...newCounterpart, eik: e.target.value })}
                                              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                              placeholder="123456789"
                                            />
                                          </div>
                                          <div className="flex justify-end gap-3 pt-4 border-t">
                                            <button
                                              type="button"
                                              onClick={() => setShowNewCounterpartForm(false)}
                                              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                            >
                                              Назад
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleCreateCounterpart}
                                              disabled={!newCounterpart.name.trim()}
                                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                            >
                                              Създай контрагент
                                            </button>
                                          </div>
                                        </div>
                                    ) : (
                                      <>
                                        <div className="p-3 border-b">
                                          <input
                                            type="text"
                                            value={counterpartSearch}
                                            onChange={(e) => setCounterpartSearch(e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                            placeholder="Търси по име, ЕИК или ДДС..."
                                            autoFocus
                                          />
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                          {counterparts.filter(c => c.name.toLowerCase().includes(counterpartSearch.toLowerCase())).map(counterpart => (
                                            <button
                                              key={counterpart.id}
                                              type="button"
                                              onClick={() => {
                                                setFormData({...formData, counterpartId: counterpart.id});
                                                setShowCounterpartModal(false);
                                              }}
                                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                                            >
                                              <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 text-sm truncate">{counterpart.name}</div>
                                                {counterpart.eik && <div className="text-xs text-gray-500">ЕИК: {counterpart.eik}</div>}
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                        <div className="p-3 border-t bg-gray-50">
                                          <button
                                            type="button"
                                            onClick={() => setShowNewCounterpartForm(true)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                                          >
                                            + Създай нов контрагент
                                          </button>
                                        </div>
                                      </>
                                    )}
                                </div>
                            </div>
                          )}
                        
                          <h2 className="text-xl font-bold">Редове</h2>
                          <div className="space-y-2">
                              {formData.lines?.map((line, index) => (
                                  <div key={index} className="flex gap-2 items-center">
                                      <select
                                          value={line.accountId}
                                          onChange={(e) => handleLineChange(index, 'accountId', parseInt(e.target.value, 10))}
                                          className="p-2 border"
                                      >
                                          <option value={0}>-- Изберете сметка --</option>
                                          {accounts.map(a => (
                                              <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                          ))}
                                      </select>
                                      <input
                                          type="number"
                                          placeholder="Дебит"
                                          value={line.debitAmount}
                                          onChange={(e) => handleLineChange(index, 'debitAmount', parseFloat(e.target.value))}
                                          className="p-2 border"
                                      />
                                      <input
                                          type="number"
                                          placeholder="Кредит"
                                          value={line.creditAmount}
                                          onChange={(e) => handleLineChange(index, 'creditAmount', parseFloat(e.target.value))}
                                          className="p-2 border"
                                      />
                                      <input
                                          type="text"
                                          placeholder="Описание"
                                          value={line.description}
                                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                          className="p-2 border"
                                      />
                                      <select
                                          value={line.currencyCode}
                                          onChange={(e) => handleLineChange(index, 'currencyCode', e.target.value)}
                                          className="p-2 border"
                                      >
                                          {currencies.map(c => (
                                              <option key={c.id} value={c.code}>{c.code}</option>
                                          ))}
                                      </select>
                                      <input
                                          type="number"
                                          placeholder="Сума във валута"
                                          value={line.currencyAmount}
                                          onChange={(e) => handleLineChange(index, 'currencyAmount', parseFloat(e.target.value))}
                                          className="p-2 border"
                                          disabled={line.currencyCode === 'BGN'}
                                      />
                                      <input
                                          type="number"
                                          placeholder="Курс"
                                          value={line.exchangeRate}
                                          onChange={(e) => handleLineChange(index, 'exchangeRate', parseFloat(e.target.value))}
                                          className="p-2 border"
                                          disabled={line.currencyCode === 'BGN'}
                                      />
                                      <button type="button" onClick={() => removeLine(index)} className="text-red-500">X</button>
                                  </div>
                              ))}
                          </div>
                          <button type="button" onClick={addLine}>+ Добави ред</button>
                        
                          <div className="flex justify-end gap-4">
                              <button type="button" onClick={() => navigate('/journal/entries')} className="px-4 py-2 bg-gray-200">Отказ</button>
                              <button type="submit" className="px-4 py-2 bg-blue-500 text-white">Запази</button>
                          </div>
                        </form>
                        </div>
                        );
                        }