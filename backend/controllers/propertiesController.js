import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const displayAllProperties = async (req, res) => {
  try {
    const properties = await prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(properties);
  } catch {
    console.error(e);
    res.status(500).json({ error: "failed fetch properties" });
  }
};

export const displaySearchedProperties = async (req, res) => {
  const { searchText } = req.body;
  try {
  } catch {}
};
