require('dotenv').config()
const express = require('express');
const app = express()
const cors = require('cors');
const PORT = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET);

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.twfgu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


app.get('/', (req, res) => {
    res.send("server is running")
})

function veryfyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unAuthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.JSON_SECRET_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next()
    })
}



async function run() {
    try {
        const categoryCollection = client.db("modernLaptop").collection("category");
        const userCollection = client.db("modernLaptop").collection("user");
        const productCollection = client.db("modernLaptop").collection("product");
        const bookingCollection = client.db("modernLaptop").collection("booking");
        const paymentCollection = client.db("modernLaptop").collection("payments");

        app.post('/jwt', async (req, res) => {
            const email = req.body.email;
            const query = { email: email }
            const user = await userCollection.find(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.JSON_SECRET_KEY, { expiresIn: '2d' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: "Forbidden Access" })
        })


        // ---------------------- Category section ----------------------------

        app.get("/categories", async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray()
            res.send(result)
        })


        //--------------------------- payment Section-----------------------

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

        app.post('/finalPayment', veryfyJWT, async (req, res) => {
            const payment = req.body;
            const jwtEmail = req.query.email;
            if (req.decoded.email !== jwtEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const result = await paymentCollection.insertOne(payment)
            const id = payment.bookingId;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    payment: 'paid',
                    productStatus: 'soldOut',
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingCollection.updateMany(query, updatedDoc)

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


        //------------------- Product section------------------------

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

        app.get('/myProduct/:email', veryfyJWT, async (req, res) => {
            const findEmail = req.params.email;
            const query = {}
            const jwtEmail = req.query.email;
            if (req.decoded.email !== jwtEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
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

        app.get('/reportedProducts', async (req, res) => {
            const query = {}
            const result = await productCollection.find(query).toArray()
            const arr = []
            result.forEach(data => {
                if (data.report) {
                    arr.push(data)
                }
            })
            return res.send(arr)
        })

        app.post('/addProduct', veryfyJWT, async (req, res) => {
            const data = req.body
            const jwtEmail = req.query.email;
            if (req.decoded.email !== jwtEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const cursor = await productCollection.insertOne(data)
            res.send(cursor)
        })

        app.put('/productAdvertise/:id', veryfyJWT, async (req, res) => {
            const id = req.params.id
            const jwtEmail = req.query.email;
            if (req.decoded.email !== jwtEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
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

        app.put('/reportProduct/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const addAdvertise = {
                $set: {
                    report: true
                }
            }
            const result = await productCollection.updateOne(filter, addAdvertise, options)
            res.send(result)
        })

        app.delete("/deleteProduct/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const cursor = await productCollection.deleteOne(filter)
            res.send(cursor)
        })


        //------------------------------ booking Section ----------------------------

        app.get('/myBooking/:email', veryfyJWT, async (req, res) => {
            const findEmail = req.params.email;
            const jwtEmail = req.query.email;
            if (req.decoded.email !== jwtEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
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

        // ---------------------------- user login/signup section  ---------------------------------
        app.get('/saveUser', async (req, res) => {
            const queryEmail = req.query.email
            let query = {}
            if (queryEmail) {
                query = { email: req.query.email }
            }
            const result = await userCollection.find(query).toArray()
            return res.send(result)
        })

        app.get('/users/check/:email', veryfyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const jwtEmail = req.query.email;
            if (req.decoded.email !== jwtEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
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

        app.delete('/deleteAdmin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const cursor = await userCollection.deleteOne(filter)
            res.send(cursor)
        })
    }
    finally { }
}
run().catch(err => { console.log(err) })




app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}`);
})