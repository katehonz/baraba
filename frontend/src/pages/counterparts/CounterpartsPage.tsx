import { useState, useEffect } from 'react';
import { counterpartsApi } from '../../api/counterparts';
import { useCompany } from '../../contexts/CompanyContext';
import type { Counterpart } from '../../types';

export default function CounterpartsPage() {
  const [counterparts, setCounterparts] = useState<Counterpart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    eik: '',
    vatNumber: '',
    isCustomer: true,
    isSupplier: false
  });
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany) {
      loadCounterparts();
    }
  }, [currentCompany]);

  const loadCounterparts = async () => {
    if (!currentCompany) return;
    try {
      const data = await counterpartsApi.getAll(currentCompany.id);
      setCounterparts(data);
    } catch (error) {
      console.error('Error loading counterparts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      await counterpartsApi.create({
        ...formData,
        companyId: currentCompany.id,
      });
      setShowForm(false);
      setFormData({ name: '', eik: '', vatNumber: '', isCustomer: true, isSupplier: false });
      loadCounterparts();
    } catch (error) {
      console.error('Error creating counterpart:', error);
    }
  };

  if (!currentCompany) {
    return <div>Моля, изберете фирма</div>;
  }

  if (isLoading) return <div>Зареждане...</div>;

  return (
    <div className="counterparts-page">
      <div className="page-header">
        <h1>Контрагенти</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">Нов контрагент</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Нов контрагент</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Име</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>ЕИК</label>
                <input
                  type="text"
                  value={formData.eik}
                  onChange={(e) => setFormData({ ...formData, eik: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>ДДС номер</label>
                <input
                  type="text"
                  value={formData.vatNumber}
                  onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isCustomer}
                    onChange={(e) => setFormData({ ...formData, isCustomer: e.target.checked })}
                  />
                  Клиент
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isSupplier}
                    onChange={(e) => setFormData({ ...formData, isSupplier: e.target.checked })}
                  />
                  Доставчик
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)}>Отказ</button>
                <button type="submit" className="btn-primary">Създай</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Име</th>
            <th>ЕИК</th>
            <th>Тип</th>
          </tr>
        </thead>
        <tbody>
          {counterparts.length === 0 ? (
            <tr><td colSpan={3}>Няма контрагенти</td></tr>
          ) : (
            counterparts.map((cp) => (
              <tr key={cp.id}>
                <td><strong>{cp.name}</strong></td>
                <td>{cp.eik}</td>
                <td>
                  {cp.isCustomer && <span className="badge">Клиент</span>}
                  {cp.isSupplier && <span className="badge">Доставчик</span>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
