// Cart state & logic
const Cart = (() => {
  let items = JSON.parse(localStorage.getItem('bruden_cart') || '[]');

  function save() {
    localStorage.setItem('bruden_cart', JSON.stringify(items));
  }

  function add(product) {
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    save();
    render();
    updateCount();
  }

  function remove(id) {
    items = items.filter(i => i.id !== id);
    save(); render(); updateCount();
  }

  function changeQty(id, delta) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) remove(id);
    else { save(); render(); updateCount(); }
  }

  function total() {
    return items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function getItems() { return [...items]; }

  function clear() {
    items = []; save(); render(); updateCount();
  }

  function updateCount() {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
  }

  function render() {
    const container = document.getElementById('cartItems');
    const footer    = document.getElementById('cartFooter');
    const totalEl   = document.getElementById('cartTotal');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = '<p class="cart__empty">Your den is empty.</p>';
      if (footer) footer.style.display = 'none';
      return;
    }

    if (footer) footer.style.display = 'block';
    if (totalEl) totalEl.textContent = '₹' + total().toLocaleString('en-IN');

    container.innerHTML = items.map(item => `
      <div class="cart-item">
        <div class="cart-item__info">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price">₹${(item.price * item.qty).toLocaleString('en-IN')}</div>
        </div>
        <div class="cart-item__qty">
          <button onclick="Cart.changeQty(${item.id}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="Cart.changeQty(${item.id}, 1)">+</button>
        </div>
      </div>
    `).join('');
  }

  return { add, remove, changeQty, total, getItems, clear, render, updateCount };
})();

// Cart drawer controls
document.addEventListener('DOMContentLoaded', () => {
  const cartBtn      = document.getElementById('cartBtn');
  const cartDrawer   = document.getElementById('cartDrawer');
  const cartOverlay  = document.getElementById('cartOverlay');
  const cartClose    = document.getElementById('cartClose');
  const checkoutBtn  = document.getElementById('checkoutBtn');
  const checkoutOverlay = document.getElementById('checkoutOverlay');
  const modalClose   = document.getElementById('modalClose');

  function openCart() {
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    Cart.render();
  }
  function closeCart() {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  cartBtn?.addEventListener('click', openCart);
  cartClose?.addEventListener('click', closeCart);
  cartOverlay?.addEventListener('click', closeCart);

  checkoutBtn?.addEventListener('click', () => {
    closeCart();
    checkoutOverlay.style.display = 'flex';
  });
  modalClose?.addEventListener('click', () => {
    checkoutOverlay.style.display = 'none';
  });
  checkoutOverlay?.addEventListener('click', (e) => {
    if (e.target === checkoutOverlay) checkoutOverlay.style.display = 'none';
  });

  // Checkout form submit
  document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('orderFeedback');
    const items = Cart.getItems();
    if (!items.length) {
      feedback.textContent = 'Your cart is empty.';
      return;
    }

    const body = {
      name: document.getElementById('orderName').value.trim(),
      email: document.getElementById('orderEmail').value.trim(),
      phone: document.getElementById('orderPhone').value.trim(),
      address: document.getElementById('orderAddress').value.trim(),
      // send a clean summary of cart items
      items: items.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
      total: Cart.total(),
    };

    try {
      feedback.textContent = 'Placing order...';
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        feedback.style.color = 'var(--gold)';
        feedback.textContent = '✓ Order placed! We will reach out to you soon.';
        Cart.clear();
        document.getElementById('checkoutForm').reset();
        setTimeout(() => {
          checkoutOverlay.style.display = 'none';
          feedback.textContent = '';
        }, 3000);
      } else {
        feedback.style.color = '#e07070';
        feedback.textContent = data.error || 'Something went wrong.';
      }
    } catch {
      feedback.style.color = '#e07070';
      feedback.textContent = 'Network error. Please try again.';
    }
  });

  Cart.updateCount();
});
