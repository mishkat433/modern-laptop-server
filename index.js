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


        // user login/signup section
        app.get('/saveUser', async (req, res) => {
            let qurery = {}
            if (req.query.email) {
                qurery = { email: req.query.email }
                const result = await userCollection.findOne(qurery)
                return res.send(result)
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