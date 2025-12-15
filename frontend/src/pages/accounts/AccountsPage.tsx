import { useState, useEffect } from 'react';
import { accountsApi } from '../../api/accounts';
import { useCompany } from '../../contexts/CompanyContext';
import type { Account, AccountType } from '../../types';

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'ASSET', label: 'Актив' },
  { value: 'LIABILITY', label: 'Пасив' },
  { value: 'EQUITY', label: 'Капитал' },
  { value: 'REVENUE', label: 'Приход' },
  { value: 'EXPENSE', label: 'Разход' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', accountType: 'ASSET' as AccountType });
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany) {
      loadAccounts();
    }
  }, [currentCompany]);

  const loadAccounts = async () => {
    if (!currentCompany) return;
    try {
      const data = await accountsApi.getByCompany(currentCompany.id);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      await accountsApi.create({
        ...formData,
        companyId: currentCompany.id,
      });
      setShowForm(false);
      setFormData({ code: '', name: '', accountType: 'ASSET' });
      loadAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  if (!currentCompany) {
    return <div>Моля, изберете фирма</div>;
  }

  if (isLoading) return <div>Зареждане...</div>;

  return (
    <div className="accounts-page">
      <div className="page-header">
        <h1>Сметкоплан</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">Нова сметка</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Нова сметка</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Код</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  placeholder="напр. 401"
                />
              </div>
              <div className="form-group">
                <label>Наименование</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Тип</label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value as AccountType })}
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
            <th>Код</th>
            <th>Наименование</th>
            <th>Тип</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 ? (
            <tr><td colSpan={4}>Няма сметки</td></tr>
          ) : (
            accounts.map((account) => (
              <tr key={account.id}>
                <td><strong>{account.code}</strong></td>
                <td>{account.name}</td>
                <td>{ACCOUNT_TYPES.find(t => t.value === account.accountType)?.label}</td>
                <td>{account.isActive ? 'Активна' : 'Неактивна'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
