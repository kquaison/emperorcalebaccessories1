# EMPEROR CALEB ACCESSORIES

A simple accessories store website built with Node.js and Express.

## Features

- Customers can browse accessories and place orders
- Admin can log in and manage the product catalog
- Admin can remove accessories from the catalog
- Admin can upload product photos from their device (JPEG, PNG, WebP or GIF, up to 5 MB)
- Admin can view all customer orders in a dashboard
- Product and order data is stored in the `data` folder as JSON files

## Admin login

Create a private `.env` file from `.env.example` and replace all placeholder values with your own credentials and a long random session secret. Keep `.env` private; it is ignored by Git.

```bash
Copy-Item .env.example .env
```

Do not use the example placeholders or share your `.env` file. Use separate, strong credentials for public deployment.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

## Publish on Render

1. Push this project to a private or public GitHub repository. Do not commit `.env` files or credentials.
2. In Render, choose **New > Blueprint** and connect the repository containing `render.yaml`.
3. In the service environment settings, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to new deployment credentials. Do not deploy using the default local credentials.
4. Keep the generated `SESSION_SECRET`, and keep the persistent disk mounted at `/var/data`.
5. Deploy the service. Render will provide a public `onrender.com` URL.

The persistent disk stores product/order JSON files, uploaded product photos, and admin sessions. The deployment requires a Render plan that supports persistent disks.

## Main files

- `server.js` - API routes, admin auth, and Express setup
- `render.yaml` - Render web service and persistent disk configuration
- `public/index.html` - storefront UI
- `public/admin.html` - admin dashboard and login page
- `public/styles.css` - site styling
- `public/script.js` - customer storefront behavior
- `public/admin.js` - admin login and dashboard behavior
- `data/products.json` - product catalog
- `data/orders.json` - customer orders
- `uploads/` - product photos uploaded by the admin
