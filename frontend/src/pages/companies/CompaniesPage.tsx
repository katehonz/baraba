import { useState, useEffect } from 'react';
import { companiesApi } from '../../api/companies';
import { useCompany } from '../../contexts/CompanyContext';
import type { Company } from '../../types';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', eik: '', vatNumber: '', address: '', city: '' });
  const { currentCompany, setCurrentCompany } = useCompany();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await companiesApi.getAll();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companiesApi.create(formData);
      setShowForm(false);
      setFormData({ name: '', eik: '', vatNumber: '', address: '', city: '' });
      loadCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
    }
  };

  const selectCompany = (company: Company) => {
    setCurrentCompany(company);
  };

  if (isLoading) return <div>Зареждане...</div>;

  return (
    <div className="companies-page">
      <div className="page-header">
        <h1>Фирми</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">Нова фирма</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Нова фирма</h2>
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
                  required
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
              <div className="form-group">
                <label>Адрес</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Град</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)}>Отказ</button>
                <button type="submit" className="btn-primary">Създай</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="companies-list">
        {companies.length === 0 ? (
          <p>Няма създадени фирми</p>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className={`company-card ${currentCompany?.id === company.id ? 'selected' : ''}`}
              onClick={() => selectCompany(company)}
            >
              <h3>{company.name}</h3>
              <p>ЕИК: {company.eik}</p>
              {company.vatNumber && <p>ДДС: {company.vatNumber}</p>}
              {company.city && <p>{company.city}</p>}
              {currentCompany?.id === company.id && <span className="badge">Избрана</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
