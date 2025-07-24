import { PrismaClient } from "@prisma/client";
import { findBestListingMatch } from "../utils/matcher.js";

const prisma = new PrismaClient();

export const matchLeadsToListings = async (req, res) => {
  try {
    const unmatchedLeads = await prisma.lead.findMany({
      where: { matchedListingId: null },
    });

    if (!unmatchedLeads.length) {
      return res.status(200).json({
        success: true,
        message: "No unmatched leads found.",
        matches: [],
      });
    }

    const matches = [];

    for (const lead of unmatchedLeads) {
      try {
        if (!lead.embedding) continue;

        const leadVec = JSON.parse(lead.embedding);
        const tolerance = 100000;

        const matched = await findBestListingMatch(
          leadVec,
          lead.budgetMin,
          lead.budgetMax,
          tolerance
        );

        if (matched) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              matchedListingId: matched.id,
              status: "matched",
            },
          });

          matches.push({ leadId: lead.id, listingId: matched.id });
        }
      } catch (err) {
        console.error(`Error processing lead ${lead.id}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      matchedCount: matches.length,
      matches,
    });
  } catch (err) {
    console.error("Matching error:", err.message);
    return res.status(500).json({ success: false, error: "Matching failed." });
  }
};
