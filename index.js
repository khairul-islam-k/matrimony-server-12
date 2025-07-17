const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    const paymentsCollection = client.db('biodatadb').collection('payment');
    const favoritesCollection = client.db('biodatadb').collection('favourites');

    // GET all users
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().sort({createdAt: -1}).toArray();
      res.send(result);
    });

    //total premium
    app.get('/premiumApproval', async (req, res) => {
      try {
        const results = await usersCollection
          .find({ Biodata_Id: "premium" })
          .sort({ createdAt: -1 }) // Latest first
          .toArray();

        res.status(200).send(results);
      } catch (error) {
        console.error('Error fetching biodata:', error);
        res.status(500).json({ message: 'Failed to fetch biodata' });
      }
    });


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

    //favorites by email
    app.get('/favorite', async (req, res) => {
      const email = req.query.email;
      const data = { userEmail: email };
      const result = await favoritesCollection.find(data).toArray();

      for (const pay of result) {
        const id = pay.biodataId;
        const objId = { _id: new ObjectId(id) };
        const user = await usersCollection.findOne(objId);
        pay.biodataName = user.name;
        pay.BiodataId = user._id;
        pay.occupation = user.occupation;
        pay.BiodataAddress = user.permanentDivision;
      }
      res.send(result);

    })


    //premium request
    app.get('/biodatas/premium-requests', async (req, res) => {
      const result = await usersCollection
        .find({ isPremium: 'pending' })
        .toArray();
      res.send(result);
    });

    //approve premium
    app.patch('/biodatas/premium/approve/:id', async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            isPremium: 'approved',
            Biodata_Id: 'premium'
          }
        }
      );
      res.send(result);
    });



    //make premium manage user
    app.patch('/users/premium/:id', async (req, res) => {
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { Biodata_Id: 'premium' } }
      );
      res.send(result);
    });

    //make admit
    app.patch('/users/admin/:id', async (req, res) => {
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { Biodata_Id: 'admin' } }
      );
      res.send(result);
    });

    app.delete('/favorites/:id', async (req, res) => {
      const id = req.params.id;
      const result = await favoritesCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });



    app.get('/biodata/:id', async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Middleware: verifyJWT must set req.user.email
    app.get('/mydetail/:email', async (req, res) => {
      try {
        const userEmail = req.params.email;

        const result = await usersCollection.findOne({ email: userEmail });

        res.send(result);
      } catch (error) {
        console.error("Error fetching biodata:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });



    // GET /similarBiodatas/:type/:id
    app.get("/similarBiodatas/:type/:id", async (req, res) => {
      const { type, id } = req.params;

      if (!type && !id) {
        return;
      }

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

    app.post('/favorites', async (req, res) => {
      const { biodataId, userEmail } = req.body;

      console.log(biodataId, userEmail)


      // Prevent duplicate favorites

      const result = await favoritesCollection.insertOne({
        biodataId,
        userEmail,
        createdAt: new Date(),
      });

      res.status(201).json({ message: 'Added to favorites', insertedId: result.insertedId });
    });


    app.put('/biodata/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const objId = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: data
      }
      const result = await usersCollection.updateOne(objId, updateDoc);
      res.send(result);
    })

    //premium request
    app.put('/biodatas/premium/:id', async (req, res) => {
      const id = req.params.id;
      const { isPremium } = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isPremium } }
      );

      res.send(result);
    });


    //take money
    app.post('/create-payment-intent', async (req, res) => {
      const amount = req.body?.amountInCents;
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card']
      })

      res.send({ clientSecret: paymentIntent.client_secret });
    })



    //payment 
    app.post('/record-payment', async (req, res) => {
      const { biodataId, email, transactionId, amount, method = 'card' } = req.body;

      const paymentDoc = {
        biodataId,
        email,
        transactionId,
        amount,
        method,
        status: 'pending',
        paid_at: new Date().toISOString(),
      };

      try {
        const result = await paymentsCollection.insertOne(paymentDoc);
        res.status(201).json({ message: 'Payment recorded', insertedId: result.insertedId });
      } catch (error) {
        res.status(500).json({ message: 'Failed to save payment', error: error.message });
      }
    });


    app.get('/contactRequests', async (req, res) => {
      const email = req.query.email;
      const data = email ? { email } : {status: 'approved'};
      const result = await paymentsCollection.find(data).toArray();

      for (const pay of result) {
        const id = pay.biodataId;
        const objId = { _id: new ObjectId(id) };
        const user = await usersCollection.findOne(objId);
        pay.biodataEmail = user.email;
        pay.biodataMobile = user.mobile;
        pay.biodataName = user.name;
      }
      res.send(result);

    })


    app.get('/contactRequests/pending', async (req, res) => {
      const query = {status: 'pending'};
      const result = await paymentsCollection.find(query).toArray();

      for (const pay of result) {
        const id = pay.biodataId;
        const objId = { _id: new ObjectId(id) };
        const user = await usersCollection.findOne(objId);
        pay.biodataEmail = user.email;
        pay.biodataMobile = user.mobile;
        pay.biodataName = user.name;
      }
      res.send(result);

    })


    app.patch('/contactRequests/:id/approve', async (req, res) => {
      const id = req.params.id;

      try {
        const result = await paymentsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: 'approved' } }
        );

        res.send({ message: 'Contact request approved' });

      } catch (error) {
        res.status(500).send({ message: 'Failed to approve', error: error.message });
      }
    });


    app.delete('/contactRequests/:id', async (req, res) => {
      try {
        const { id } = req.params;


        const result = await paymentsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Biodata not found' });
        }

        res.status(200).json({ message: 'Biodata deleted successfully' });
      } catch (error) {
        console.error('Error deleting biodata:', error);
        res.status(500).json({ message: 'Failed to delete biodata' });
      }
    });




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
