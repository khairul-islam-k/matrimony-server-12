const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rodv5np.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    

    const usersCollection = client.db('biodatadb').collection('user');
    

    app.post('/biodata', async(req, res) => {
        const data = req.body;

        const result = await usersCollection.insertOne(data);
        res.send(result);
    })

    
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   

  }
}
run().catch(console.dir);



// Basic route
app.get('/', (req, res) => {
    res.send('Matrimony server is running');
});

// Start server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
