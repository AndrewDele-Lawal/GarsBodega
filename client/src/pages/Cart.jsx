import { useState, useEffect } from 'react';

export default function Cart({ customerId, onCartUpdate, onNavigate }) {
  const [cart, setCart] = useState({ items: [], cart_total: '0.00' });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [placing, setPlacing] = useState(false);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cart/${customerId}`);
      const data = await res.json();
      setCart(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async () => {
    try {
      const res = await fetch(`/api/account/${customerId}/cards`);
      const data = await res.json();
      setCards(data);
      if (data.length > 0) setSelectedCard(data[0].card_id);
    } catch { setCards([]); }
  };

  useEffect(() => { fetchCart(); fetchCards(); }, []);

  const updateQty = async (productId, qty) => {
    await fetch(`/api/cart/${customerId}/items/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty })
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
    setPlacing(true);
    try {
      const res = await fetch(`/api/orders/${customerId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');
      setShowCheckout(false);
      setFeedback({ type: 'success', msg: `Order #${data.order_id} placed! Estimated delivery: ${data.estimated_delivery}` });
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
        <p>{cart.items?.length || 0} item{cart.items?.length !== 1 ? 's' : ''}</p>
      </div>

      {feedback && (
        <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>
      )}

      {!cart.items || cart.items.length === 0 ? (
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p>Browse products and add some items to get started.</p>
          <button className="btn btn-primary" onClick={() => onNavigate('products')}>
            Browse Products
          </button>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {cart.items.map((item) => (
              <div key={item.product_id} className="cart-item">
                <div className="cart-item-info">
                  <h4>{item.product_name}</h4>
                  <p>${Number(item.current_price).toFixed(2)} each · Subtotal: ${Number(item.item_total).toFixed(2)}</p>
                </div>
                <div className="qty-controls">
                  <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.product_id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <span className="cart-total">Total: ${Number(cart.cart_total).toFixed(2)}</span>
            <button className="btn btn-primary" onClick={() => setShowCheckout(true)}>
              Proceed to Checkout
            </button>
          </div>
        </>
      )}

      {showCheckout && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Order</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              Order total: <strong style={{ color: 'var(--color-text)' }}>${Number(cart.cart_total).toFixed(2)}</strong>
            </p>

            {cards.length > 0 ? (
              <div className="form-group">
                <label>Pay with</label>
                <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)}>
                  {cards.map((c) => (
                    <option key={c.card_id} value={c.card_id}>
                      {c.card_type} ending in {c.card_last_four} — {c.cardholder_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)' }}>
                No credit cards on file. Order will be charged to account balance.
              </p>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowCheckout(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={placeOrder} disabled={placing}>
                {placing ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}