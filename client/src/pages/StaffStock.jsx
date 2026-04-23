import { useState, useEffect } from 'react';

export default function StaffStock() {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ warehouse_id: '', product_id: '', quantity: '' });
  const [feedback, setFeedback] = useState(null);

  const flash = (type, msg) => { setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 3000); };

  useEffect(() => {
    (async () => {
      const [wRes, pRes] = await Promise.all([
        fetch('/api/staff/warehouses/all'),
        fetch('/api/products')
      ]);
      const wData = await wRes.json();
      const pData = await pRes.json();
      setWarehouses(wData);
      setProducts(pData);
      if (wData.length > 0) setForm((f) => ({ ...f, warehouse_id: wData[0].warehouse_id }));
      if (pData.length > 0) setForm((f) => ({ ...f, product_id: pData[0].product_id }));
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/staff/warehouses/${form.warehouse_id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: form.product_id, quantity: Number(form.quantity) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash('success', data.message);
      setForm((f) => ({ ...f, quantity: '' }));
    } catch (err) { flash('error', err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Manage Stock</h2>
        <p>Add inventory to a warehouse</p>
      </div>

      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}

      <div className="card" style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label>Warehouse</label>
              <select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} required>
                {warehouses.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    Warehouse #{w.warehouse_id}{w.location ? ` — ${w.location}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Product</label>
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} (current stock: {p.total_stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity to Add</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">Add Stock</button>
          </div>
        </form>
      </div>
    </div>
  );
}