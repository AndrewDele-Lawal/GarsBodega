import { useState, useEffect } from 'react';

export default function Products({ customerId, onCartUpdate }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const fetchProducts = async (term = '') => {
    setLoading(true);
    try {
      const url = term ? `/api/products?search=${encodeURIComponent(term)}` : '/api/products';
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(search);
  };

  const addToCart = async (productId) => {
    try {
      const res = await fetch(`/api/cart/${customerId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity: 1 })
      });
      if (!res.ok) throw new Error();
      setFeedback({ type: 'success', msg: 'Added to cart!' });
      onCartUpdate();
    } catch {
      setFeedback({ type: 'error', msg: 'Failed to add to cart.' });
    }
    setTimeout(() => setFeedback(null), 2500);
  };

  const getStockClass = (stock) => {
    if (stock === 0) return 'low';
    if (stock < 5)  return 'low';
    return 'ok';
  };

  return (
    <div>
      <div className="page-header">
        <h2>Browse Products</h2>
        <p>Search and add items to your cart</p>
      </div>

      {feedback && (
        <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>
      )}

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by name, type, or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Search</button>
        {search && (
          <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); fetchProducts(); }}>
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading products...</p>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>No products found</h3>
          <p>Try a different search term or clear the search.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <div key={p.product_id} className="product-card">
              <h3>{p.product_name}</h3>
              <p className="meta">{p.category} · {p.product_type}{p.brand ? ` · ${p.brand}` : ''}</p>
              {p.product_size && <p className="meta">Size: {p.product_size}</p>}
              <p className="desc">{p.short_description}</p>
              <p className="price">${Number(p.current_price).toFixed(2)}</p>
              <p className={`stock ${getStockClass(p.total_stock)}`}>
                {p.total_stock === 0 ? 'Out of stock' : `${p.total_stock} in stock`}
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => addToCart(p.product_id)}
                disabled={p.total_stock === 0}
              >
                {p.total_stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}