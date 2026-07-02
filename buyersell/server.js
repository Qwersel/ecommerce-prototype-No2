import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buyersell';

// here are essential schemas
const Product = mongoose.model('Product', new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price:       { type: Number, required: true, min: 0 },
    stock:       { type: Number, required: true, default: 0, min: 0 },
    imageData:   { type: String, default: null },
  },
  { timestamps: true }
));

const Order = mongoose.model('Order', new mongoose.Schema(
  {
    productId:       { type: String, required: true },
    productName:     { type: String, required: true },
    price:           { type: Number, required: true },
    status:          { type: String, required: true, default: 'pending', enum: ['pending', 'completed', 'failed'] },
    paypalOrderId:   { type: String, required: true },
    paypalCaptureId: { type: String, default: null },
    buyerEmail:      { type: String, default: null },
  },
  { timestamps: true }
));

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// code for image upload. Later added size restriction so the webpage won't be overloaded.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'));
  },
});

// config
app.get('/api/config', (req, res) => {
  res.json({ paypalClientId: process.env.PAYPAL_CLIENT_ID || null });
});

// how products are handled
app.get('/api/products', async (req, res) => {
  try {
    const filter = req.query.search
      ? { name: { $regex: req.query.search, $options: 'i' } }
      : {};
    res.json(await Product.find(filter).sort({ createdAt: -1 }));
  } catch { res.status(500).json({ error: 'Failed to fetch products' }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed to fetch product' }); }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    if (!name || !description || price == null)
      return res.status(400).json({ error: 'name, description and price are required' });
    const imageData = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : null;
    const product = await new Product({ name, description, price: parseFloat(price), stock: parseInt(stock) || 0, imageData }).save();
    res.status(201).json(product);
  } catch { res.status(500).json({ error: 'Failed to create product' }); }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const update = {};
    if (name        !== undefined) update.name        = name;
    if (description !== undefined) update.description = description;
    if (price       !== undefined) update.price       = parseFloat(price);
    if (stock       !== undefined) update.stock       = parseInt(stock);
    if (req.file) update.imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const p = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed to update product' }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete product' }); }
});

// orders
app.get('/api/orders', async (req, res) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }));
  } catch { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// fakepal
const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error('PayPal credentials not set in .env');
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const data = await res.json();
  if (!data.access_token) throw new Error('No access token returned');
  return data.access_token;
}

app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const product = await Product.findById(req.body.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock <= 0) return res.status(400).json({ error: 'Out of stock' });
    const token = await getAccessToken();
    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'GBP', value: product.price.toFixed(2) }, description: product.name, custom_id: product._id.toString() }],
      }),
    });
    const order = await response.json();
    if (!response.ok || !order.id) return res.status(502).json({ error: 'PayPal failed to create order' });
    res.json({ orderId: order.id });
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to create order' }); }
});

app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderId, productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const token = await getAccessToken();
    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const capture = await response.json();
    const capturedAmount = parseFloat(capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? '0');
    const amountMatch = Math.abs(capturedAmount - product.price) < 0.01;
    const status = (response.ok && capture.status === 'COMPLETED' && amountMatch) ? 'completed' : 'failed';
    if (status === 'completed') await Product.findByIdAndUpdate(productId, { $inc: { stock: -1 } });
    const savedOrder = await Order.create({
      productId: product._id.toString(), productName: product.name, price: product.price, status,
      paypalOrderId: orderId,
      paypalCaptureId: capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || null,
      buyerEmail: capture.payer?.email_address || null,
    });
    res.json({ success: status === 'completed', status, order: savedOrder });
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to capture order' }); }
});

// all webpages so they can be accessed from one another later
app.get('/', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));
app.get('/products', (req, res) => res.sendFile(join(__dirname, 'public', 'products.html')));
app.get('/add-product', (req, res) => res.sendFile(join(__dirname, 'public', 'add-product.html')));
app.get('/orders', (req, res) => res.sendFile(join(__dirname, 'public', 'orders.html')));
app.get('/product/:id', (req, res) => res.sendFile(join(__dirname, 'public', 'product-detail.html')));

// and finally start
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Buyersell running at http://localhost:${PORT}`));
  })
  .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });
