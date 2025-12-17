const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const bookingCollection = database.collection("bookings");

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

    // get all the approved tickets by Admin
    app.get("/approved-tickets", async (req, res) => {
      const query = {
        status: "pending",
      };
      const tickets = await ticketsCollection.find(query).toArray();
      res.send(tickets);
    });

    // get ticket details
    app.get("/ticket/:id", async (req, res) => {
      const ticketId = new ObjectId(req.params.id);
      const query = { _id: ticketId };
      const ticketDetail = await ticketsCollection.findOne(query);
      res.send(ticketDetail);
    });

    // create booking collection
    app.post("/add-booking", async (req, res) => {
      const booking = req.body;
      booking.status = "pending";
      booking.createdAt = new Date();
      const result = await bookingCollection.insertOne(booking);
      // update ticket remaining from ticket collection
      const bookedTicketQuantity = booking.bookedQuantity;
      const ticketId = new ObjectId(booking.ticketId);
      const filter = {
        _id: ticketId,
        remainingTicket: { $gte: bookedTicketQuantity },
      };
      const updateTicketData = {
        $inc: {
          remainingTicket: -bookedTicketQuantity,
        },
      };
      const updateResult = await ticketsCollection.updateOne(
        filter,
        updateTicketData
      );

      res.send(result);
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
