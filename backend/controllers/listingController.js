import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

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

const systemPrompt = `
You're an AI assistant helping real estate agents list their properties.

Required fields:
- agentId
- title
- description
- location
- price
- bedrooms
- bathrooms
- features (as JSON, e.g. {parking: true, balcony: true})

If any of these are missing, ask follow-up questions.

Once all fields are provided, summarize like this:
"Great! Here's a summary of your property listing:
- Title: ...
- Location: ...
- Price: $...
- Bedrooms: ...
- Bathrooms: ...
- Features: ...
Do you want to submit this listing?"

Only if the user confirms with 'yes' or 'submit', then reply with valid JSON and this line:
"Notice: Property listing saved successfully."
`;

export const createListing = async (req, res) => {
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
      let listingData;

      const lastUserMessage = history.at(-1)?.content?.toLowerCase() || "";
      const confirmed = /yes|submit|confirm/.test(lastUserMessage);
      const containsNotice = reply.includes(
        "Notice: Property listing saved successfully."
      );

      if (confirmed && containsNotice) {
        const jsonMatch = reply.match(/```json\\s*([\\s\\S]+?)\\s*```/);
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

      if (!listingData) throw new Error("No valid JSON found");

      console.log("Extracted listingData:", listingData);

      const embed = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: listingData.description,
      });

      listingData.embedding = JSON.stringify(embed.data[0].embedding);

      const savedListing = await prisma.listing.create({ data: listingData });

      return res.status(201).json({ success: true, listing: savedListing });
    } catch (err) {
      console.error("Listing parse/validation error:", err.message);
      return res.status(200).json({ success: false, followUp: reply });
    }
  } catch (err) {
    console.error("Create listing error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
