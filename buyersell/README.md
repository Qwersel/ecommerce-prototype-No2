Buyersell
A bascially barebones e-commerce web application built with Node.js, Express, and MongoDB.  
For now you can browse and search products, add any new products together with images, do fake PayPal shopping and it will remember your local order history. Due to time constrains I left out working on a pretty design which could always be worked on later since all the core features are functional. It could always get spiced up later but design choices and aesthetics are personal anyways so I just left it basic looking for now. I wanted to design being clean so all the features are obvious to the eye.

What I used to make this:

- Node.js + Express (backend)
- MongoDB with Mongoose (database)
- PayPal REST SDK sandbox (payments)
- Plain HTML, CSS, JavaScript (frontend)

Requirements

-Node.js(duh)
-A MongoDB Atlas account to have a databse for the added products
-And PayPal Developer account so u can input your own secret password into it, I don't think it is possible without the proffessor doing this step manually themselves since I can't have a server running at all times

Setup=>
(I know you know how, but just in case, since I can't have a server up running the website, you must run it locally so here is how)

1. First you need to install dependencies

bash
npm install


2. Create a .env file

Create a file called .env in the project root with the following:

MONGODB_URI=your_mongodb_connection_string
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PORT=6666

MongoDB URI - in MongoDB Atlas: Cluster , Connect , Drivers , copy the connection string and replace `<password>` with your database user password.
PayPal credentials - in the PayPal Developer Dashboard: Apps & Credentials , select or create a Sandbox app , copy the Client ID and Secret.

.env is listed in `.gitignore` and will never be committed.

3. Allow your IP in MongoDB Atlas

Go to Network Access in MongoDB Atlas and add your IP address.

4. Start the server

bash
npm start

now you should be able to fully run the website once you open it in the browser :)


API Endpoints

Here are methods path and what it does, in that order:
GET`/api/products` List products (can aslso do the optional ?search=) 
GET`/api/products/:id`  Get only one product 
POST`/api/products`  Creates a product 
PUT `/api/products/:id` Updates a product 
DELETE `/api/products/:id` Deletes a product
GET `/api/orders` Lists all of the orders
POST`/api/paypal/create-order` to create PayPal order
POST`/api/paypal/capture-order`to capture PayPal payment
GET `/api/config` will returns PayPal client ID
