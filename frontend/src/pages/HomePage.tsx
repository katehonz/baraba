import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companiesApi } from '../api/companies';
import { currenciesApi } from '../api/currencies';
import { fixedAssetCategoriesApi } from '../api/fixedAssetCategories';
import { useCompany } from '../contexts/CompanyContext';
import type { Company, Currency, FixedAssetCategory } from '../types';

interface SummaryCardProps {
  title: string;
  value: string | number;
  hint: string;
  accent: string;
}

function SummaryCard({ title, value, hint, accent }: SummaryCardProps) {
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-lg px-5 py-4 flex flex-col justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      <p className={`mt-4 text-xs font-medium px-2 py-1 rounded-full inline-flex ${accent}`}>
        {hint}
      </p>
    </div>
  );
}

export default function HomePage() {
  const { companyId } = useCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categories, setCategories] = useState<FixedAssetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [companiesData, currenciesData] = await Promise.all([
          companiesApi.getAll(),
          currenciesApi.getAll(),
        ]);
        setCompanies(companiesData);
        setCurrencies(currenciesData);

        if (companyId) {
          const categoriesData = await fixedAssetCategoriesApi.getFixedAssetCategories(companyId);
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  const baseCurrency = currencies.find((c: Currency) => c.isBaseCurrency);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Начално табло</h1>
          <p className="mt-1 text-sm text-gray-500">
            Обобщение на системата • EUR базова валута (България в еврозоната от 2025)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/journal/entries/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            📝 Нов запис
          </Link>
          <Link
            to="/companies"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            🏢 Компании
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Компании"
          value={companies.length}
          hint={companies.length > 0 ? `${companies.filter((c: Company) => c.isActive).length} активни` : 'Създайте първата компания'}
          accent="bg-blue-100 text-blue-700"
        />
        <SummaryCard
          title="Базова валута"
          value={baseCurrency?.code || 'EUR'}
          hint="Фиксиран курс BGN/EUR: 1.95583"
          accent="bg-green-100 text-green-700"
        />
        <SummaryCard
          title="Валути"
          value={currencies.length}
          hint="Курсове от ЕЦБ"
          accent="bg-purple-100 text-purple-700"
        />
        <SummaryCard
          title="Категории ДА"
          value={categories.length}
          hint="Данъчни категории по ЗКПО"
          accent="bg-teal-100 text-teal-700"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Companies List */}
        <div className="xl:col-span-2 bg-white border border-gray-100 shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Компании</h3>
            <Link to="/companies" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Управление →
            </Link>
          </div>
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Няма създадени компании</p>
              <Link
                to="/companies"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Създай компания
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {companies.slice(0, 5).map((company: Company) => (
                <li key={company.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{company.name}</p>
                    <p className="text-xs text-gray-500">
                      ЕИК: {company.eik} {company.vatNumber && `• ДДС: ${company.vatNumber}`}
                      {company.city && ` • ${company.city}`}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    company.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {company.isActive ? 'Активна' : 'Неактивна'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Бързи действия</h3>
          <div className="space-y-3">
            <Link
              to="/journal/entries/new"
              className="flex items-center p-3 rounded-md border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">📝</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Нов счетоводен запис</p>
                <p className="text-xs text-gray-500">Създай дневникова статия</p>
              </div>
            </Link>
            <Link
              to="/accounts"
              className="flex items-center p-3 rounded-md border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">🗂️</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Сметкоплан</p>
                <p className="text-xs text-gray-500">Управление на сметки</p>
              </div>
            </Link>
            <Link
              to="/counterparts"
              className="flex items-center p-3 rounded-md border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">👥</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Контрагенти</p>
                <p className="text-xs text-gray-500">Клиенти и доставчици</p>
              </div>
            </Link>
            <Link
              to="/reports"
              className="flex items-center p-3 rounded-md border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">📄</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Отчети</p>
                <p className="text-xs text-gray-500">Справки и отчети</p>
              </div>
            </Link>
            <Link
              to="/settings"
              className="flex items-center p-3 rounded-md border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">⚙️</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Настройки</p>
                <p className="text-xs text-gray-500">Конфигурация на системата</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
