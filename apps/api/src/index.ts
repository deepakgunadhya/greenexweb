const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { setupSwagger } from "./config/swagger";
import { DatabaseSeeder } from "./config/seed";
import { Server } from "socket.io";
import { getGroupOfUser } from "./middleware/getGroupOfUser.middleware";
import * as http from "http";

import routes from "./routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || [
      "http://localhost:3000",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3002",
    ],
    credentials: true,
  })
);

// Rate limiting - more generous for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // higher limit for dev
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Static file serving for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Swagger documentation
const swaggerSpec = setupSwagger();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || [
      "http://localhost:3000",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3002",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

global._io = io;

// API routes
app.use("/api/v1", routes);

io.on("connection", async (socket) => {
  const userId: any = socket.handshake.query.userId; // frontend must send userId at connect

  if (userId) socket.join(userId.toString());

  const allGroupOfUser = await getGroupOfUser(userId);

  allGroupOfUser.forEach((group) => {
    socket.join(`group:${group.id}`);
  });

  io.emit("userOnline", userId);

  socket.on("disconnect", () => {
    console.log("User disconnected:", userId);
    io.emit("userOffline", userId);
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  if (process.env.NODE_ENV !== "test") {
    const seeder = new DatabaseSeeder();

    // Check database connection
    const isConnected = await seeder.checkConnection();
    if (!isConnected) {
      logger.error("❌ Failed to connect to database. Exiting...");
      process.exit(1);
    }

    // Run database seeding
    try {
      await seeder.seed();
    } catch (error) {
      logger.warn(
        "⚠️ Database seeding failed, but server will continue:",
        error
      );
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 vvvGreenex API server is running on port ${PORT}`);
      logger.info(
        `📖 API documentation available at http://localhost:${PORT}/api-docs`
      );
      logger.info(
        `🏥 Health check available at http://localhost:${PORT}/health`
      );
      logger.info(`💾 Database: PostgreSQL with Prisma ORM`);
      logger.info(`🔐 Default login: admin@greenex.com / admin123`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      await seeder.disconnect();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully...");
      await seeder.disconnect();
      process.exit(0);
    });
  }
}

// Start the server
startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});

export default app;
 
 
