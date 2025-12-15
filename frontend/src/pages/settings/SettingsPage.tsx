import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { settingsApi } from '../../api/settings';
import type { DefaultAccounts } from '../../api/settings';
import { accountsApi } from '../../api/accounts';
import { currenciesApi } from '../../api/currencies';
import { useCompany } from '../../contexts/CompanyContext';
import type { Account, Currency } from '../../types';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('accounting');
  const { companyId } = useCompany();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultAccounts, setDefaultAccounts] = useState<DefaultAccounts>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    currenciesApi.getAll().then(setCurrencies);
    if (companyId) {
      accountsApi.getByCompany(companyId).then(setAccounts);
      settingsApi.getCompanySettings(companyId).then((data: any) => {
        setDefaultAccounts({
          defaultCashAccountId: data.defaultCashAccount?.id,
          defaultCustomersAccountId: data.defaultCustomersAccount?.id,
          defaultSuppliersAccountId: data.defaultSuppliersAccount?.id,
          defaultSalesRevenueAccountId: data.defaultSalesRevenueAccount?.id,
          defaultVatPurchaseAccountId: data.defaultVatPurchaseAccount?.id,
          defaultVatSalesAccountId: data.defaultVatSalesAccount?.id,
          defaultCardPaymentPurchaseAccountId: data.defaultCardPaymentPurchaseAccount?.id,
          defaultCardPaymentSalesAccountId: data.defaultCardPaymentSalesAccount?.id,
        })
      });
    }
  }, [companyId]);

  const baseCurrency = currencies.find((c: Currency) => c.isBaseCurrency);

  const filterAccountsByCode = (prefix: string) => {
    return accounts.filter((acc: Account) => acc.code.startsWith(prefix));
  };

  const handleSaveDefaultAccounts = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      await settingsApi.updateDefaultAccounts(companyId, defaultAccounts);
      alert('Настройките са запазени успешно!');
    } catch (error) {
      console.error('Error saving default accounts:', error);
      alert('Грешка при запазване на настройките');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'accounting', label: 'Счетоводство', icon: '📚' },
    { id: 'automation', label: 'Автоматизации', icon: '🤖' },
    { id: 'users', label: 'Потребители и права', icon: '👥' },
  ];

  const AccountSelect = ({
    label,
    value,
    onChange,
    filterPrefix,
    hint
  }: {
    label: string;
    value: number | undefined;
    onChange: (value: string) => void;
    filterPrefix?: string;
    hint?: string;
  }) => {
    const filteredAccounts = filterPrefix ? filterAccountsByCode(filterPrefix) : accounts;
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">-- Изберете сметка --</option>
          {filteredAccounts.map((acc: Account) => (
            <option key={acc.id} value={acc.id}>
              {acc.code} - {acc.name}
            </option>
          ))}
        </select>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="mt-1 text-sm text-gray-500">
          Конфигурация на системата и предпочитания
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'accounting' && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Счетоводни настройки</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Основни настройки за счетоводството
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
                  <span className="text-2xl mr-3">💱</span>
                  <div>
                    <p className="text-sm font-medium text-green-900">Базова валута: {baseCurrency?.code || 'EUR'}</p>
                    <p className="text-xs text-green-700">Фиксирана базова валута</p>
                  </div>
                </div>

                <div>
                  <Link to="/settings/currencies" className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">
                    <span className="text-2xl mr-3">🪙</span>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Валути и курсове</p>
                      <p className="text-xs text-blue-700">Управление на валути и обменни курсове</p>
                    </div>
                  </Link>
                </div>
                <div>
                  <Link to="/settings/vat-rates" className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">
                    <span className="text-2xl mr-3">💰</span>
                    <div>
                      <p className="text-sm font-medium text-blue-900">ДДС Ставки</p>
                      <p className="text-xs text-blue-700">Управление на ставките по ЗДДС</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Автоматизации</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Настройте default сметки за автоматични плащания и AI обработка на фактури
                </p>
              </div>

              {!companyId ? (
                <div className="text-center py-8 text-gray-500">
                  Моля, изберете компания от менюто горе.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Разплащания */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">
                      Сметки за разплащания
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AccountSelect
                        label="Каса (плащания в брой)"
                        value={defaultAccounts.defaultCashAccountId}
                        onChange={(v) => setDefaultAccounts(prev => ({ ...prev, defaultCashAccountId: parseInt(v) }))}
                        filterPrefix="50"
                        hint="Обикновено 501"
                      />
                      <AccountSelect
                        label="Плащания с карта (покупки)"
                        value={defaultAccounts.defaultCardPaymentPurchaseAccountId}
                        onChange={(v) => setDefaultAccounts(prev => ({ ...prev, defaultCardPaymentPurchaseAccountId: parseInt(v) }))}
                        filterPrefix="50"
                        hint="POS терминал за плащане"
                      />
                      <AccountSelect
                        label="Плащания с карта (продажби)"
                        value={defaultAccounts.defaultCardPaymentSalesAccountId}
                        onChange={(v) => setDefaultAccounts(prev => ({ ...prev, defaultCardPaymentSalesAccountId: parseInt(v) }))}
                        filterPrefix="50"
                        hint="POS терминал за приемане"
                      />
                    </div>
                  </div>

                  {/* Контрагенти */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">
                      Сметки на контрагенти
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AccountSelect
                        label="Клиенти"
                        value={defaultAccounts.defaultCustomersAccountId}
                        onChange={(v) => setDefaultAccounts(prev => ({ ...prev, defaultCustomersAccountId: parseInt(v) }))}
                        filterPrefix="41"
                        hint="Обикновено 411"
                      />
                      <AccountSelect
                        label="Доставчици"
                        value={defaultAccounts.defaultSuppliersAccountId}
                        onChange={(v) => setDefaultAccounts(prev => ({ ...prev, defaultSuppliersAccountId: parseInt(v) }))}
                        filterPrefix="40"
                        hint="Обикновено 401"
                      />
                    </div>
                  </div>

                  {/* Приходи и ДДС */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">
                      Приходи и ДДС
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AccountSelect
                        label="Приходи от продажби (default)"
                        value={defaultAccounts.defaultSalesRevenueAccountId}
                        onChange={(v) => setDefaultAccounts(prev => ({ ...prev, defaultSalesRevenueAccountId: parseInt(v) }))}
                        filterPrefix="70"
                        hint="Обикновено 702 или 703"
                      />
                      <AccountSelect
                        label="ДДС на покупките"
                        value={defaultAccounts.defaultVatPurchaseAccountId}
                        onChange={(v) => setDefaultAccounts(prev => ({ ...prev, defaultVatPurchaseAccountId: parseInt(v) }))}
                        filterPrefix="453"
                        hint="Обикновено 4531"
                      />
                      <AccountSelect
                        label="ДДС на продажбите"
                        value={defaultAccounts.defaultVatSalesAccountId}
                        onChange={(v) => setDefaultAccounts(prev => ({ ...prev, defaultVatSalesAccountId: parseInt(v) }))}
                        filterPrefix="453"
                        hint="Обикновено 4532"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={handleSaveDefaultAccounts}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Запазване...' : 'Запази настройките'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900">Потребители и права</h2>
                <p className="mt-1 text-sm text-gray-600">
                Управление на потребителски роли и техните достъпи до различните модули на системата.
                </p>
                <div className="mt-4">
                <Link
                    to="/settings/users"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Управление на потребители
                </Link>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
