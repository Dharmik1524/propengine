import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { findBestListingMatch } from "../utils/matcher.js";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const REQUIRED_FIELDS = [
  "customerName",
  "requirements",
  "location",
  "budgetMin",
  "budgetMax",
];

const loadPrompt = async (filename) => {
  const filePath = path.resolve("prompts", filename);
  console.log(filename);
  return await fs.readFile(filePath, "utf-8");
};

export const createLead = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const systemPrompt = await loadPrompt("lead.txt");

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    const gpt = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    const reply = gpt.choices?.[0]?.message?.content;
    if (!reply) {
      return res
        .status(500)
        .json({ success: false, error: "No response from OpenAI." });
    }

    console.log("GPT raw reply:", reply);

    let leadData;
    if (reply.includes("Notice: Buyer lead has been saved successfully.")) {
      const match = reply.match(/```json\s*([\s\S]+?)\s*```/);
      if (match) {
        try {
          leadData = JSON.parse(match[1]);
        } catch {
          return res
            .status(400)
            .json({ success: false, error: "Invalid JSON from GPT." });
        }
      }
    }

    if (!leadData) {
      const fallback = [...reply.matchAll(/\{(?:[^{}]|\{[^{}]*\})*\}/g)];
      for (const m of fallback) {
        try {
          const obj = JSON.parse(m[0]);
          const missing = REQUIRED_FIELDS.filter((f) => !(f in obj));
          if (missing.length === 0) {
            leadData = obj;
            break;
          }
        } catch {}
      }
    }

    if (!leadData)
      return res.status(200).json({ success: false, followUp: reply });

    const embed = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: leadData.requirements,
    });

    leadData.embedding = JSON.stringify(embed.data[0].embedding);

    const savedLead = await prisma.lead.create({ data: leadData });

    try {
      const leadVec = JSON.parse(leadData.embedding);
      const tolerance = 100000;
      const match = await findBestListingMatch(
        leadVec,
        savedLead.budgetMin,
        savedLead.budgetMax,
        tolerance
      );

      if (match) {
        await prisma.lead.update({
          where: { id: savedLead.id },
          data: {
            matchedListingId: match.id,
            status: "matched",
          },
        });
      }
    } catch (e) {
      console.error("Auto-match error:", e.message);
    }

    return res.status(201).json({ success: true, lead: savedLead });
  } catch (err) {
    console.error("Create lead error:", err.message);
    return res.status(500).json({ success: false, error: "Server error." });
  }
};
