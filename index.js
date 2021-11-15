const express = require('express');
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;

const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json());

//Conect MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1i4nw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run(){
    try{
        await client.connect();
        const database = client.db('BuyBicycle');
        const servicesCollection = database.collection('services');
        const ordersCollection = database.collection('orders');
        const usersCollection = database.collection('users');


        //GET Orders API
        app.get('/orders', async(req, res) => {
          const cursor = ordersCollection.find({});
          const orders = await cursor.toArray();
          res.json(orders);
        });

        //GET Orders 
        app.get('/orders', verifyToken,  async(req, res) => {
          const email = req.query.email;
          const query = { email: email}
          console.log(query)
          const cursor = ordersCollection.find({query});
          const orders = await cursor.toArray();
          res.json(orders);
        });

        //GET Services API
        app.get('/services', async(req, res) => {
            const cursor = servicesCollection.find({});
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async(req, res) => {
          const user = req.body;
          const result = await usersCollection.insertOne(user)
          res.json(result);
          console.log(result)
        });

        app.put('/users', async (req, res) => {
          const user = req.body;
          const filter ={ email: user.email };
          const options = { upsert: true };
          const updateDoc = { $set: user };
          const result = await usersCollection.updateOne(filter, updateDoc, options );
          res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })


        //GET Single Service
        app.get('/services/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const service = await servicesCollection.findOne(query);
            res.json(service);
        });

        

        //GET status update Order
        app.get('/orders/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await ordersCollection.findOne(query);
            res.json(order);
        });

        //API status update Order
        app.put('/orders/:id', async(req, res) => {
            const id = req.params.id;
            const updatedStatus = req.body;
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updateDoc = {
                $set: {
                    status: updatedStatus.status
                },
            };
            const result = await ordersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

         

        //POST Services API
        app.post('/services', async(req, res) => {
            const service = req.body;  
            const result = await servicesCollection.insertOne(service);
            console.log(result);
            res.json(result);
        });

        //Post Orders API
        app.post('/orders', async(req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        });

        
        //DELETE Order API
        app.delete('/orders/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        });

        //DELETE service API
        app.delete('/services/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        });


    }
    finally{
        //await client.close();
    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Running Server!')
})

app.listen(port, () => {
  console.log(`listening at ${port}`)
})