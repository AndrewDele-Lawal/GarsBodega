import { useState, useEffect } from 'react';

export default function StaffProducts() {
  const [products, setProducts] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ product_name: '', category: '', product_type: '', brand: '', product_size: '', short_description: '', current_price: '', total_stock: 0 });

  const flash = (type, msg) => { setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 3000); };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    setProducts(await res.json());
  };

  useEffect(() => { fetchProducts(); }, []);

  const resetForm = () => {
    setForm({ product_name: '', category: '', product_type: '', brand: '', product_size: '', short_description: '', current_price: '', total_stock: 0 });
    setEditing(null);
  };

  const startEdit = (p) => {
    setEditing(p.product_id);
    setForm({ product_name: p.product_name, category: p.category, product_type: p.product_type, brand: p.brand || '', product_size: p.product_size || '', short_description: p.short_description || '', current_price: p.current_price, total_stock: p.total_stock });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/staff/products/${editing}` : '/api/staff/products';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash('success', editing ? 'Product updated!' : 'Product created!');
      resetForm();
      fetchProducts();
    } catch (err) { flash('error', err.message); }
  };

  const deleteProduct = async (productId) => {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/staff/products/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash('success', 'Product deleted.');
      fetchProducts();
    } catch (err) { flash('error', err.message); }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div>
      <div className="page-header">
        <h2>Manage Products</h2>
        <p>Add, edit, or remove products from the store</p>
      </div>

      {feedback && <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>}

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <p style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>{editing ? 'Edit Product' : 'Add New Product'}</p>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="form-row">
              <input placeholder="Product name *" {...f('product_name')} required />
              <input placeholder="Category *" {...f('category')} required />
            </div>
            <div className="form-row">
              <input placeholder="Product type *" {...f('product_type')} required />
              <input placeholder="Brand" {...f('brand')} />
            </div>
            <div className="form-row">
              <input placeholder="Size" {...f('product_size')} />
              <input type="number" min="0" step="0.01" placeholder="Price *" {...f('current_price')} required />
            </div>
            <textarea placeholder="Short description" rows={2} {...f('short_description')} />
            {!editing && <input type="number" min="0" placeholder="Initial stock" {...f('total_stock')} />}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Add Product'}</button>
              {editing && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
            </div>
          </div>
        </form>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr><th>Name</th><th>Category</th><th>Type</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product_id}>
                <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                <td>{p.category}</td>
                <td>{p.product_type}</td>
                <td>${Number(p.current_price).toFixed(2)}</td>
                <td>{p.total_stock}</td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.product_id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}