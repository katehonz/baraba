import { useState, useEffect } from 'react';
import { vatRatesApi } from '../../api/vatRates';
import { useCompany } from '../../contexts/CompanyContext';
import { useTranslation } from 'react-i18next';
import type { VatRate } from '../../types';

export default function VatRates() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    rate: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    isDefault: false,
  });
  const [error, setError] = useState('');
  const [creating, _setCreating] = useState(false);
  const { companyId } = useCompany();
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await vatRatesApi.getVatRates(companyId);
      setVatRates(data);
    } catch (error) {
      console.error("Failed to fetch VAT rates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.code || !formData.name || !formData.rate) {
      setError(t('vatRates.codeNameRateRequired'));
      return;
    }

    if (!companyId) {
      setError(t('accounts.pleaseSelectCompany'));
      return;
    }

    try {
      await vatRatesApi.createVatRate({
        companyId: companyId,
        code: formData.code,
        name: formData.name,
        rate: parseFloat(formData.rate),
        effectiveFrom: formData.effectiveFrom,
        isDefault: formData.isDefault,
      });
      setShowModal(false);
      setFormData({
        code: '',
        name: '',
        rate: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        isDefault: false,
      });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('vatRates.createError'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('modals.confirmations.delete_vat_rate'))) return;

    try {
      await vatRatesApi.deleteVatRate(id);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('vatRates.deleteError'));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bg-BG');
  };

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
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.vat_rates')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('vatRates.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {t('vatRates.new')}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-2xl mr-3">📋</span>
          <div>
            <h3 className="text-sm font-medium text-yellow-900">{t('vatRates.standardRatesBG')}</h3>
            <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
              <li>{t('vatRates.standardRate')}</li>
              <li>{t('vatRates.reducedRate')}</li>
              <li>{t('vatRates.zeroRate')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* VAT Rates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vatRates.length === 0 ? (
          <div className="col-span-full bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center text-gray-500">
            {t('vatRates.noRates')}
          </div>
        ) : (
          vatRates.map(rate => (
            <div
              key={rate.id}
              className={`bg-white shadow-sm rounded-lg border p-6 ${
                rate.isDefault ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {rate.code}
                    </span>
                    {rate.isDefault && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                        {t('vatRates.default')}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">{rate.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{rate.rate}%</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t('vatRates.effectiveFrom')}:</span>
                  <span className="text-gray-700">{formatDate(rate.effectiveFrom)}</span>
                </div>
                {rate.effectiveTo && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">{t('vatRates.effectiveTo')}:</span>
                    <span className="text-gray-700">{formatDate(rate.effectiveTo)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">{t('common.status')}:</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    rate.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {rate.isActive ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDelete(rate.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{t('vatRates.newTitle')}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('vatRates.code')}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="STD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('vatRates.rate')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vatRates.name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={t('vatRates.standardRatePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vatRates.effectiveFrom')} *
                </label>
                <input
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  {t('vatRates.isDefault')}
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? t('common.creating') : t('vatRates.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
