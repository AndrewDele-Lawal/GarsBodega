import { useState, useEffect, useMemo } from 'react';

export default function Account({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [cards, setCards] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [topUp, setTopUp] = useState('');
  const [topUpCardId, setTopUpCardId] = useState('');

  const [addrForm, setAddrForm] = useState({
    street: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    address_type: 'both'
  });

  const [cardForm, setCardForm] = useState({
    card_last_four: '',
    card_type: 'Visa',
    expiration_date: '',
    cardholder_name: '',
    address_id: ''
  });

  const flash = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const paymentAddresses = useMemo(
    () => addresses.filter(
      (a) => a.address_type === 'payment' || a.address_type === 'both'
    ),
    [addresses]
  );

  const fetchAll = async () => {
    const [cRes, aRes, ccRes] = await Promise.all([
      fetch(`/api/customers/${customerId}`),
      fetch(`/api/account/${customerId}/addresses`),
      fetch(`/api/account/${customerId}/cards`)
    ]);

    setCustomer(await cRes.json());

    const addressData = await aRes.json();
    setAddresses(addressData);

    const ccData = await ccRes.json();
    setCards(ccData);

    if (ccData.length > 0) {
      setCardForm((f) => ({ ...f, address_id: ccData[0].address_id || '' }));
      setTopUpCardId(ccData[0].card_id);
    } else {
      const firstPaymentAddress = addressData.find(
        (a) => a.address_type === 'payment' || a.address_type === 'both'
      );
      setCardForm((f) => ({ ...f, address_id: firstPaymentAddress?.address_id || '' }));
    }
  };

  useEffect(() => { fetchAll(); }, []);

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
      setAddrForm({
        street: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        address_type: 'both'
      });
      fetchAll();
    } catch (err) {
      flash('error', err.message);
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      const res = await fetch(`/api/account/${customerId}/addresses/${addressId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash('success', 'Address deleted.');
      fetchAll();
    } catch (err) {
      flash('error', err.message);
    }
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
      setCardForm({
        card_last_four: '',
        card_type: 'Visa',
        expiration_date: '',
        cardholder_name: '',
        address_id: paymentAddresses[0]?.address_id || ''
      });
      fetchAll();
    } catch (err) {
      flash('error', err.message);
    }
  };

  if (!customer) return <p>Loading account...</p>;

  return (
    <div>
      <h1>My Account</h1>

      {feedback && <div>{feedback.msg}</div>}

      <section>
        <h2>Addresses</h2>

        {addresses.length === 0 ? (
          <p>No addresses yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {addresses.map((a) => (
              <div key={a.address_id} className="card">
                <p>{a.street}</p>
                <p>{a.city}, {a.state_name} {a.zip_code}</p>
                <p>{a.country}</p>
                <p>{a.address_type}</p>
                <button onClick={() => deleteAddress(a.address_id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addAddress}>
          <input
            placeholder="Street"
            value={addrForm.street}
            onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
            required
          />
          <input
            placeholder="City"
            value={addrForm.city}
            onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
            required
          />
          <input
            placeholder="State"
            value={addrForm.state}
            onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
            required
          />
          <input
            placeholder="ZIP Code"
            value={addrForm.zip_code}
            onChange={(e) => setAddrForm({ ...addrForm, zip_code: e.target.value })}
            required
          />
          <input
            placeholder="Country"
            value={addrForm.country}
            onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })}
            required
          />
          <select
            value={addrForm.address_type}
            onChange={(e) => setAddrForm({ ...addrForm, address_type: e.target.value })}
          >
            <option value="both">Delivery & Payment</option>
            <option value="delivery">Delivery only</option>
            <option value="payment">Payment only</option>
          </select>
          <button type="submit">Add Address</button>
        </form>
      </section>

      <section>
        <h2>Credit Cards</h2>

        {paymentAddresses.length === 0 ? (
          <p>Add a payment or both-type address before adding a card.</p>
        ) : (
          <form onSubmit={addCard}>
            <input
              placeholder="Last 4 digits"
              maxLength={4}
              value={cardForm.card_last_four}
              onChange={(e) => setCardForm({ ...cardForm, card_last_four: e.target.value })}
              required
            />
            <select
              value={cardForm.card_type}
              onChange={(e) => setCardForm({ ...cardForm, card_type: e.target.value })}
            >
              <option>Visa</option>
              <option>Mastercard</option>
              <option>Amex</option>
              <option>Discover</option>
            </select>
            <input
              placeholder="Cardholder name"
              value={cardForm.cardholder_name}
              onChange={(e) => setCardForm({ ...cardForm, cardholder_name: e.target.value })}
              required
            />
            <input
              placeholder="Expiration date (MM/YY)"
              value={cardForm.expiration_date}
              onChange={(e) => setCardForm({ ...cardForm, expiration_date: e.target.value })}
              required
            />
            <select
              value={cardForm.address_id}
              onChange={(e) => setCardForm({ ...cardForm, address_id: e.target.value })}
              required
            >
              {paymentAddresses.map((a) => (
                <option key={a.address_id} value={a.address_id}>
                  {a.street}, {a.city}
                </option>
              ))}
            </select>
            <button type="submit">Add Card</button>
          </form>
        )}
      </section>
    </div>
  );
}