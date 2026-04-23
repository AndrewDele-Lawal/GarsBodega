import { useState, useEffect } from 'react';

export default function Account({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [cards, setCards] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [topUp, setTopUp] = useState('');

  // Address form
  const [addrForm, setAddrForm] = useState({ street: '', city: '', state: '', zip_code: '', country: '', address_type: 'both' });
  // Card form
  const [cardForm, setCardForm] = useState({ card_last_four: '', card_type: 'Visa', expiration_date: '', cardholder_name: '', address_id: '' });

  const flash = (type, msg) => { setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 3000); };

  const fetchAll = async () => {
    const [cRes, aRes, ccRes] = await Promise.all([
      fetch(`/api/customers/${customerId}`),
      fetch(`/api/account/${customerId}/addresses`),
      fetch(`/api/account/${customerId}/cards`)
    ]);
    setCustomer(await cRes.json());
    setAddresses(await aRes.json());
    const ccData = await ccRes.json();
    setCards(ccData);
    if (ccData.length > 0) setCardForm((f) => ({ ...f, address_id: ccData[0].address_id || '' }));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleTopUp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/customers/${customerId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: topUp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopUp('');
      flash('success', `Balance updated to $${Number(data.customer.account_balance).toFixed(2)}`);
      fetchAll();
    } catch (err) { flash('error', err.message); }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/account/${customerId}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addrForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash('success', 'Address added!');
      setAddrForm({ street: '', city: '', state: '', zip_code: '', country: '', address_type: 'both' });
      fetchAll();
    } catch (err) { flash('error', err.message); }
  };

  const deleteAddress = async (addressId) => {
    try {
      const res = await fetch(`/api/account/${customerId}/addresses/${addressId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash('success', 'Address deleted.');
      fetchAll();
    } catch (err) { flash('error', err.message); }
  };

  const addCard = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/account/${customerId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash('success', 'Card added!');
      setCardForm({ card_last_four: '', card_type: 'Visa', expiration_date: '', cardholder_name: '', address_id: addresses[0]?.address_id || '' });
      fetchAll();
    } catch (err) { flash('error', err.message); }
  };

  const deleteCard = async (cardId) => {
    try {
      const res = await fetch(`/api/account/${customerId}/cards/${cardId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash('success', 'Card removed.');
      fetchAll();
    } catch (err) { flash('error', err.message); }
  };

  if (!customer) return <p style={{ color: 'var(--color-text-muted)' }}>Loading account...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>My Account</h2>
        <p>{customer.first_name} {customer.last_name}</p>
      </div>

      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}

      {/* Balance */}
      <div className="card">
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Account Balance</p>
        <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', margin: 'var(--space-1) 0 var(--space-4)' }}>
          ${Number(customer.account_balance).toFixed(2)}
        </p>
        <form onSubmit={handleTopUp} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <input type="number" min="1" step="0.01" placeholder="Amount to add" value={topUp} onChange={(e) => setTopUp(e.target.value)} style={{ width: 180 }} />
          <button type="submit" className="btn btn-primary">Add Funds</button>
        </form>
      </div>

      {/* Addresses */}
      <div className="section-gap">
        <p className="section-title">Addresses</p>

        {addresses.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>No addresses yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {addresses.map((a) => (
              <div key={a.address_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{a.street}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{a.city}, {a.state} {a.zip_code}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{a.country}</p>
                <span className="badge badge-gray" style={{ width: 'fit-content' }}>{a.address_type}</span>
                <button className="btn btn-danger btn-sm" onClick={() => deleteAddress(a.address_id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <p style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Add Address</p>
          <form onSubmit={addAddress}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <input placeholder="Street" value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} required />
              <div className="form-row">
                <input placeholder="City" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} required />
                <input placeholder="State" value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} required />
              </div>
              <div className="form-row">
                <input placeholder="ZIP Code" value={addrForm.zip_code} onChange={(e) => setAddrForm({ ...addrForm, zip_code: e.target.value })} required />
                <input placeholder="Country" value={addrForm.country} onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })} required />
              </div>
              <select value={addrForm.address_type} onChange={(e) => setAddrForm({ ...addrForm, address_type: e.target.value })}>
                <option value="both">Delivery & Payment</option>
                <option value="delivery">Delivery only</option>
                <option value="payment">Payment only</option>
              </select>
              <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>Add Address</button>
            </div>
          </form>
        </div>
      </div>

      {/* Credit Cards */}
      <div className="section-gap">
        <p className="section-title">Credit Cards</p>

        {cards.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>No cards on file.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {cards.map((c) => (
              <div key={c.card_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <p style={{ fontWeight: 700 }}>{c.card_type} ···· {c.card_last_four}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{c.cardholder_name}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Exp: {c.expiration_date}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{c.street}, {c.city}</p>
                <button className="btn btn-danger btn-sm" onClick={() => deleteCard(c.card_id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <p style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Add Credit Card</p>
          {addresses.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)' }}>Add an address first before adding a card.</p>
          ) : (
            <form onSubmit={addCard}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="form-row">
                  <input placeholder="Last 4 digits" maxLength={4} value={cardForm.card_last_four} onChange={(e) => setCardForm({ ...cardForm, card_last_four: e.target.value })} required />
                  <select value={cardForm.card_type} onChange={(e) => setCardForm({ ...cardForm, card_type: e.target.value })}>
                    <option>Visa</option><option>Mastercard</option><option>Amex</option><option>Discover</option>
                  </select>
                </div>
                <input placeholder="Cardholder name" value={cardForm.cardholder_name} onChange={(e) => setCardForm({ ...cardForm, cardholder_name: e.target.value })} required />
                <input placeholder="Expiration date (MM/YY)" value={cardForm.expiration_date} onChange={(e) => setCardForm({ ...cardForm, expiration_date: e.target.value })} required />
                <select value={cardForm.address_id} onChange={(e) => setCardForm({ ...cardForm, address_id: e.target.value })} required>
                  {addresses.map((a) => (
                    <option key={a.address_id} value={a.address_id}>{a.street}, {a.city}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>Add Card</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}