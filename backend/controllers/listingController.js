// File: /controllers/listingController.js
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const REQUIRED_FIELDS = [
  "agentId",
  "title",
  "description",
  "location",
  "price",
  "bedrooms",
  "bathrooms",
  "features",
];

const loadPrompt = async (filename) => {
  const filePath = path.resolve("prompts", filename);
  return await fs.readFile(filePath, "utf-8");
};

export const createListing = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const systemPrompt = await loadPrompt("listing.txt");

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    const gpt = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    const reply = gpt.choices[0].message.content;
    console.log("GPT raw reply:", reply);

    let listingData;

    const lastUserMessage = history.at(-1)?.content?.toLowerCase() || "";
    const confirmed = /yes|submit|confirm/.test(lastUserMessage);
    const containsNotice = reply.includes(
      "Notice: Property listing saved successfully."
    );

    if (confirmed && containsNotice) {
      const jsonMatch = reply.match(/```json\s*([\s\S]+?)\s*```/);
      if (jsonMatch) {
        listingData = JSON.parse(jsonMatch[1]);
      }
    }

    if (!listingData) {
      const matches = [...reply.matchAll(/\{(?:[^{}]|\{[^{}]*\})*\}/g)];
      for (const m of matches) {
        try {
          const parsed = JSON.parse(m[0]);
          const missing = REQUIRED_FIELDS.filter((f) => !(f in parsed));
          if (missing.length === 0) {
            listingData = parsed;
            break;
          }
        } catch {}
      }
    }

    if (!listingData) {
      return res.status(200).json({ success: false, followUp: reply });
    }

    const embed = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: listingData.description,
    });

    listingData.embedding = JSON.stringify(embed.data[0].embedding);

    const savedListing = await prisma.listing.create({ data: listingData });

    return res.status(201).json({ success: true, listing: savedListing });
  } catch (err) {
    console.error("Create listing error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
