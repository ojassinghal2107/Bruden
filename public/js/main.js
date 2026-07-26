/* Bruden — Main JS  (GSAP + ScrollTrigger) */
document.addEventListener('DOMContentLoaded', () => {

  gsap.registerPlugin(ScrollTrigger);

  /* ── PAGE LOADER ── */
  const loader     = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  let   progress   = 0;

  const loadInterval = setInterval(() => {
    progress += Math.random() * 18 + 8;
    if (progress >= 100) { progress = 100; clearInterval(loadInterval); finishLoad(); }
    loaderFill.style.width = progress + '%';
  }, 80);

  function finishLoad() {
    gsap.to(loader, {
      opacity: 0, duration: 0.7, delay: 0.3, ease: 'power2.inOut',
      onComplete: () => {
        loader.style.display = 'none';
        document.body.classList.remove('loading');
        animateHero();
      }
    });
  }

  /* ── HERO ENTRANCE ── */
  function animateHero() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('#heroTitle',   { opacity: 1, y: 0,  duration: 1.1 }, 0.10)
      .from('#heroTitle',  { y: 28 }, '<')
      .to('#heroSub',     { opacity: 1, duration: 0.8 }, 0.55)
      .to('#heroDivider', { opacity: 1, duration: 0.8 }, 0.72)
      .to('#heroTagline', { opacity: 1, duration: 0.8 }, 0.85)
      .to('#heroCta',     { opacity: 1, duration: 0.9 }, 1.0)
      .to('#heroScroll',  { opacity: 0.5, duration: 0.7 }, 1.4);
  }

  /* ── NAV SCROLL ── */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  /* ── HAMBURGER ── */
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('open');
  });

  /* ── SCROLL REVEAL ── */
  document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      onEnter: () => el.classList.add('in'),
    });
  });

  /* ── PRODUCT CARDS STAGGER REVEAL ── */
  function revealCards() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach((c, i) => {
      gsap.fromTo(c,
        { opacity: 0, y: 32 },
        {
          opacity: 1, y: 0, duration: 0.75,
          ease: 'power3.out', delay: i * 0.1,
          scrollTrigger: { trigger: c, start: 'top 90%' }
        }
      );
    });
  }

  /* ── LOAD PRODUCTS ── */
  async function loadProducts() {
    const grid = document.getElementById('productGrid');
    try {
      const res  = await fetch('/api/products');
      const json = await res.json();
      const data = json.data;

      if (!data?.length) {
        grid.innerHTML = `<p style="color:var(--c-mist);text-align:center;
          grid-column:1/-1;padding:3rem">No products available.</p>`;
        return;
      }

      grid.innerHTML = data.map(p => {
        const productJSON = JSON.stringify({ id: p.id, name: p.name, price: p.price })
          .replace(/"/g, '&quot;');
        return `
          <div class="product-card">
            <div class="product-card__img-wrap">
              ${p.image
                ? `<img class="product-card__img" src="${p.image}"
                       alt="${p.name}"
                       onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : ''}
              <div class="product-card__placeholder"
                   style="${p.image ? 'display:none' : ''}">b</div>
              ${!p.inStock
                ? '<div class="product-card__badge">Out of Stock</div>'
                : ''}
            </div>
            <div class="product-card__body">
              <div class="product-card__name">${p.name}</div>
              <div class="product-card__desc">${p.description}</div>
              <div class="product-card__foot">
                <div class="product-card__price">
                  <sup>₹</sup>${Number(p.price).toLocaleString('en-IN')}
                </div>
                <button
                  class="product-card__add"
                  onclick="Cart.add(${productJSON})"
                  ${!p.inStock ? 'disabled' : ''}>
                  ${p.inStock ? 'Add to Cart' : 'Sold Out'}
                </button>
              </div>
            </div>
          </div>`;
      }).join('');

      revealCards();
    } catch {
      grid.innerHTML = `<p style="color:var(--c-mist);text-align:center;
        grid-column:1/-1;padding:3rem">Could not load products.</p>`;
    }
  }

  /* ── CONTACT FORM ── */
  document.getElementById('contactForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fb = document.getElementById('formFeedback');
    fb.textContent = 'Sending…';
    try {
      const res  = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    document.getElementById('contactName').value.trim(),
          email:   document.getElementById('contactEmail').value.trim(),
          message: document.getElementById('contactMessage').value.trim(),
        }),
      });
      const data = await res.json();
      fb.style.color = data.success ? 'var(--c-gold)' : '#e07070';
      fb.textContent = data.success
        ? '✓ Message received. Welcome to the den.'
        : (data.error || 'Something went wrong.');
      if (data.success) e.target.reset();
    } catch {
      fb.style.color = '#e07070';
      fb.textContent = 'Network error. Please try again.';
    }
  });

  loadProducts();
});
