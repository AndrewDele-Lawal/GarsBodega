import { useState, useEffect } from 'react';
import './App.css';
import Welcome from './pages/Welcome';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Account from './pages/Account';
import StaffProducts from './pages/StaffProducts';
import StaffStock from './pages/StaffStock';
import StaffCustomers from './pages/StaffCustomers';

export default function App() {
  const [activeUser, setActiveUser] = useState(null); // null = welcome screen
  const [page, setPage] = useState('products');
  const [cartCount, setCartCount] = useState(0);

  const customerId = activeUser?.customer_id || null;
  const staffId = activeUser?.staff_id || null;
  const role = activeUser?.role || null;

  const fetchCartCount = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/cart/${customerId}`);
      const data = await res.json();
      setCartCount(data.items?.length || 0);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    if (customerId) fetchCartCount();
  }, [customerId]);

  const handleSelect = (user) => {
    setActiveUser(user);
    setPage(user.role === 'staff' ? 'staff-products' : 'products');
  };

  const handleSignOut = () => {
    setActiveUser(null);
    setCartCount(0);
    setPage('products');
  };

  const nav = (key) => {
    setPage(key);
    if (key === 'cart') fetchCartCount();
  };

  if (!activeUser) {
    return <Welcome onSelect={handleSelect} />;
  }

  const customerLinks = [
    { key: 'products', label: 'Browse Products', icon: '🛘️' },
    { key: 'cart',     label: 'Cart',            icon: '🛒', badge: cartCount },
    { key: 'orders',   label: 'My Orders',       icon: '📦' },
    { key: 'account',  label: 'My Account',      icon: '👤' },
  ];

  const staffLinks = [
    { key: 'staff-products',  label: 'Manage Products', icon: '📝' },
    { key: 'staff-stock',     label: 'Manage Stock',    icon: '🏭' },
    { key: 'staff-customers', label: 'View Customers',  icon: '👥' },
  ];

  const links = role === 'staff' ? staffLinks : customerLinks;

  const renderPage = () => {
    switch (page) {
      case 'products':        return <Products customerId={customerId} onCartUpdate={fetchCartCount} />;
      case 'cart':            return <Cart customerId={customerId} onCartUpdate={fetchCartCount} onNavigate={nav} />;
      case 'orders':          return <Orders customerId={customerId} />;
      case 'account':         return <Account customerId={customerId} />;
      case 'staff-products':  return <StaffProducts />;
      case 'staff-stock':     return <StaffStock />;
      case 'staff-customers': return <StaffCustomers />;
      default:                return role === 'staff' ? <StaffProducts /> : <Products customerId={customerId} onCartUpdate={fetchCartCount} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Gar&apos;s Bodega</h1>
          <p>
            {role === 'staff'
              ? `Staff — ${activeUser.first_name} ${activeUser.last_name}`
              : `Customer — ${activeUser.first_name} ${activeUser.last_name}`
            }
          </p>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">{role === 'staff' ? 'Staff' : 'Customer'}</div>
          {links.map(({ key, label, icon, badge }) => (
            <button
              key={key}
              className={`nav-btn ${page === key ? 'active' : ''}`}
              onClick={() => nav(key)}
            >
              <span>{icon}</span>
              {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </button>
          ))}
        </div>

        <div className="sidebar-section" style={{ marginTop: 'auto' }}>
          <button className="nav-btn" onClick={handleSignOut}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
