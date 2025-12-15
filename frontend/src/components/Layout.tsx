import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { currentCompany } = useCompany();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="logo">Baraba</Link>
          {currentCompany && (
            <span className="current-company">{currentCompany.name}</span>
          )}
        </div>
        <nav className="main-nav">
          <Link to="/companies">Фирми</Link>
          {currentCompany && (
            <>
              <Link to="/accounts">Сметки</Link>
              <Link to="/counterparts">Контрагенти</Link>
              <Link to="/journal">Дневник</Link>
            </>
          )}
        </nav>
        <div className="header-right">
          <span className="username">{user?.username}</span>
          <button onClick={handleLogout} className="btn-logout">Изход</button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
