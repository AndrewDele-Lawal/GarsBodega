import { useState, useEffect } from 'react';

const BG_IMAGE = 'https://raw.githubusercontent.com/AndrewDele-Lawal/GarsBodega/Dev/client/src/assets/gars-bg.jpg';

export default function Welcome({ onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [screen, setScreen] = useState('home'); // 'home' | 'pick'
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/staff/customers/all'),
        fetch('/api/staff')
      ]);
      setCustomers(await cRes.json());
      setStaff(await sRes.json());
    } finally {
      setLoading(false);
    }
  };

  const handleRoleClick = (r) => {
    setRole(r);
    setScreen('pick');
    fetchUsers();
  };

  const handleSelect = (user) => {
    onSelect({ ...user, role });
  };

  const list = role === 'customer' ? customers : staff;

  return (
    <div style={{
      minHeight: '100dvh',
      background: `linear-gradient(oklch(0.1 0 0 / 0.55), oklch(0.1 0 0 / 0.7)), url('${BG_IMAGE}') center/cover no-repeat`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Satoshi', 'Inter', sans-serif",
      color: 'white',
      padding: '2rem',
      textAlign: 'center',
    }}>

      {screen === 'home' && (
        <>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Gar&apos;s Bodega
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.4rem)', color: 'rgba(255,255,255,0.75)', marginBottom: '3rem', maxWidth: '40ch' }}>
            Hero supplies, potions, and power-up snacks. Open to all of Plaza.
          </p>
          <p style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
            Continue as
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => handleRoleClick('customer')}
              style={btnStyle('#01696f')}
            >
              Customer
            </button>
            <button
              onClick={() => handleRoleClick('staff')}
              style={btnStyle('#4a3728')}
            >
              Staff Member
            </button>
          </div>
        </>
      )}

      {screen === 'pick' && (
        <>
          <button
            onClick={() => setScreen('home')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.5rem', alignSelf: 'flex-start' }}
          >
            ← Back
          </button>

          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 700, marginBottom: '0.5rem' }}>
            {role === 'customer' ? 'Choose your account' : 'Choose your staff profile'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {role === 'customer' ? 'Select a customer to sign in as' : 'Select a staff member to sign in as'}
          </p>

          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading...</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem',
              width: '100%',
              maxWidth: '700px'
            }}>
              {list.map((u) => (
                <button
                  key={u.customer_id || u.staff_id}
                  onClick={() => handleSelect(u)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '1.25rem 1rem',
                    color: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 180ms',
                    backdropFilter: 'blur(8px)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {u.first_name} {u.last_name}
                  </p>
                  {role === 'customer' && (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      Balance: ${Number(u.account_balance).toFixed(2)}
                    </p>
                  )}
                  {role === 'staff' && (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      {u.job_title}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg,
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '0.9rem 2.5rem',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Satoshi', 'Inter', sans-serif",
    letterSpacing: '0.01em',
    transition: 'opacity 180ms',
  };
}
