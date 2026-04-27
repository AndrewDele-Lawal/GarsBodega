import { useState, useEffect } from 'react';

const statusBadge = (status) => {
  const map = {
    pending: 'badge-yellow',
    issued: 'badge-yellow',
    'in transit': 'badge-blue',
    sent: 'badge-blue',
    scheduled: 'badge-blue',
    completed: 'badge-green',
    received: 'badge-green',
    cancelled: 'badge-red'
  };
  return map[status?.toLowerCase()] || 'badge-gray';
};

export default function Orders({ customerId }) {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${customerId}`);
        const data = await res.json();
        setOrders(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId]);

  const viewOrder = async (orderId) => {
    setSelected(orderId);
    const res = await fetch(`/api/orders/${customerId}/${orderId}`);
    const data = await res.json();
    setDetail(data);
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading orders...</p>;

  if (selected && detail) return (
    <div>
      <div className="detail-back">
        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(null); setDetail(null); }}>
          ← Back to Orders
        </button>
      </div>

      <div className="page-header">
        <h2>Order #{detail.order_id}</h2>
        <p>Placed on {new Date(detail.order_date).toLocaleDateString()}</p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Order Status</p>
            <span className={`badge ${statusBadge(detail.order_status)}`}>{detail.order_status}</span>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Delivery Status</p>
            <span className={`badge ${statusBadge(detail.delivery_status)}`}>{detail.delivery_status}</span>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Est. Delivery</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              {detail.estimated_delivery_date ? new Date(detail.estimated_delivery_date).toLocaleDateString() : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Order Total</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>
              ${Number(detail.order_total).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* ── DELIVERY ADDRESS ── */}
      {detail.delivery_street && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <p style={{ fontWeight: 700, marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>Delivering to</p>
          <p style={{ fontSize: 'var(--text-sm)' }}>{detail.delivery_street}</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {detail.delivery_city}, {detail.delivery_state} {detail.delivery_zip}
          </p>
          {detail.delivery_country && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{detail.delivery_country}</p>
          )}
        </div>
      )}

      <div className="card">
        <p style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Items</p>
        <div className="order-items-list">
          {detail.items?.map((item) => (
            <div key={item.product_id} className="order-item-row">
              <span>{item.product_name} × {item.quantity}</span>
              <span>${Number(item.item_total).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>My Orders</h2>
        <p>Your order history</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>Place your first order from the cart page.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Order #</th><th>Date</th><th>Total</th><th>Status</th><th>Delivery</th><th>Ship to</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id}>
                  <td>#{o.order_id}</td>
                  <td>{new Date(o.order_date).toLocaleDateString()}</td>
                  <td>${Number(o.order_total).toFixed(2)}</td>
                  <td><span className={`badge ${statusBadge(o.order_status)}`}>{o.order_status}</span></td>
                  <td><span className={`badge ${statusBadge(o.delivery_status)}`}>{o.delivery_status || '—'}</span></td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {o.delivery_street ? `${o.delivery_street}, ${o.delivery_city}` : '—'}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => viewOrder(o.order_id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
