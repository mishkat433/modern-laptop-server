require('dotenv').config()
const express = require('express');
const app = express()
const cors = require('cors');
const PORT = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET);

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send("server is running")
})

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.twfgu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const categoryCollection = client.db("modernLaptop").collection("category");
        const userCollection = client.db("modernLaptop").collection("user");
        const productCollection = client.db("modernLaptop").collection("product");
        const bookingCollection = client.db("modernLaptop").collection("booking");
        const paymentCollection = client.db("modernLaptop").collection("payments");

        // Category section

        app.get("/categories", async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray()
            res.send(result)
        })


        // payment Section

        app.post('/create-payment', async (req, res) => {
            const booking = req.body;
            const price = booking.choseProductPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/finalPayment', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment)
            const id = payment.bookingId;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    payment: 'paid',
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingCollection.updateOne(query, updatedDoc)

            const productUpdate = payment.productId;
            const filter = { _id: ObjectId(productUpdate) }
            const updateProduct = {
                $set: {
                    payment: 'paid',
                    transactionId: payment.transactionId
                }
            }
            const productUpdateResult = await productCollection.updateOne(filter, updateProduct)
            res.send(result);
        })


        // Product section

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { selectCategory: id }
            const result = await productCollection.find(query).toArray()
            const arr = []
            result.forEach(data => {
                if (data.payment !== "paid") {
                    arr.push(data)
                }
            })
            return res.send(arr)
        })

        app.get('/myProduct/:email', async (req, res) => {
            const findEmail = req.params.email;
            const query = {}
            const result = await productCollection.find(query).sort({ _id: -1 }).toArray()
            const arr = []
            result.forEach(data => {
                if (data.productInfo.sealerEmail === findEmail) {
                    arr.push(data)
                }
            })
            return res.send(arr)
        })

        app.get('/advetiseItems', async (req, res) => {
            const query = {}
            const result = await productCollection.find(query).sort({ _id: -1 }).toArray()
            const adItem = []
            result.forEach(data => {
                if (data?.advertise && data?.payment !== "paid") {
                    adItem.push(data)
                }
            })
            return res.send(adItem)
        })

        app.post('/addProduct', async (req, res) => {
            const data = req.body
            const cursor = await productCollection.insertOne(data)
            res.send(cursor)
        })

        app.put('/productAdvertise/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const addAdvertise = {
                $set: {
                    advertise: 'advertise'
                }
            }
            const result = await productCollection.updateOne(filter, addAdvertise, options)
            res.send(result)
        })

        app.delete("/deleteProduct/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: ObjectId(id) }
            const cursor = await productCollection.deleteOne(filter)
            res.send(cursor)
        })


        // booking Section

        app.get('/myBooking/:email', async (req, res) => {
            const findEmail = req.params.email;

            const query = {}
            const result = await bookingCollection.find({}).toArray()
            const arr = []
            result.forEach(data => {
                if (data.bookingData.userEmail === findEmail) {
                    arr.push(data)
                }
            })
            return res.send(arr)
        })

        app.get('/singleBooking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await bookingCollection.findOne(filter)
            res.send(result)
        })

        app.post('/booking', async (req, res) => {
            const data = req.body
            const cursor = await bookingCollection.insertOne(data)
            res.send(cursor)
        })

        app.delete('/deleteBooking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const cursor = await bookingCollection.deleteOne(filter)
            res.send(cursor)
        })

        // user login/signup section
        app.get('/saveUser', async (req, res) => {
            const quoryEmail = req.query.email
            let query = {}
            if (quoryEmail) {
                query = { email: req.query.email }
            }
            const result = await userCollection.find(query).toArray()
            return res.send(result)
        })

        app.get('/users/check/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            if (user?.userType === 'user') {
                return res.send({ useCheck: user?.userType })
            }
            if (user?.userType === 'sealer') {
                return res.send({ useCheck: user?.userType })
            }
            if (user?.userType === 'admin') {
                return res.send({ useCheck: user?.userType })
            }
        })

        app.post("/saveUser", async (req, res) => {
            const userData = req.body;
            const cursor = await userCollection.insertOne(userData)
            res.send(cursor)
        })

        app.put('/verifyUser/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const verifyDoc = {
                $set: {
                    verify: 'verified'
                }
            }
            const result = await userCollection.updateOne(filter, verifyDoc, options)
            res.send(result)
        })
        app.put('/makeAdmin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const makeAdminDoc = {
                $set: {
                    userType: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, makeAdminDoc, options)
            res.send(result)
        })


    }
    finally { }
}
run().catch(err => { console.log(err) })




app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}`);
})