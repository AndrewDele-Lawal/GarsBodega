import { useState, useEffect } from 'react';

export default function StaffCustomers() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/staff/customers/all');
      setCustomers(await res.json());
      setLoading(false);
    })();
  }, []);

  const viewCustomer = async (customerId) => {
    setSelected(customerId);
    const res = await fetch(`/api/staff/customers/${customerId}`);
    setDetail(await res.json());
  };

  const statusBadge = (status) => {
    const map = { pending: 'badge-yellow', 'in transit': 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' };
    return map[status] || 'badge-gray';
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

      {detail.orders.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No orders for this customer.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr><th>Order #</th><th>Date</th><th>Total</th><th>Status</th><th>Delivery</th></tr>
            </thead>
            <tbody>
              {detail.orders.map((o) => (
                <tr key={o.order_id}>
                  <td>#{o.order_id}</td>
                  <td>{new Date(o.order_date).toLocaleDateString()}</td>
                  <td>${Number(o.order_total).toFixed(2)}</td>
                  <td><span className={`badge ${statusBadge(o.order_status)}`}>{o.order_status}</span></td>
                  <td><span className={`badge ${statusBadge(o.delivery_status)}`}>{o.delivery_status}</span></td>
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
        <p>View all customers and their order history</p>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Balance</th><th></th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.customer_id}>
                <td>#{c.customer_id}</td>
                <td style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                <td>${Number(c.account_balance).toFixed(2)}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => viewCustomer(c.customer_id)}>View Orders</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}