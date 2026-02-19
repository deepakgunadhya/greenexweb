import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "event" },
    { level: "info", emit: "event" },
    { level: "warn", emit: "event" },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug("Query: " + e.query);
    logger.debug("Params: " + e.params);
    logger.debug("Duration: " + e.duration + "ms");
  });
}

// Log errors
prisma.$on("error", (e) => {
  logger.error("Prisma Error: " + e.message);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down Prisma client...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down Prisma client...");
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
