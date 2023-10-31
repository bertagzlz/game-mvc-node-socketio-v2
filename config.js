//import { config } from "dotenv";
const config=require('dotenv');
config(); // lee las var de entorno
export const PORT = process.env.PORT || 4111;
export const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost/socketsdb";
