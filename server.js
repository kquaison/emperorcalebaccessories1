const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const storageDir = process.env.STORAGE_DIR || __dirname;
const dataDir = path.join(storageDir, 'data');
const productsFile = path.join(dataDir, 'products.json');
const ordersFile = path.join(dataDir, 'orders.json');
const uploadsDir = path.join(storageDir, 'uploads');
const sessionsDir = path.join(storageDir, 'sessions');
const isProduction = process.env.NODE_ENV === 'production';
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;
const imageExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const defaultProducts = [];

if (!adminUsername || !adminPassword || !sessionSecret) {
  throw new Error('ADMIN_USERNAME, ADMIN_PASSWORD and SESSION_SECRET environment variables are required.');
}

const productPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => callback(null, uploadsDir),
    filename: (req, file, callback) => {
      callback(null, `${Date.now()}-${require('crypto').randomBytes(8).toString('hex')}${imageExtensions[file.mimetype]}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      return callback(new Error('Choose a JPEG, PNG, WebP or GIF image.'));
    }
    callback(null, true);
  }
});

function ensureFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJSON(filePath, fallback) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  return res.status(401).json({ message: 'Unauthorized. Please log in as admin.' });
}

ensureFile(productsFile, defaultProducts);
ensureFile(ordersFile, []);
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(sessionsDir, { recursive: true });

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (isProduction) app.set('trust proxy', 1);
app.use(
  session({
    secret: sessionSecret,
    store: new FileStore({ path: sessionsDir }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction
    }
  })
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/api/admin/session', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === adminUsername && password === adminPassword) {
    req.session.isAdmin = true;
    return res.json({ message: 'Login successful.' });
  }

  return res.status(401).json({ message: 'Invalid username or password.' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
});

app.get('/api/products', (req, res) => {
  const products = readJSON(productsFile, defaultProducts);
  res.json(products);
});

app.post('/api/products', requireAdmin, (req, res, next) => {
  productPhotoUpload.single('image')(req, res, (error) => {
    if (error) {
      const status = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }
    next();
  });
}, (req, res) => {
  const { name, category, price, stock, description, trending } = req.body || {};

  if (!name || !category || !price || !req.file) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Accessory name, category, price and product photo are required.' });
  }

  const products = readJSON(productsFile, defaultProducts);
  const isTrending = trending === true;
  if (isTrending) {
    products.forEach((product) => {
      product.trending = false;
    });
  }
  const newProduct = {
    id: `item-${Date.now()}`,
    name,
    category,
    price: Number(price),
    stock: Number(stock || 1),
    image: `/uploads/${req.file.filename}`,
    description: description || 'New accessory posted by the admin.',
    trending: isTrending
  };

  products.unshift(newProduct);
  writeJSON(productsFile, products);

  res.status(201).json({ message: 'Accessory added successfully.', product: newProduct });
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const products = readJSON(productsFile, defaultProducts);
  const productIndex = products.findIndex((product) => product.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ message: 'Accessory not found.' });
  }

  const [product] = products.splice(productIndex, 1);
  if (product.image && product.image.startsWith('/uploads/')) {
    const imageName = path.basename(product.image);
    const imagePath = path.join(uploadsDir, imageName);
    if (path.dirname(imagePath) === uploadsDir && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  writeJSON(productsFile, products);
  res.json({ message: 'Accessory removed successfully.' });
});

app.get('/api/orders', requireAdmin, (req, res) => {
  const orders = readJSON(ordersFile, []);
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const { customerName, phone, email, address, items } = req.body || {};

  if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Customer name, phone, address and at least one item are required.' });
  }

  const products = readJSON(productsFile, defaultProducts);
  const productMap = new Map(products.map((product) => [product.id, product]));

  let parsedItems;
  try {
    parsedItems = items.map((item) => {
      const product = productMap.get(item.id);
      if (!product) {
        throw new Error(`Product ${item.id} does not exist.`);
      }

      const quantity = Number(item.quantity || 1);
      return {
        id: product.id,
        name: product.name,
        quantity,
        price: Number(product.price),
        total: Number(product.price * quantity)
      };
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const total = parsedItems.reduce((sum, item) => sum + Number(item.total), 0);
  const newOrder = {
    id: `order-${Date.now()}`,
    customerName,
    phone,
    email: email || '',
    address,
    items: parsedItems,
    total: Number(total.toFixed(2)),
    createdAt: new Date().toISOString()
  };

  const orders = readJSON(ordersFile, []);
  orders.unshift(newOrder);
  writeJSON(ordersFile, orders);

  res.status(201).json({ message: 'Order placed successfully.', order: newOrder });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
