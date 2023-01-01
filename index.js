const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(
  express.json({
    limit: "5mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);



// Stripe
const stripe = require('stripe')(process.env.STRIPE_KEY);
const endpointSecret = process.env.WEBHOOK_ENDPOINT_SECRET;

// Connect to mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ckcl0.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();

    const database = client.db('eye_goggles');
    const sunglassCollection = database.collection('sunglasses');
    const usersCollection = database.collection('users');
    const orderCollection = database.collection('orders');
    const reviewCollection = database.collection('reviews');

    // get products
    app.get('/sunglasses', async (req, res) => {
      const cursor = sunglassCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // get products by id
    app.get('/sunglasses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await sunglassCollection.findOne(query);
      res.send(result);
    });

    // post products
    app.post('/sunglasses', async (req, res) => {
      const doc = req.body;
      const result = await sunglassCollection.insertOne(doc);
      console.log(result);
      res.send(result);
    });

    // Update product
    app.put('/sunglasses/:id', async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: product,
      };
      const result = await sunglassCollection.findOneAndUpdate(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // delete product
    app.delete('/sunglasses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await sunglassCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    // post users
    app.post('/users', async (req, res) => {
      const doc = req.body;
      const result = await usersCollection.insertOne(doc);
      res.send(result);
    });

    // get users
    app.get('/users', async (req, res) => {
      const cursor = usersCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // put users
    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // set admin role
    app.put('/users/admin', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const updateDoc = { $set: { role: 'admin' } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // admin
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      let isAdmin = false;
      if (result.role === 'admin') {
        isAdmin = true;
      }
      res.send({ admin: isAdmin });
    });

    // post orders
    app.post('/orders', async (req, res) => {
      const doc = req.body;
      const result = await orderCollection.insertOne(doc);
      res.send(result);
    });

    // get orders
    app.get('/orders', async (req, res) => {
      const cursor = orderCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // get orders by email
    app.get('/orders/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await orderCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    // delete orders
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // post reviews
    app.post('/reviews', async (req, res) => {
      const doc = req.body;
      const result = await reviewCollection.insertOne(doc);
      res.send(result);
    });

    // get reviews
    app.get('/reviews', async (req, res) => {
      const cursor = reviewCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // update status
    app.put('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body;
      const filter = { _id: ObjectId(id) };
      const result = await orderCollection.updateOne(filter, {
        $set: {
          status: updateStatus.status,
        },
      });
      res.json(result);
    });

    app.post('/create-checkout-session', async (req, res) => {
      console.log(req.body.userId);
      const customer = await stripe.customers.create({
        metadata: {
          userId: req.body.userId,
          cart: JSON.stringify(req.body.cartItems),
        },
      });
      
      const line_items = req.body.cartItems.map((item) => {
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.name,
              images: [item.image],
              metadata: {
                id: item.id,
              },
            },
            unit_amount: item.price * 100,
          },
          quantity: item.qty,
          tax_rates: [process.env.STRIPE_TAX_RATE_ID],
        };
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        shipping_address_collection: { allowed_countries: ['US', 'CA', 'BD'] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: { amount: 0, currency: 'usd' },
              display_name: 'Free shipping',
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 5 },
                maximum: { unit: 'business_day', value: 7 },
              },
            },
          },
        ],
        phone_number_collection: {
          enabled: true,
        },
        customer: customer.id,
        line_items,
        mode: 'payment',
        success_url: 'http://localhost:5000/checkout-success',
        cancel_url: 'http://localhost:5000/checkout-cancel',
      });

      res.send({ url: session.url });
    });

    app.post(
      '/webhook',
      express.raw({ type: 'application/json' }),
      (req, res) => {
        const sig = req.headers['stripe-signature'];

        let data;
        let eventType;

        if (endpointSecret) {
          let event;
          try {
            event = stripe.webhooks.constructEvent(
              req.rawBody,
              sig,
              endpointSecret
            );
            console.log('verified');
          } catch (err) {
            console.log(err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
          }
          data = event.data.object;
          eventType = event.type;
        } else {
          data = req.body.data.object;
          eventType = req.body.type;
        }

        if (eventType == 'checkout.session.completed') {
          stripe.customers
            .retrieve(data.customer)
            .then((customer) => {
              console.log("customer:",customer);
              console.log('data:', data);
            })
            .catch((err) => {
              console.log(err);
            });
        }
        res.send();
      }
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
