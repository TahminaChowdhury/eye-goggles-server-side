const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient } = require('mongodb');
const ObjectId =require("mongodb").ObjectId;
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ckcl0.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {

  try{

    await client.connect();

    const database = client.db("eye_goggles");
    const sunglassCollection = database.collection("sunglasses");
    const userCollection = database.collection("users");
    const orderCollection = database.collection("orders");
    const reviewCollection = database.collection("reviews")



    app.get('/sunglasses', async(req,res) => {
      const cursor = sunglassCollection.find({})
      const result = await cursor.toArray();
      res.send(result)
    });

    app.get('/sunglasses/:sunglassId', async(req,res) => {
        const id = req.params.sunglassId;
        const query = {_id: ObjectId(id)};
        const result = await sunglassCollection.findOne(query);
        res.send(result)
    });

    app.post('/sunglasses', async(req, res) => {
      const doc = req.body;
      const result = await sunglassCollection.insertOne(doc);
      console.log(result)
      res.send(result)
    });


    app.delete('/sunglasses/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await sunglassCollection.deleteOne(query);
      console.log(result)
      res.send(result)
    });

    app.post('/users', async(req, res) => {
      const doc = req.body;
      const result = await userCollection.insertOne(doc);
      console.log(result)
      res.send(result)
    });


    app.put('/users', async(req, res) => {
      const user = req.body;
      const filter ={email: user.email};
      const options = { upsert: true };
      const updateDoc ={$set: user};
      const result = await userCollection.updateOne(filter, updateDoc, options);
      console.log(result)
      res.send(result);
    });


    app.put('/users/admin', async(req, res) => {
      const user = req.body;
      console.log(user);
      const filter = {email: user.email};
      const updateDoc = {$set: {role: "admin"}};
      const result = await userCollection.updateOne(filter, updateDoc);
      console.log(result)
      res.send(result);
    });

    app.get('/users/:email', async(req,res) => {
      const email = req.params.email;
      console.log(email)
      const query = {email: email};
      const result = await userCollection.findOne(query);
      let isAdmin = false;
      if (result.role === "admin") {
        isAdmin = true;
      }
      res.send({admin: isAdmin})
    });

    app.post('/orders', async(req, res) => {
      const doc = req.body;
      const result = await orderCollection.insertOne(doc);
      res.send(result)
    });

    app.get('/orders', async(req,res) => {
      const cursor = orderCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/orders/:email', async(req,res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await orderCollection.find(query).toArray();
      console.log(result)
      res.send(result);
    });

    app.delete('/orders/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await orderCollection.deleteOne(query);
      res.send(result)
    });

    app.post('/reviews', async(req, res) => {
      const doc = req.body;
      const result = await reviewCollection.insertOne(doc);
      res.send(result);
    });

    app.get('/reviews', async(req, res) => {
      const cursor = reviewCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.put("/orders/:id",async(req,res) => {
      const id = req.params.id;
        const updateStatus = req.body;
        const filter = { _id: ObjectId(id) };
        const result = await orderCollection.updateOne(filter, {
          $set: {
            status: updateStatus.status,
          },
        })
        res.json(result)
    });
  }
  finally{
    // await client.close();
  }
  
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})