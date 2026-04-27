import { useState, useEffect } from 'react';

const STATUS_COLOR = {
  pending:    'badge-yellow',
  issued:     'badge-blue',
  sent:       'badge-purple',
  received:   'badge-green',
  scheduled:  'badge-yellow',
  in_transit: 'badge-blue',
  delivered:  'badge-green',
};

const badge = (status) => STATUS_COLOR[status] || 'badge-gray';

const DeliveryTypePill = ({ type }) => (
  <span style={{
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    background: type === 'express' ? 'var(--color-warning-highlight)' : 'var(--color-surface-offset)',
    color: type === 'express' ? 'var(--color-warning)' : 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }}>
    {type === 'express' ? '⚡ Express' : '📦 Standard'}
  </span>
);

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
        setOrders(await res.json());
      } finally { setLoading(false); }
    })();
  }, []);

  const viewOrder = async (orderId) => {
    setSelected(orderId);
    const res = await fetch(`/api/orders/${customerId}/${orderId}`);
    setDetail(await res.json());
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading orders...</p>;

  /* ── ORDER DETAIL VIEW ── */
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

      {/* Status + delivery summary */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Order Status</p>
            <span className={`badge ${badge(detail.order_status)}`}>{detail.order_status}</span>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Delivery Status</p>
            <span className={`badge ${badge(detail.delivery_status)}`}>{detail.delivery_status || '—'}</span>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Delivery Type</p>
            {detail.delivery_type ? <DeliveryTypePill type={detail.delivery_type} /> : <span>—</span>}
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Ship Date</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              {detail.ship_date ? new Date(detail.ship_date).toLocaleDateString() : 'Awaiting issue'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Est. Delivery</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              {detail.estimated_delivery_date ? new Date(detail.estimated_delivery_date).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Payment */}
      {detail.card_last_four && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <p style={{ fontWeight: 700, marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>Payment</p>
          <p style={{ fontSize: 'var(--text-sm)' }}>
            {detail.card_type} ···{detail.card_last_four}
          </p>
        </div>
      )}

      {/* Delivery address */}
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

      {/* Items + cost breakdown */}
      <div className="card">
        <p style={{ fontWeight: 700, marginBottom: 'var(--space-3)' }}>Items</p>
        <div className="order-items-list">
          {detail.items?.map((item) => (
            <div key={item.product_id} className="order-item-row">
              <span>{item.product_name} &times; {item.quantity}</span>
              <span>${Number(item.item_total).toFixed(2)}</span>
            </div>
          ))}
        </div>
        {detail.delivery_price != null && (
          <>
            <div className="order-item-row" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-divider)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
              <span>Delivery ({detail.delivery_type})</span>
              <span>+${Number(detail.delivery_price).toFixed(2)}</span>
            </div>
            <div className="order-item-row" style={{ fontWeight: 700, marginTop: 'var(--space-2)' }}>
              <span>Order Total</span>
              <span style={{ color: 'var(--color-primary)' }}>${Number(detail.order_total).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  /* ── ORDER LIST VIEW ── */
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
                <th>Order #</th>
                <th>Date</th>
                <th>Delivery</th>
                <th>Total</th>
                <th>Status</th>
                <th>Est. Delivery</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id}>
                  <td>#{o.order_id}</td>
                  <td>{new Date(o.order_date).toLocaleDateString()}</td>
                  <td>{o.delivery_type ? <DeliveryTypePill type={o.delivery_type} /> : '—'}</td>
                  <td>${Number(o.order_total).toFixed(2)}</td>
                  <td><span className={`badge ${badge(o.order_status)}`}>{o.order_status}</span></td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {o.estimated_delivery_date ? new Date(o.estimated_delivery_date).toLocaleDateString() : '—'}
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
