import express from "express";
import {
  displayAllProperties,
  displaySearchedProperties,
} from "../controllers/propertiesController.js";

const router = express.Router();
router.get("/", displayAllProperties);
router.post("/", displaySearchedProperties);

export default router;
