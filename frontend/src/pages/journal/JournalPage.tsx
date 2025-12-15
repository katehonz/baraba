import { useState, useEffect } from 'react';
import { journalApi } from '../../api/journal';
import { useCompany } from '../../contexts/CompanyContext';
import type { JournalEntry } from '../../types';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    documentNumber: '',
    description: '',
    totalAmount: 0
  });
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany) {
      loadEntries();
    }
  }, [currentCompany]);

  const loadEntries = async () => {
    if (!currentCompany) return;
    try {
      const data = await journalApi.getAll(currentCompany.id);
      setEntries(data);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      await journalApi.create({
        ...formData,
        companyId: currentCompany.id,
      });
      setShowForm(false);
      setFormData({ documentNumber: '', description: '', totalAmount: 0 });
      loadEntries();
    } catch (error) {
      console.error('Error creating entry:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bg-BG');
  };

  if (!currentCompany) {
    return <div>Моля, изберете фирма</div>;
  }

  if (isLoading) return <div>Зареждане...</div>;

  return (
    <div className="journal-page">
      <div className="page-header">
        <h1>Счетоводен дневник</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">Нов запис</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Нов запис</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Номер на документ</label>
                <input
                  type="text"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Сума</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
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

      <table className="data-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Документ</th>
            <th>Описание</th>
            <th>Сума</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr><td colSpan={5}>Няма записи</td></tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDate(entry.documentDate)}</td>
                <td>{entry.documentNumber || '-'}</td>
                <td>{entry.description || '-'}</td>
                <td className="amount">{entry.totalAmount.toFixed(2)} лв.</td>
                <td>
                  {entry.isPosted ? (
                    <span className="badge posted">Осчетоводен</span>
                  ) : (
                    <span className="badge draft">Чернова</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
