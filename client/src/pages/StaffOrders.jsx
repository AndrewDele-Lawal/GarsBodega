import { useState, useEffect } from 'react';

export default function StaffOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const flash = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/staff/orders');
      const data = await res.json();
      setOrders(data);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleUpdateStatus = async (orderId, statusName) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/staff/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_name: statusName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      flash('success', `Order #${orderId} status updated to "${statusName}"`);
      fetchOrders();
    } catch (err) {
      flash('error', err.message);
    }
    setUpdatingOrder(null);
  };

  const statusBadge = (status) => {
    const map = {
      issued: 'badge-yellow',
      sent: 'badge-blue',
      received: 'badge-green',
      scheduled: 'badge-blue',
      delivered: 'badge-green',
      cancelled: 'badge-red'
    };
    return map[status?.toLowerCase()] || 'badge-gray';
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading orders...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>All Orders</h2>
        <p>View and manage all customer orders</p>
      </div>
      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}
      {orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>No orders have been placed.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Order Status</th>
                <th>Delivery Status</th>
                <th>Est. Delivery</th>
                <th>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id}>
                  <td>#{o.order_id}</td>
                  <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                  <td>{new Date(o.order_date).toLocaleDateString()}</td>
                  <td>${Number(o.order_total).toFixed(2)}</td>
                  <td><span className={`badge ${statusBadge(o.order_status)}`}>{o.order_status}</span></td>
                  <td><span className={`badge ${statusBadge(o.delivery_status)}`}>{o.delivery_status || 'N/A'}</span></td>
                  <td>{o.estimated_delivery_date ? new Date(o.estimated_delivery_date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <select
                      defaultValue=""
                      disabled={updatingOrder === o.order_id}
                      onChange={(e) => {
                        if (e.target.value) handleUpdateStatus(o.order_id, e.target.value);
                      }}
                      style={{ fontSize: 'var(--text-xs)', padding: '2px 4px' }}
                    >
                      <option value="" disabled>Change…</option>
                      <option value="issued">issued</option>
                      <option value="sent">sent</option>
                      <option value="received">received</option>
                    </select>
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
