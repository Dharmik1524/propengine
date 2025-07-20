import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
- requirements (short text like "2-bedroom flat near Central Park")
- location
- budgetMin (in USD)
- budgetMax (in USD)

If any field is missing, DO NOT return JSON.
Instead, ask a follow-up question.

Once all required fields are collected, summarize the info like this:
"Great! Here’s a summary of your request:
- Name: ...
- Location: ...
- Budget: $... – $...
- Requirements: ...

Do you want to submit and get contacted by property agents?"

Only if the user replies with 'yes' or 'submit', then reply with a valid JSON block and this line:
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

    const reply = gpt.choices[0].message.content;
    console.log("GPT raw reply:", reply);

    try {
      let leadData;

      //  Check for confirmation AND GPT's success message
      const lastUserMessage = history.at(-1)?.content?.toLowerCase() || "";
      const confirmed = /yes|submit|confirm/.test(lastUserMessage);
      const containsNotice = reply.includes(
        "Notice: Buyer lead has been saved successfully."
      );

      if (confirmed && containsNotice) {
        const jsonMatch = reply.match(/```json\s*([\s\S]+?)\s*```/);
        if (jsonMatch) {
          leadData = JSON.parse(jsonMatch[1]);
        }
      }

      // Optional fallback for debug/testing: extract first valid JSON
      if (!leadData) {
        const matches = [...reply.matchAll(/\{(?:[^{}]|\{[^{}]*\})*\}/g)];
        for (const m of matches) {
          try {
            const parsed = JSON.parse(m[0]);
            const missing = REQUIRED_FIELDS.filter((f) => !(f in parsed));
            if (missing.length === 0) {
              leadData = parsed;
              break;
            }
          } catch {}
        }
      }

      if (!leadData) throw new Error("No valid JSON found");

      console.log("Extracted leadData:", leadData);

      const embed = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: leadData.requirements,
      });

      leadData.embedding = JSON.stringify(embed.data[0].embedding);

      const savedLead = await prisma.lead.create({ data: leadData });

      return res.status(201).json({ success: true, lead: savedLead });
    } catch (err) {
      console.error("Lead parse/validation error:", err.message);
      return res.status(200).json({ success: false, followUp: reply });
    }
  } catch (err) {
    console.error("Create lead error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
