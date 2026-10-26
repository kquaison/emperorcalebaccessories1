const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const loginMessage = document.getElementById('loginMessage');
const adminForm = document.getElementById('adminForm');
const adminMessage = document.getElementById('adminMessage');
const productPhoto = document.getElementById('productPhoto');
const productPhotoPreview = document.getElementById('productPhotoPreview');
const productList = document.getElementById('productList');
const orderList = document.getElementById('orderList');
let photoPreviewUrl;

async function checkSession() {
  try {
    const response = await fetch('/api/admin/session');
    const data = await response.json();
    if (data.authenticated) {
      showDashboard();
      loadDashboardData();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error(error);
    showLogin();
  }
}

function showLogin() {
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
}

function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = {
    username: formData.get('username').toString().trim(),
    password: formData.get('password').toString()
  };

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Invalid username or password');
    }

    loginMessage.textContent = data.message;
    showDashboard();
    loadDashboardData();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

logoutBtn?.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

adminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(adminForm);
  formData.set('name', formData.get('name').toString().trim());
  formData.set('category', formData.get('category').toString().trim());
  formData.set('description', formData.get('description').toString().trim());

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to add accessory.');
    }

    adminMessage.textContent = data.message;
    adminForm.reset();
    clearPhotoPreview();
    loadDashboardData();
  } catch (error) {
    adminMessage.textContent = error.message;
  }
});

productPhoto?.addEventListener('change', () => {
  clearPhotoPreview();
  const file = productPhoto.files[0];
  if (!file) return;

  photoPreviewUrl = URL.createObjectURL(file);
  const previewImage = document.createElement('img');
  previewImage.src = photoPreviewUrl;
  previewImage.alt = 'Selected product photo preview';
  const fileName = document.createElement('span');
  fileName.textContent = file.name;
  productPhotoPreview.replaceChildren(previewImage, fileName);
});

function clearPhotoPreview() {
  if (photoPreviewUrl) {
    URL.revokeObjectURL(photoPreviewUrl);
    photoPreviewUrl = undefined;
  }
  if (productPhotoPreview) productPhotoPreview.replaceChildren();
}

async function loadDashboardData() {
  const [productsResponse, ordersResponse] = await Promise.all([
    fetch('/api/products'),
    fetch('/api/orders')
  ]);

  const products = await productsResponse.json();
  const orders = await ordersResponse.json();

  renderProducts(products);
  renderOrders(orders);
}

function renderProducts(products) {
  if (!productList) return;

  if (!products.length) {
    productList.innerHTML = '<p>No accessories available.</p>';
    return;
  }

  productList.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Trending</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${products
          .map(
            (product) => `
              <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>GH₵${Number(product.price).toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>${product.trending ? 'Yes' : 'No'}</td>
                <td><button type="button" class="button button-danger" data-remove-product="${product.id}">Remove</button></td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;

  productList.querySelectorAll('[data-remove-product]').forEach((button) => {
    button.addEventListener('click', () => removeProduct(button.dataset.removeProduct));
  });
}

async function removeProduct(productId) {
  if (!window.confirm('Remove this accessory from the catalog?')) return;

  try {
    const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to remove accessory.');

    adminMessage.textContent = data.message;
    await loadDashboardData();
  } catch (error) {
    adminMessage.textContent = error.message;
  }
}

function renderOrders(orders) {
  if (!orderList) return;

  if (!orders.length) {
    orderList.innerHTML = '<p>No orders yet.</p>';
    return;
  }

  orderList.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${orders
          .map(
            (order) => `
              <tr>
                <td>
                  <strong>${order.customerName}</strong><br>
                  <span>${order.phone}</span>
                </td>
                <td>${order.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}</td>
                <td>GH₵${Number(order.total).toFixed(2)}</td>
                <td>${new Date(order.createdAt).toLocaleString()}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

checkSession();
