import { useState, useEffect } from 'react';

export default function StaffStock() {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouseTotals, setWarehouseTotals] = useState({});
  const [form, setForm] = useState({ warehouse_id: '', product_id: '', quantity: '' });
  const [feedback, setFeedback] = useState(null);

  const flash = (type, msg) => { setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 5000); };

  const fetchWarehouses = async () => {
    const res = await fetch('/api/staff/warehouses/all');
    const data = await res.json();
    setWarehouses(data);
    return data;
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
    return data;
  };

  const fetchWarehouseTotals = async (wList) => {
    // For each warehouse, sum quantity_on_hand from Stock
    // We expose this via a simple GET on the warehouses route that returns stock totals
    // Instead we'll derive it client-side from the product list if available,
    // but since we want per-warehouse totals we call a separate endpoint.
    // For now compute from a dedicated summary fetch.
    try {
      const res = await fetch('/api/staff/warehouses/stock-summary');
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach((row) => { map[row.warehouse_id] = row; });
        setWarehouseTotals(map);
      }
    } catch { /* non-critical */ }
  };

  useEffect(() => {
    (async () => {
      const [wData, pData] = await Promise.all([fetchWarehouses(), fetchProducts()]);
      if (wData.length > 0) setForm((f) => ({ ...f, warehouse_id: wData[0].warehouse_id }));
      if (pData.length > 0) setForm((f) => ({ ...f, product_id: pData[0].product_id }));
      await fetchWarehouseTotals(wData);
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
      await Promise.all([fetchProducts(), fetchWarehouseTotals()]);
    } catch (err) { flash('error', err.message); }
  };

  const selectedWarehouse = warehouses.find((w) => w.warehouse_id === Number(form.warehouse_id));
  const warehouseSummary = warehouseTotals[Number(form.warehouse_id)];
  const used = warehouseSummary ? Number(warehouseSummary.total_on_hand) : null;
  const capacity = selectedWarehouse?.capacity_size ?? null;
  const available = capacity !== null && used !== null ? capacity - used : null;
  const usedPct = capacity && used !== null ? Math.min(100, Math.round((used / capacity) * 100)) : null;

  return (
    <div>
      <div className="page-header">
        <h2>Manage Stock</h2>
        <p>Add inventory to a warehouse</p>
      </div>

      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}

      <div className="card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            <div className="form-group">
              <label>Warehouse</label>
              <select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} required>
                {warehouses.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    Warehouse #{w.warehouse_id}{w.location ? ` — ${w.location}` : ''} (capacity: {w.capacity_size ?? '∞'})
                  </option>
                ))}
              </select>
            </div>

            {/* Capacity meter */}
            {capacity !== null && used !== null && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Capacity used: <strong style={{ color: usedPct >= 90 ? 'var(--color-error)' : usedPct >= 70 ? 'var(--color-warning)' : 'var(--color-text)' }}>{used} / {capacity}</strong></span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{available} available</span>
                </div>
                <div style={{ height: 6, borderRadius: 'var(--radius-full)', background: 'var(--color-surface-offset)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${usedPct}%`,
                    borderRadius: 'var(--radius-full)',
                    background: usedPct >= 90 ? 'var(--color-error)' : usedPct >= 70 ? 'var(--color-warning)' : 'var(--color-primary)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Product</label>
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} (stock: {p.total_stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity to Add</label>
              <input
                type="number"
                min="1"
                max={available ?? undefined}
                placeholder={available !== null ? `Max ${available}` : 'e.g. 50'}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
              {available !== null && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  Max you can add: {available} units
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary">Add Stock</button>
          </div>
        </form>
      </div>
    </div>
  );
}
