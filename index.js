require('dotenv').config()
const express = require('express');
const app = express()
const cors = require('cors');
const PORT = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

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

        // Category section

        app.get("/categories", async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray()
            res.send(result)
        })


        // Product section

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { selectCategory: id }
            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/addProduct', async (req, res) => {
            const data = req.body
            const cursor = await productCollection.insertOne(data)
            res.send(cursor)
        })

        // booking Section

        app.get('/myBooking/:email', async (req, res) => {
            const findEmail = req.params.email;

            const query = {}
            const result = await bookingCollection.find({}).toArray()
            console.log(result);
            const arr = []
            result.forEach(data => {
                if (data.bookingData.userEmail === findEmail) {
                    arr.push(data)
                }
            })
            return res.send(arr)
        })

        app.post('/booking', async (req, res) => {
            const data = req.body
            const cursor = await bookingCollection.insertOne(data)
            res.send(cursor)
        })

        // user login/signup section
        app.get('/saveUser', async (req, res) => {
            let query = { email: req.query.email }
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


    }
    finally { }
}
run().catch(err => { console.log(err) })




app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}`);
})