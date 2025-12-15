import { useCompany } from '../contexts/CompanyContext';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { currentCompany } = useCompany();

  if (!currentCompany) {
    return (
      <div className="home-page">
        <h1>Добре дошли в Baraba</h1>
        <p>Моля, изберете фирма за да продължите.</p>
        <Link to="/companies" className="btn-primary">Изберете фирма</Link>
      </div>
    );
  }

  return (
    <div className="home-page">
      <h1>{currentCompany.name}</h1>
      <p>ЕИК: {currentCompany.eik}</p>
      {currentCompany.vatNumber && <p>ДДС номер: {currentCompany.vatNumber}</p>}

      <div className="dashboard-cards">
        <Link to="/accounts" className="dashboard-card">
          <h3>Сметки</h3>
          <p>Сметкоплан</p>
        </Link>
        <Link to="/counterparts" className="dashboard-card">
          <h3>Контрагенти</h3>
          <p>Клиенти и доставчици</p>
        </Link>
        <Link to="/journal" className="dashboard-card">
          <h3>Дневник</h3>
          <p>Счетоводни записи</p>
        </Link>
      </div>
    </div>
  );
}
