import { useEffect, useState } from 'react';

export default function StaffSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const [supplierForm, setSupplierForm] = useState({
    supplier_name: '',
    address_id: ''
  });

  const [linkForm, setLinkForm] = useState({
    supplier_id: '',
    product_id: '',
    supplier_price: ''
  });

  const flash = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const fetchAll = async () => {
    try {
      const [sRes, pRes, spRes] = await Promise.all([
        fetch('/api/staff/suppliers'),
        fetch('/api/products'),
        fetch('/api/staff/supplier-products')
      ]);

      const suppliersData = await sRes.json();
      const productsData = await pRes.json();
      const linksData = await spRes.json();

      setSuppliers(suppliersData);
      setProducts(productsData);
      setSupplierProducts(linksData);

      if (suppliersData.length > 0) {
        setLinkForm((f) => ({ ...f, supplier_id: f.supplier_id || suppliersData[0].supplier_id }));
      }
      if (productsData.length > 0) {
        setLinkForm((f) => ({ ...f, product_id: f.product_id || productsData[0].product_id }));
      }
    } catch (err) {
      flash('error', 'Failed to load supplier data.');
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const createSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: supplierForm.supplier_name,
          address_id: supplierForm.address_id || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      flash('success', 'Supplier created successfully.');
      setSupplierForm({ supplier_name: '', address_id: '' });
      fetchAll();
    } catch (err) {
      flash('error', err.message);
    }
  };

  const saveSupplierProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff/supplier-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: Number(linkForm.supplier_id),
          product_id: Number(linkForm.product_id),
          supplier_price: Number(linkForm.supplier_price)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      flash('success', 'Supplier product saved.');
      setLinkForm((f) => ({ ...f, supplier_price: '' }));
      fetchAll();
    } catch (err) {
      flash('error', err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Suppliers</h2>
        <p>Manage suppliers and assign products to them</p>
      </div>

      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <p style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Add Supplier</p>
        <form onSubmit={createSupplier}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <input
              placeholder="Supplier name"
              value={supplierForm.supplier_name}
              onChange={(e) => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Address ID (optional)"
              value={supplierForm.address_id}
              onChange={(e) => setSupplierForm({ ...supplierForm, address_id: e.target.value })}
            />
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
              Add Supplier
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <p style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Assign Product to Supplier</p>
        <form onSubmit={saveSupplierProduct}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <select
              value={linkForm.supplier_id}
              onChange={(e) => setLinkForm({ ...linkForm, supplier_id: e.target.value })}
              required
            >
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>

            <select
              value={linkForm.product_id}
              onChange={(e) => setLinkForm({ ...linkForm, product_id: e.target.value })}
              required
            >
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Supplier price"
              value={linkForm.supplier_price}
              onChange={(e) => setLinkForm({ ...linkForm, supplier_price: e.target.value })}
              required
            />

            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
              Save Supplier Product
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <p style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Suppliers</p>
        {suppliers.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No suppliers yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Address ID</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.supplier_id}>
                    <td>#{s.supplier_id}</td>
                    <td>{s.supplier_name}</td>
                    <td>{s.address_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <p style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Supplier Products</p>
        {supplierProducts.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No supplier-product links yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th>Supplier Price</th>
                </tr>
              </thead>
              <tbody>
                {supplierProducts.map((sp, idx) => (
                  <tr key={`${sp.supplier_id}-${sp.product_id}-${idx}`}>
                    <td>{sp.supplier_name}</td>
                    <td>{sp.product_name}</td>
                    <td>${Number(sp.supplier_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}