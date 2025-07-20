import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import leadRoutes from "./routes/leads.js";
import listingRoutes from "./routes/listing.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/leads", leadRoutes);
app.use("/api/listings", listingRoutes);

app.get("/", (req, res) => res.send("PropEngine backend running"));

export default app;
