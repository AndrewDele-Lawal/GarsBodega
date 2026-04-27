import { useState, useEffect } from 'react';

const emptyForm = {
  first_name: '', last_name: '', email: '', phone_number: '', account_balance: '0.00'
};

export default function StaffCustomers() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const flash = (type, msg) => { setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 4000); };

  const fetchCustomers = async () => {
    const res = await fetch('/api/staff/customers/all');
    setCustomers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const viewCustomer = async (customerId) => {
    setSelected(customerId);
    const res = await fetch(`/api/staff/customers/${customerId}`);
    setDetail(await res.json());
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/staff/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create customer');
      flash('success', `Customer "${data.first_name} ${data.last_name}" created (ID #${data.customer_id})!`);
      setForm(emptyForm);
      fetchCustomers();
    } catch (err) {
      flash('error', err.message);
    }
    setCreating(false);
  };

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
      // Refresh customer detail
      const detailRes = await fetch(`/api/staff/customers/${selected}`);
      setDetail(await detailRes.json());
    } catch (err) {
      flash('error', err.message);
    }
    setUpdatingOrder(null);
  };

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value })
  });

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

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading customers...</p>;

  if (selected && detail) return (
    <div>
      <div className="detail-back">
        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(null); setDetail(null); }}>
          ← Back to Customers
        </button>
      </div>
      <div className="page-header">
        <h2>{detail.customer.first_name} {detail.customer.last_name}</h2>
        <p>Customer #{detail.customer.customer_id} · Balance: ${Number(detail.customer.account_balance).toFixed(2)}</p>
      </div>
      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}
      {detail.orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>This customer hasn't placed any orders.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr><th>Order #</th><th>Date</th><th>Total</th><th>Status</th><th>Delivery</th><th>Update Status</th></tr>
            </thead>
            <tbody>
              {detail.orders.map((o) => (
                <tr key={o.order_id}>
                  <td>#{o.order_id}</td>
                  <td>{new Date(o.order_date).toLocaleDateString()}</td>
                  <td>${Number(o.order_total).toFixed(2)}</td>
                  <td><span className={`badge ${statusBadge(o.order_status)}`}>{o.order_status}</span></td>
                  <td><span className={`badge ${statusBadge(o.delivery_status)}`}>{o.delivery_status || 'N/A'}</span></td>
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

  return (
    <div>
      <div className="page-header">
        <h2>Customers</h2>
        <p>Add new customers or view existing order history</p>
      </div>
      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}
      {/* Add Customer Form */}
      <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
        <p style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Add New Customer</p>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input placeholder="e.g. Clark" {...f('first_name')} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input placeholder="e.g. Kent" {...f('last_name')} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input type="email" placeholder="email@example.com" {...f('email')} required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input placeholder="e.g. 555-123-4567" {...f('phone_number')} />
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label>Starting Balance ($)</label>
              <input type="number" min="0" step="0.01" {...f('account_balance')} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Add Customer'}
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* Customer Table */}
      {customers.length === 0 ? (
        <div className="empty-state">
          <h3>No customers yet</h3>
          <p>Use the form above to add the first customer.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Email</th><th>Balance</th><th></th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.customer_id}>
                  <td>#{c.customer_id}</td>
                  <td style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{c.email}</td>
                  <td>${Number(c.account_balance).toFixed(2)}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => viewCustomer(c.customer_id)}>View Orders</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
