import { useState, useEffect } from 'react';
import './App.css';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Account from './pages/Account';
import StaffProducts from './pages/StaffProducts';
import StaffStock from './pages/StaffStock';
import StaffCustomers from './pages/StaffCustomers';
import StaffSuppliers from './pages/StaffSuppliers';

const CUSTOMER_ID = 1;

export default function App() {
  const [page, setPage] = useState('products');
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = async () => {
    try {
      const res = await fetch(`/api/cart/${CUSTOMER_ID}`);
      const data = await res.json();
      setCartCount(data.items?.length || 0);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => { fetchCartCount(); }, []);

  const nav = (key) => {
    setPage(key);
    if (key === 'cart') fetchCartCount();
  };

  const customerLinks = [
    { key: 'products', label: 'Browse Products', icon: '🛍️' },
    { key: 'cart',     label: 'Cart',            icon: '🛒', badge: cartCount },
    { key: 'orders',   label: 'My Orders',       icon: '📦' },
    { key: 'account',  label: 'My Account',      icon: '👤' },
  ];

  const staffLinks = [
    { key: 'staff-products',  label: 'Manage Products', icon: '📝' },
    { key: 'staff-stock',     label: 'Manage Stock',    icon: '🏭' },
    { key: 'staff-customers', label: 'View Customers',  icon: '👥' },
    { key: 'staff-suppliers', label: 'Manage Suppliers', icon: '🚚' },
  ];

  const renderPage = () => {
    switch (page) {
      case 'products':        return <Products customerId={CUSTOMER_ID} onCartUpdate={fetchCartCount} />;
      case 'cart':            return <Cart customerId={CUSTOMER_ID} onCartUpdate={fetchCartCount} onNavigate={nav} />;
      case 'orders':          return <Orders customerId={CUSTOMER_ID} />;
      case 'account':         return <Account customerId={CUSTOMER_ID} />;
      case 'staff-products':  return <StaffProducts />;
      case 'staff-stock':     return <StaffStock />;
      case 'staff-customers': return <StaffCustomers />;
      case 'staff-suppliers': return <StaffSuppliers />;
      default:                return <Products customerId={CUSTOMER_ID} onCartUpdate={fetchCartCount} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Gar's Bodega</h1>
          <p>Hero supplies & more</p>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Customer</div>
          {customerLinks.map(({ key, label, icon, badge }) => (
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

        <div className="sidebar-section">
          <div className="sidebar-section-label">Staff</div>
          {staffLinks.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`nav-btn ${page === key ? 'active' : ''}`}
              onClick={() => nav(key)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}