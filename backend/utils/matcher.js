import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function cosineSimilarity(a, b) {
  let dot = 0,
    aNorm = 0,
    bNorm = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aNorm += a[i] ** 2;
    bNorm += b[i] ** 2;
  }
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

export const findBestListingMatch = async (
  leadVec,
  minBudget,
  maxBudget,
  tolerance = 100000
) => {
  const listings = await prisma.listing.findMany({
    where: {
      embedding: { not: null },
      price: {
        gte: minBudget - tolerance,
        lte: maxBudget + tolerance,
      },
    },
  });

  let bestScore = 0;
  let bestListing = null;

  for (const listing of listings) {
    const listVec = JSON.parse(listing.embedding);
    const score = cosineSimilarity(leadVec, listVec);
    if (score > bestScore) {
      bestScore = score;
      bestListing = listing;
    }
  }

  return bestScore >= 0.85 ? bestListing : null;
};
