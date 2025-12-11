const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;
const admin = require("firebase-admin");
var serviceAccount = require("./firebasekey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

const uri = process.env.URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("traveTicketDB");
    const usersCollection = database.collection("users");
    const ticketsCollection = database.collection("tickets");

    // get spacific user by email
    app.get("/user", async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const currentUser = await usersCollection.findOne(query);
      res.send(currentUser);
    });

    // create users
    app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "user";
      user.createdAt = new Date();
      const email = user.email;

      const userExists = await usersCollection.findOne({ email });
      if (userExists) {
        return res.send({ message: "user exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // add Ticket api
    app.post("/add-ticket", async (req, res) => {
      const ticket = req.body;
      ticket.status = "pending";
      ticket.createdAt = new Date();
      const result = await ticketsCollection.insertOne(ticket);
      res.send(result);
    });

    // get tickets according to the different VENDOR
    app.get("/tickets", async (req, res) => {
      const userEmail = req.query.email;
      const query = { ticketCreatedBy: userEmail };
      const tickets = await ticketsCollection.find(query).toArray();
      res.send(tickets);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged deployment. successfully connected to MongoDB!");
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
