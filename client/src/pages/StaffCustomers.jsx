import { useState, useEffect } from 'react';

const emptyForm = { first_name: '', middle_name: '', last_name: '', account_balance: '0.00' };

/* Map order_status / delivery_status to badge class */
const STATUS_COLOR = {
  pending:    'badge-yellow',
  issued:     'badge-blue',
  sent:       'badge-purple',
  received:   'badge-green',
  scheduled:  'badge-yellow',
  in_transit: 'badge-blue',
  delivered:  'badge-green',
};
const badge = (s) => STATUS_COLOR[s] || 'badge-gray';

/* What label to show on the Advance button per current status */
const NEXT_STATUS_LABEL = {
  pending: 'Mark Issued',
  issued:  'Mark Sent',
  sent:    'Mark Received',
};

export default function StaffCustomers() {
  const [customers, setCustomers]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [feedback, setFeedback]     = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [creating, setCreating]     = useState(false);
  const [advancing, setAdvancing]   = useState(null); // orderId currently being advanced

  const flash = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

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

  /* Re-fetch just the customer detail (refreshes order statuses after advance) */
  const refreshDetail = async () => {
    const res = await fetch(`/api/staff/customers/${selected}`);
    setDetail(await res.json());
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/staff/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create customer');
      flash('success', `Customer "${data.customer.first_name} ${data.customer.last_name}" created (ID #${data.customer.customer_id})!`);
      setForm(emptyForm);
      fetchCustomers();
    } catch (err) {
      flash('error', err.message);
    }
    setCreating(false);
  };

  /* Advance an order's status one step */
  const advanceOrder = async (orderId) => {
    setAdvancing(orderId);
    try {
      const res = await fetch(`/api/staff/orders/${orderId}/advance`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance order');
      flash('success', data.message);
      refreshDetail();
    } catch (err) {
      flash('error', err.message);
    }
    setAdvancing(null);
  };

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading customers...</p>;

  /* ── CUSTOMER DETAIL VIEW ── */
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
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Delivery</th>
                <th>Total</th>
                <th>Order Status</th>
                <th>Delivery Status</th>
                <th>Est. Delivery</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {detail.orders.map((o) => {
                const nextLabel = NEXT_STATUS_LABEL[o.order_status];
                return (
                  <tr key={o.order_id}>
                    <td>#{o.order_id}</td>
                    <td>{new Date(o.order_date).toLocaleDateString()}</td>
                    <td>
                      {o.delivery_type ? (
                        <span style={{
                          fontSize: 'var(--text-xs)', fontWeight: 700,
                          color: o.delivery_type === 'express' ? 'var(--color-warning)' : 'var(--color-text-muted)',
                          textTransform: 'uppercase',
                        }}>
                          {o.delivery_type === 'express' ? '⚡' : '📦'} {o.delivery_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td>${Number(o.order_total).toFixed(2)}</td>
                    <td><span className={`badge ${badge(o.order_status)}`}>{o.order_status}</span></td>
                    <td><span className={`badge ${badge(o.delivery_status)}`}>{o.delivery_status || '—'}</span></td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {o.estimated_delivery_date ? new Date(o.estimated_delivery_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {nextLabel ? (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={advancing === o.order_id}
                          onClick={() => advanceOrder(o.order_id)}
                        >
                          {advancing === o.order_id ? '...' : nextLabel}
                        </button>
                      ) : (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Complete</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  /* ── CUSTOMER LIST VIEW ── */
  return (
    <div>
      <div className="page-header">
        <h2>Customers</h2>
        <p>Add new customers or view and manage their orders</p>
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
                <label>Middle Name</label>
                <input placeholder="(optional)" {...f('middle_name')} />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input placeholder="e.g. Kent" {...f('last_name')} required />
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
              <tr><th>ID</th><th>Name</th><th>Balance</th><th></th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.customer_id}>
                  <td>#{c.customer_id}</td>
                  <td style={{ fontWeight: 600 }}>
                    {c.first_name}{c.middle_name ? ` ${c.middle_name}` : ''} {c.last_name}
                  </td>
                  <td>${Number(c.account_balance).toFixed(2)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => viewCustomer(c.customer_id)}>
                      View Orders
                    </button>
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
