import { MongoClient, MongoClientOptions } from "mongodb";

/** Use cached mongo client to prevent multiple instances of clients caused by the hot-reload */
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Please add your Mongo URI to .env.local");
}

const options: MongoClientOptions = {};
const client = new MongoClient(uri, options);
const clientPromise = client.connect();

export default clientPromise;
