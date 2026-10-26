const productGrid = document.getElementById('productGrid');
const productSearch = document.getElementById('productSearch');
const orderSummary = document.getElementById('orderSummary');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutMessage = document.getElementById('checkoutMessage');
const whatsappOrderBtn = document.getElementById('whatsappOrderBtn');
const showOrderBtn = document.getElementById('showOrderBtn');
const orderPanel = document.getElementById('orderPanel');
const featuredProduct = document.getElementById('featuredProduct');
const adminForm = document.getElementById('adminForm');
const adminMessage = document.getElementById('adminMessage');
const yearElement = document.getElementById('year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

const state = {
  products: [],
  cart: [],
  orderFormOpen: false
};

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    state.products = products;
    renderProducts();
    renderFeaturedProduct();
    renderOrderSummary();
  } catch (error) {
    console.error('Failed to load accessories:', error);
  }
}

function renderFeaturedProduct() {
  if (!featuredProduct) return;

  const product = state.products.find((item) => item.trending);
  featuredProduct.hidden = !product;
  if (!product) return;

  document.getElementById('featuredStock').textContent = Number(product.stock) > 0 ? 'In stock' : 'Out of stock';
  document.getElementById('featuredCategory').textContent = product.category;
  document.getElementById('featuredName').textContent = product.name;
  document.getElementById('featuredPrice').textContent = `GH₵${Number(product.price).toFixed(2)}`;
  document.getElementById('featuredDescription').textContent = product.description;
}

function addToCart(productId) {
  const existing = state.cart.find((item) => item.id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;

    state.cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1
    });
  }

  renderOrderSummary();
}

function renderProducts() {
  if (!productGrid) return;

  if (!state.products.length) {
    productGrid.innerHTML = '<p class="empty-state">No accessories available yet.</p>';
    return;
  }

  const searchTerm = productSearch?.value.trim().toLocaleLowerCase() || '';
  const matchingProducts = state.products.filter((product) =>
    product.name.toLocaleLowerCase().includes(searchTerm)
  );

  if (!matchingProducts.length) {
    productGrid.innerHTML = '<p class="empty-state">No products match your search.</p>';
    return;
  }

  productGrid.innerHTML = matchingProducts
    .map(
      (product) => `
        <article class="product-card">
          <img src="${product.image}" alt="${product.name}" />
          <div class="product-card-body">
            <div class="product-meta">
              <span>${product.category}</span>
              <span>Stock: ${product.stock}</span>
            </div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-footer">
              <strong>₵${Number(product.price).toFixed(2)}</strong>
              <button type="button" class="button button-primary" data-add="${product.id}">Add to Order</button>
            </div>
          </div>
        </article>
      `
    )
    .join('');

  productGrid.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.add));
  });
}

productSearch?.addEventListener('input', renderProducts);

function renderOrderSummary() {
  if (showOrderBtn) {
    showOrderBtn.hidden = !state.cart.length || state.orderFormOpen;
  }

  if (orderPanel) {
    orderPanel.hidden = !state.orderFormOpen;
  }

  if (!orderSummary) return;

  if (!state.cart.length) {
    orderSummary.innerHTML = '<p>No items selected yet.</p>';
    return;
  }

  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  orderSummary.innerHTML = `
    <div class="order-items">
      ${state.cart
        .map(
          (item) => `
            <div class="order-item">
              <div>
                <strong>${item.name}</strong>
                <span>Qty: ${item.quantity}</span>
              </div>
              <span>₵${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `
        )
        .join('')}
    </div>
    <div class="order-total">
      <span>Total</span>
      <strong>₵${total.toFixed(2)}</strong>
    </div>
  `;
}

showOrderBtn?.addEventListener('click', () => {
  if (!state.cart.length) return;

  state.orderFormOpen = true;
  renderOrderSummary();
  orderPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

whatsappOrderBtn?.addEventListener('click', () => {
  if (!state.cart.length) {
    checkoutMessage.textContent = 'Please add at least one accessory to your order.';
    return;
  }

  if (!checkoutForm.reportValidity()) return;

  const formData = new FormData(checkoutForm);
  const customerName = formData.get('customerName').toString().trim();
  const phone = formData.get('phone').toString().trim();
  const email = formData.get('email').toString().trim();
  const address = formData.get('address').toString().trim();
  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderLines = state.cart.map(
    (item) => `- ${item.name} x${item.quantity}: GH₵${(item.price * item.quantity).toFixed(2)}`
  );
  const message = [
    'Hello EMPEROR CALEB ACCESSORIES, I would like to place this order:',
    '',
    ...orderLines,
    '',
    `Total: GH₵${total.toFixed(2)}`,
    '',
    `Name: ${customerName}`,
    `Phone: ${phone}`,
    ...(email ? [`Email: ${email}`] : []),
    `Delivery address: ${address}`
  ].join('\n');
  const whatsappUrl = `https://wa.me/233544096402?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  checkoutMessage.textContent = 'Your order message is ready in WhatsApp. Send it there to confirm your order.';
});

checkoutForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!state.cart.length) {
    checkoutMessage.textContent = 'Please add at least one accessory to your order.';
    return;
  }

  const formData = new FormData(checkoutForm);
  const payload = {
    customerName: formData.get('customerName').toString().trim(),
    phone: formData.get('phone').toString().trim(),
    email: formData.get('email').toString().trim(),
    address: formData.get('address').toString().trim(),
    items: state.cart.map((item) => ({
      id: item.id,
      quantity: item.quantity
    }))
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to place order.');
    }

    checkoutMessage.textContent = data.message;
    checkoutForm.reset();
    state.cart = [];
    state.orderFormOpen = false;
    renderOrderSummary();
  } catch (error) {
    checkoutMessage.textContent = error.message;
  }
});

adminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(adminForm);
  const payload = {
    name: formData.get('name').toString().trim(),
    category: formData.get('category').toString().trim(),
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock')),
    image: formData.get('image').toString().trim(),
    description: formData.get('description').toString().trim()
  };

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to add accessory.');
    }

    adminMessage.textContent = data.message;
    adminForm.reset();
    await loadProducts();
  } catch (error) {
    adminMessage.textContent = error.message;
  }
});

loadProducts();
