const bcrypt = require("bcryptjs");
import prisma from "./database";
import { logger } from "../utils/logger";

export class DatabaseSeeder {
  async seed() {
    try {
      logger.info("🔄 Starting database seeding...");

      // Create roles first
      await this.createRoles();

      // Ensure client roles have required checklist permissions
      await this.ensureClientChecklistPermissions();

      // Ensure client roles have chat permission
      await this.ensureClientChatPermission();

      // Create admin user
      await this.createAdminUser();

      // Create sample organizations
      await this.createSampleOrganizations();

      logger.info("✅ Database seeding completed successfully");
    } catch (error) {
      logger.error("❌ Database seeding failed:", error);
      throw error;
    }
  }

  private async createRoles() {
    logger.info("Checking default roles...");

    const roles = [
      {
        name: "Super Admin",
        description: "Full access to all modules & settings",
        permissions: [
          "users:read",
          "users:create",
          "users:update",
          "users:delete",
          "roles:read",
          "roles:create",
          "roles:update",
          "roles:delete",
          // ... other permissions
        ],
      },
      // ... other roles
    ];
    for (const roleData of roles) {
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name },
      });
      if (!existingRole) {
        logger.info(`Creating role: ${roleData.name}`);
        await prisma.role.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            permissions: JSON.stringify(roleData.permissions),
          },
        });
      } else {
        logger.info(`Role already exists, skipping: ${roleData.name}`);
      }
    }
  }
  /**
   * Ensure Client User roles have required checklist permissions.
   * This runs on every startup to fix production roles that were
   * created before checklist permissions were added.
   */
  private async ensureClientChecklistPermissions() {
    const requiredPermissions = ["checklists:read", "checklists:submit"];

    const clientRole = await prisma.role.findUnique({
      where: { name: "Client User" },
    });

    if (!clientRole) return;

    try {
      const currentPermissions = JSON.parse(clientRole.permissions as string) as string[];
      const missingPermissions = requiredPermissions.filter(
        (p) => !currentPermissions.includes(p)
      );

      if (missingPermissions.length > 0) {
        const updatedPermissions = [...currentPermissions, ...missingPermissions];
        await prisma.role.update({
          where: { id: clientRole.id },
          data: { permissions: JSON.stringify(updatedPermissions) },
        });
        logger.info(
          `Updated Client User role with permissions: ${missingPermissions.join(", ")}`
        );
      }
    } catch (error) {
      logger.warn("Failed to update Client User permissions:", error);
    }
  }

  /**
   * Ensure Client User role has chat-module:access permission.
   * This runs on every startup to enable chat for client users
   * without requiring a full re-seed.
   */
  private async ensureClientChatPermission() {
    const requiredPermissions = ["chat-module:access"];

    const clientRole = await prisma.role.findUnique({
      where: { name: "Client User" },
    });

    if (!clientRole) return;

    try {
      const currentPermissions = JSON.parse(clientRole.permissions as string) as string[];
      const missingPermissions = requiredPermissions.filter(
        (p) => !currentPermissions.includes(p)
      );

      if (missingPermissions.length > 0) {
        const updatedPermissions = [...currentPermissions, ...missingPermissions];
        await prisma.role.update({
          where: { id: clientRole.id },
          data: { permissions: JSON.stringify(updatedPermissions) },
        });
        logger.info(
          `Updated Client User role with permissions: ${missingPermissions.join(", ")}`
        );
      }
    } catch (error) {
      logger.warn("Failed to update Client User chat permissions:", error);
    }
  }

  private async createAdminUser() {
    logger.info("Creating admin user...");

    const hashedPassword = await bcrypt.hash("admin123", 12);

    const adminUser = await prisma.user.upsert({
      where: { email: "admin@greenex.com" },
      update: {
        password: hashedPassword,
        isActive: true,
        isVerified: true,
      },
      create: {
        email: "admin@greenex.com",
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        isActive: true,
        isVerified: true,
      },
    });

    // Assign Super Admin role
    const adminRole = await prisma.role.findUnique({
      where: { name: "Super Admin" },
    });

    if (adminRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: adminRole.id,
          },
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });
    }

    logger.info("Admin user created with email: admin@greenex.com");
  }

  private async createSampleOrganizations() {
    logger.info("Creating sample organizations...");

    const organizations = [
      {
        name: "GreenTech Industries",
        type: "CLIENT" as const,
        industry: "Technology",
        email: "contact@greentech.com",
        phone: "+1-555-0123",
        website: "https://greentech.com",
        city: "San Francisco",
        state: "CA",
        country: "United States",
      },
      {
        name: "EcoManufacturing Corp",
        type: "PROSPECT" as const,
        industry: "Manufacturing",
        email: "info@ecomanufacturing.com",
        phone: "+1-555-0456",
        website: "https://ecomanufacturing.com",
        city: "Chicago",
        state: "IL",
        country: "United States",
      },
      {
        name: "Sustainable Solutions LLC",
        type: "PARTNER" as const,
        industry: "Consulting",
        email: "partnerships@sustainablesolutions.com",
        phone: "+1-555-0789",
        website: "https://sustainablesolutions.com",
        city: "Austin",
        state: "TX",
        country: "United States",
      },
    ];

    for (const orgData of organizations) {
      // Check if organization exists by name first
      const existingOrg = await prisma.organization.findFirst({
        where: { name: orgData.name },
      });

      if (!existingOrg) {
        await prisma.organization.create({
          data: {
            ...orgData,
            isActive: true,
          },
        });
      }
    }

    logger.info(`Created ${organizations.length} sample organizations`);
  }

  async checkConnection() {
    try {
      await prisma.$connect();
      logger.info("🟢 Database connection successful");
      return true;
    } catch (error) {
      logger.error("🔴 Database connection failed:", error);
      return false;
    }
  }

  async disconnect() {
    await prisma.$disconnect();
    logger.info("Database connection closed");
  }
}
