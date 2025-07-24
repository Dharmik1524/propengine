import express from "express";
import { matchLeadsToListings } from "../controllers/matchController.js";

const router = express.Router();

router.post("/", matchLeadsToListings);

export default router;
