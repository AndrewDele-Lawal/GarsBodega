import { useState, useEffect, useMemo } from 'react';

export default function Cart({ customerId, onCartUpdate, onNavigate }) {
  const [cart, setCart] = useState({ items: [], cart_total: '0.00' });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cards, setCards] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState('');
  const [placing, setPlacing] = useState(false);

  const deliveryAddresses = useMemo(
    () => addresses.filter(
      (a) => a.address_type === 'delivery' || a.address_type === 'both'
    ),
    [addresses]
  );

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
    } catch {
      setCards([]);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await fetch(`/api/account/${customerId}/addresses`);
      const data = await res.json();
      setAddresses(data);

      const firstDeliveryAddress = data.find(
        (a) => a.address_type === 'delivery' || a.address_type === 'both'
      );
      setSelectedDeliveryAddress(firstDeliveryAddress?.address_id || '');
    } catch {
      setAddresses([]);
    }
  };

  useEffect(() => {
    fetchCart();
    fetchCards();
    fetchAddresses();
  }, []);

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
          card_id: selectedCard || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');

      setShowCheckout(false);
      setFeedback({
        type: 'success',
        msg: `Order #${data.order_id} placed! Estimated delivery: ${data.estimated_delivery}`
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

  if (loading) return <p>Loading cart...</p>;

  return (
    <div>
      <h1>Shopping Cart</h1>

      {feedback && <div>{feedback.msg}</div>}

      {!cart.items || cart.items.length === 0 ? (
        <div>
          <h3>Your cart is empty</h3>
          <p>Browse products and add some items to get started.</p>
          <button onClick={() => onNavigate('products')}>Browse Products</button>
        </div>
      ) : (
        <>
          {cart.items.map((item) => (
            <div key={item.product_id} className="card">
              <h4>{item.product_name}</h4>
              <p>
                ${Number(item.current_price).toFixed(2)} each · Subtotal: $
                {Number(item.item_total).toFixed(2)}
              </p>
              <button onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</button>
              <button onClick={() => removeItem(item.product_id)}>Remove</button>
            </div>
          ))}

          <h3>Total: ${Number(cart.cart_total).toFixed(2)}</h3>
          <button onClick={() => setShowCheckout(true)}>Proceed to Checkout</button>
        </>
      )}

      {showCheckout && (
        <div className="card">
          <h3>Confirm Order</h3>
          <p>Order total: <strong>${Number(cart.cart_total).toFixed(2)}</strong></p>

          {deliveryAddresses.length === 0 ? (
            <p>You need a delivery or both-type address on your account before placing an order.</p>
          ) : (
            <>
              <label>Deliver to</label>
              <select
                value={selectedDeliveryAddress}
                onChange={(e) => setSelectedDeliveryAddress(e.target.value)}
              >
                {deliveryAddresses.map((a) => (
                  <option key={a.address_id} value={a.address_id}>
                    {a.street}, {a.city}, {a.state_name} {a.zip_code}
                  </option>
                ))}
              </select>
            </>
          )}

          {cards.length > 0 ? (
            <>
              <label>Pay with</label>
              <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)}>
                {cards.map((c) => (
                  <option key={c.card_id} value={c.card_id}>
                    {c.card_type} ending in {c.card_last_four} — {c.cardholder_name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p>No credit cards on file. Order will be charged to account balance.</p>
          )}

          <button onClick={() => setShowCheckout(false)}>Cancel</button>
          <button
            onClick={placeOrder}
            disabled={placing || deliveryAddresses.length === 0}
          >
            {placing ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  );
}