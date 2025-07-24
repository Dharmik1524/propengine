import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { findBestListingMatch } from "../utils/matcher.js";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const REQUIRED_FIELDS = [
  "customerName",
  "requirements",
  "location",
  "budgetMin",
  "budgetMax",
];

const systemPrompt = `
You're an AI assistant helping homebuyers submit their property needs.

Required fields:
- customerName
- requirements
- location
- budgetMin (USD)
- budgetMax (USD)

If any field is missing, DO NOT return JSON.
Instead, ask a follow-up question.

Once all required fields are collected, reply like this:
"Great. I have all the required information to create your lead. Here’s what I’ve gathered:
- Name: ...
- Location: ...
- Budget: ...
- Requirements: ...
Do you want to submit and get contacted by property agents?"

Wait for confirmation. Only then reply with valid JSON and this line:
"Notice: Buyer lead has been saved successfully."
`;

export const createLead = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

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
    if (!reply)
      return res
        .status(500)
        .json({ success: false, error: "No response from OpenAI." });

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
      const tolerance = 100000; // ⬅ configurable per platform, later from ENV or agent profile
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
