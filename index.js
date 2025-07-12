const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());





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

    //Biodatas 
    app.get('/premiumBiodatas', async (req, res) => {
      try {
        const results = await usersCollection
          .find({ Biodata_Id: "premium" })
          .sort({ createdAt: -1 }) // Latest first
          .limit(6) // Only 6 results
          .toArray();

        res.status(200).send(results);
      } catch (error) {
        console.error('Error fetching biodata:', error);
        res.status(500).json({ message: 'Failed to fetch biodata' });
      }
    });

    app.get('/biodata/:id', async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // GET /similarBiodatas/:type/:id
    app.get("/similarBiodatas/:type/:id", async (req, res) => {
      const { type, id } = req.params;
      const result = await usersCollection
        .find({
          biodataType: type,
          _id: { $ne: new ObjectId(id) },
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      res.send(result);
    });




    app.post('/biodata', async (req, res) => {
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
