import { useState, useEffect, useMemo } from 'react';

const DELIVERY_OPTIONS = [
  { value: 'standard', label: 'Standard (5 days)', price: 4.99 },
  { value: 'express',  label: 'Express (3 days)',  price: 9.99 },
];

export default function Cart({ customerId, onCartUpdate, onNavigate }) {
  const [cart, setCart] = useState({ items: [], cart_total: '0.00' });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cards, setCards] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState('standard');
  const [placing, setPlacing] = useState(false);

  const deliveryAddresses = useMemo(
    () => addresses.filter((a) => a.address_type === 'delivery' || a.address_type === 'both'),
    [addresses]
  );

  const deliveryPrice = DELIVERY_OPTIONS.find((o) => o.value === deliveryType)?.price ?? 4.99;
  const itemsTotal   = Number(cart.cart_total);
  const orderTotal   = itemsTotal + deliveryPrice;

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cart/${customerId}`);
      setCart(await res.json());
    } finally { setLoading(false); }
  };

  const fetchCards = async () => {
    try {
      const res = await fetch(`/api/account/${customerId}/cards`);
      const data = await res.json();
      setCards(data);
      if (data.length > 0) setSelectedCard(data[0].card_id);
    } catch { setCards([]); }
  };

  const fetchAddresses = async () => {
    try {
      const res = await fetch(`/api/account/${customerId}/addresses`);
      const data = await res.json();
      setAddresses(data);
      const first = data.find((a) => a.address_type === 'delivery' || a.address_type === 'both');
      setSelectedDeliveryAddress(first?.address_id || '');
    } catch { setAddresses([]); }
  };

  useEffect(() => { fetchCart(); fetchCards(); fetchAddresses(); }, []);

  const updateQty = async (productId, qty) => {
    await fetch(`/api/cart/${customerId}/items/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty }),
    });
    fetchCart();
    onCartUpdate();
  };

  const removeItem = async (productId) => {
    await fetch(`/api/cart/${customerId}/items/${productId}`, { method: 'DELETE' });
    fetchCart();
    onCartUpdate();
  };

  const placeOrder = async () => {
    if (!selectedDeliveryAddress) {
      setFeedback({ type: 'error', msg: 'Please choose a delivery address before placing the order.' });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch(`/api/orders/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_id: Number(selectedDeliveryAddress),
          card_id: selectedCard || null,
          delivery_type: deliveryType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');
      setShowCheckout(false);
      setFeedback({
        type: 'success',
        msg: `Order #${data.order_id} placed! ${deliveryType === 'express' ? 'Express' : 'Standard'} delivery — est. ${new Date(data.estimated_delivery).toLocaleDateString()}`,
      });
      fetchCart();
      onCartUpdate();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
      setShowCheckout(false);
    }
    setPlacing(false);
    setTimeout(() => setFeedback(null), 5000);
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading cart...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Shopping Cart</h2>
      </div>

      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}

      {!cart.items || cart.items.length === 0 ? (
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p>Browse products and add some items to get started.</p>
          <button className="btn btn-primary" onClick={() => onNavigate('products')}>Browse Products</button>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {cart.items.map((item) => (
              <div key={item.product_id} className="cart-item">
                <div className="cart-item-info">
                  <h4>{item.product_name}</h4>
                  <p>${Number(item.current_price).toFixed(2)} each &nbsp;&middot;&nbsp; Subtotal: ${Number(item.item_total).toFixed(2)}</p>
                </div>
                <div className="qty-controls">
                  <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</button>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.product_id)}>Remove</button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <span className="cart-total">Items: ${itemsTotal.toFixed(2)}</span>
            <button className="btn btn-primary" onClick={() => setShowCheckout(true)}>Proceed to Checkout</button>
          </div>
        </>
      )}

      {showCheckout && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCheckout(false); }}>
          <div className="modal">
            <h3>Confirm Order</h3>

            {/* Delivery address */}
            {deliveryAddresses.length === 0 ? (
              <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                You need a delivery or both-type address on your account before placing an order.
              </p>
            ) : (
              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label>Deliver to</label>
                <select value={selectedDeliveryAddress} onChange={(e) => setSelectedDeliveryAddress(e.target.value)}>
                  {deliveryAddresses.map((a) => (
                    <option key={a.address_id} value={a.address_id}>
                      {a.street}, {a.city}, {a.state_name} {a.zip_code}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Delivery type */}
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>Delivery Type</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                {DELIVERY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      padding: 'var(--space-3) var(--space-4)',
                      border: `2px solid ${deliveryType === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: deliveryType === opt.value ? 'var(--color-primary-highlight)' : 'transparent',
                      flex: 1,
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      value={opt.value}
                      checked={deliveryType === opt.value}
                      onChange={() => setDeliveryType(opt.value)}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{opt.label}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                      +${opt.price.toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment card */}
            {cards.length > 0 ? (
              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label>Pay with</label>
                <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)}>
                  {cards.map((c) => (
                    <option key={c.card_id} value={c.card_id}>
                      {c.card_type} ···{c.card_last_four} — {c.cardholder_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                No credit cards on file. Order will be charged to account balance.
              </p>
            )}

            {/* Order total breakdown */}
            <div style={{
              background: 'var(--color-surface-offset)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-5)',
              fontSize: 'var(--text-sm)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Items</span>
                <span>${itemsTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Delivery ({deliveryType})</span>
                <span>+${deliveryPrice.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-2)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-primary)' }}>${orderTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowCheckout(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={placeOrder}
                disabled={placing || deliveryAddresses.length === 0}
              >
                {placing ? 'Placing...' : `Place Order — $${orderTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
