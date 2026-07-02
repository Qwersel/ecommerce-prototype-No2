# Buyersell

A simple e-commerce web application built with Node.js, Express, and MongoDB.  
Users can browse and search products, add new products with images, purchase via PayPal sandbox, and view order history.

## Features

- Product listing with search
- Add products with optional image upload
- Product detail page
- PayPal sandbox checkout (success/failure confirmation)
- Order history

## Tech Stack

- Node.js + Express (backend)
- MongoDB with Mongoose (database)
- PayPal REST SDK sandbox (payments)
- Plain HTML, CSS, JavaScript (frontend)

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- A MongoDB Atlas account — free tier works ([cloud.mongodb.com](https://cloud.mongodb.com))
- A PayPal Developer account — for sandbox credentials ([developer.paypal.com](https://developer.paypal.com))

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a `.env` file

Create a file called `.env` in the project root with the following:

```
MONGODB_URI=your_mongodb_connection_string
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PORT=3000
```

- **MongoDB URI** — in MongoDB Atlas: Cluster → Connect → Drivers → copy the connection string and replace `<password>` with your database user password.
- **PayPal credentials** — in the PayPal Developer Dashboard: Apps & Credentials → select or create a Sandbox app → copy the Client ID and Secret.

> `.env` is listed in `.gitignore` and will never be committed.

### 3. Allow your IP in MongoDB Atlas

Go to **Network Access** in MongoDB Atlas and add your IP address (or `0.0.0.0/0` to allow all during testing).

### 4. Start the server

```bash
npm start
```

You should see:

```
Connected to MongoDB
Buyersell running at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
├── models/
│   ├── Product.js        # product schema
│   └── Order.js          # order schema
├── routes/
│   ├── products.js       # product CRUD
│   ├── orders.js         # order listing
│   └── paypal.js         # PayPal create/capture
├── public/
│   ├── index.html        # home page
│   ├── products.html     # product listing + search
│   ├── add-product.html  # add product form
│   ├── product-detail.html # detail + checkout
│   ├── orders.html       # order history
│   └── css/style.css     # stylesheet
├── server.js             # entry point
├── package.json
└── .gitignore
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List products (optional `?search=`) |
| GET | `/api/products/:id` | Get one product |
| POST | `/api/products` | Create product (multipart/form-data) |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/orders` | List all orders |
| POST | `/api/paypal/create-order` | Create PayPal order |
| POST | `/api/paypal/capture-order` | Capture PayPal payment |
| GET | `/api/config` | Returns PayPal client ID |
