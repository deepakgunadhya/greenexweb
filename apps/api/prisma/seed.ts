import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create Super Admin role (SRS 5.1.4 - Full access)
  const superAdminPermissions = JSON.stringify([
    // User management
    "users:read",
    "users:create",
    "users:update",
    "users:delete",

    // Role management
    "roles:read",
    "roles:create",
    "roles:update",
    "roles:delete",

    // Organization & CRM
    "organizations:read",
    "organizations:create",
    "organizations:update",
    "organizations:delete",
    "leads:read",
    "leads:create",
    "leads:update",
    "leads:delete",

    // Services & Projects
    "services:read",
    "services:create",
    "services:update",
    "services:delete",
    "quotations:read",
    "quotations:create",
    "quotations:update",
    "quotations:delete",
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:delete",

    // Tasks & Checklists
    "tasks:read",
    "tasks:read-all",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "tasks:assign",
    "tasks:manage-locks",
    "checklists:read",
    "checklists:create",
    "checklists:update",
    "checklists:delete",
    "checklists:verify",
    "checklists:review",

    // Reports & Documents
    "reports:read",
    "reports:create",
    "reports:update",
    "reports:delete",
    "comments:read",
    "comments:create",
    "comments:update",
    "comments:delete",

    // Payments & Invoicing
    "payments:read",
    "payments:create",
    "payments:update",
    "payments:delete",

    // System & Settings
    "system:read",
    "system:update",

    // CMS Permission
    "cms:read",
    "cms:create",
    "cms:update",
    "cms:delete",

    // Notifications
    "notifications:read",
    "notifications:create",

    // Analytics & Reports
    "analytics:read",
    "exports:create",

    //Meting Roles
    "meetings:read",
    "meetings:create",
    "meetings:update",
    "meetings:delete",

    //CHATModule Access
    "chat-module:access",
  ]);

  const superAdminRole = await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: { permissions: superAdminPermissions },
    create: {
      name: "Super Admin",
      description: "Super administrator with full system access",
      permissions: superAdminPermissions,
    },
  });

  // Create Sales Executive role (SRS 5.1.4 - Full CRM access)
  const salesExecutiveRole = await prisma.role.upsert({
    where: { name: "Sales Executive" },
    update: {},
    create: {
      name: "Sales Executive",
      description: "Sales team with full CRM access",
      permissions: JSON.stringify([
        // CRM - Full CRUD access per SRS 5.1.4
        // Organization & CRM
        "organizations:read",
        "organizations:create",
        "organizations:update",
        "organizations:delete",
        "leads:read",
        "leads:create",
        "leads:update",
        "leads:delete",
        // "crm:contacts:view",
        // "crm:contacts:create",
        // "crm:contacts:update",
        // "crm:contacts:delete",
        // Quotations - Full access for sales
        "quotations:read",
        "quotations:create",
        "quotations:update",
        "quotations:delete",
      ]),
    },
  });

  // Create Ops Manager role (SRS 5.1.4 - Read-only CRM access)
  const opsManagerPermissions = JSON.stringify([
    // CRM - Read-only access per SRS 5.1.4
    "leads:read",
    "organizations:read",
    //"contacts:read",
    // Project management
    "projects:read",
    "projects:create",
    "projects:update",
    "services:read",
    "services:create",
    "services:update",
    "tasks:read",
    "tasks:read-all",
    "tasks:create",
    "tasks:update",
    "tasks:assign",
    "tasks:manage-locks",
    "checklists:read",
    "checklists:create",
    "checklists:update",
    "checklists:verify",
    "checklists:review",
  ]);

  const opsManagerRole = await prisma.role.upsert({
    where: { name: "Ops Manager" },
    update: { permissions: opsManagerPermissions },
    create: {
      name: "Ops Manager",
      description: "Operations manager with read-only CRM access",
      permissions: opsManagerPermissions,
    },
  });

  // Create Accounts role (SRS 5.1.4 - Read-only CRM access)
  const accountsRole = await prisma.role.upsert({
    where: { name: "Accounts" },
    update: {},
    create: {
      name: "Accounts",
      description: "Accounts team with read-only CRM access",
      permissions: JSON.stringify([
        // CRM - Read-only access per SRS 5.1.4
        "leads:read",
        "organizations:read",
        // "contacts:read",
        // Payment management
        "payments:read",
        "payments:create",
        "payments:update",
      ]),
    },
  });

  // Create Analyst role (SRS 5.1.4 - No CRM access)
  const analystRole = await prisma.role.upsert({
    where: { name: "Analyst" },
    update: {},
    create: {
      name: "Analyst",
      description: "Data analyst with no CRM access",
      permissions: JSON.stringify([
        // No CRM access per SRS 5.1.4
        "analytics:read",
        "reports:read",
      ]),
    },
  });

  // Create QA role (SRS 5.1.4 - No CRM access)
  const qaRole = await prisma.role.upsert({
    where: { name: "QA" },
    update: {},
    create: {
      name: "QA",
      description: "Quality assurance with no CRM access",
      permissions: JSON.stringify([
        // No CRM access per SRS 5.1.4
        "projects:read",
        "tasks:read",
        "reports:read",
      ]),
    },
  });

  // Create Client User role (SRS 5.1.4 - No CRM access)
  const clientUserRole = await prisma.role.upsert({
    where: { name: "Client User" },
    update: {
      // Update existing role to add checklist + chat permissions
      permissions: JSON.stringify([
        // No CRM access per SRS 5.1.4
        "projects:read", // Only their own projects
        // SRS 5.9 - Client Review: View quotations sent to them
        "quotations:read",
        // SRS 5.17.1 - Meetings: View and participate in meetings
        "meetings:read",
        "meetings:update",
        // SRS 5.9 - Comments/Discussions for client review
        "comments:read",
        "comments:create",
        "comments:update",
        // Reports - View project reports and drafts
        "reports:read",
        // Notifications
        "notifications:read",
        // Document-based checklists - Client workflow
        "checklists:read",   // View assigned templates
        "checklists:submit", // Upload completed documents
        // Chat - communicate with internal team
        "chat-module:access",
      ]),
    },
    create: {
      name: "Client User",
      description: "External client with no CRM access",
      permissions: JSON.stringify([
        // No CRM access per SRS 5.1.4
        "projects:read", // Only their own projects
        // SRS 5.9 - Client Review: View quotations sent to them
        "quotations:read",
        // SRS 5.17.1 - Meetings: View and participate in meetings
        "meetings:read",
        "meetings:update",
        // SRS 5.9 - Comments/Discussions for client review
        "comments:read",
        "comments:create",
        "comments:update",
        // Reports - View project reports and drafts
        "reports:read",
        // Notifications
        "notifications:read",
        // Document-based checklists - Client workflow
        "checklists:read",   // View assigned templates
        "checklists:submit", // Upload completed documents
        // Chat - communicate with internal team
        "chat-module:access",
      ]),
    },
  });

  const projectManagerPermissions = JSON.stringify([
    // Organizations & CRM (read-only)
    "organizations:read",
    "leads:read",
    // Projects & Services
    "projects:read",
    "projects:create",
    "projects:update",
    "services:read",
    "services:create",
    "services:update",
    "services:delete",
    "quotations:read",
    "quotations:create",
    "quotations:update",
    // Tasks & Checklists
    "tasks:read",
    "tasks:read-all",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "tasks:assign",
    "checklists:read",
    "checklists:create",
    "checklists:update",
    "checklists:verify",
    "checklists:review",
    // Reports & Documents
    "reports:read",
    "reports:create",
    "reports:update",
    "comments:read",
    "comments:create",
    "comments:update",
    // Payments (read-only)
    "payments:read",
    // Notifications
    "notifications:read",
    // Analytics
    "analytics:read",
  ]);

  const managerRole = await prisma.role.upsert({
    where: { name: "Project Manager" },
    update: { permissions: projectManagerPermissions },
    create: {
      name: "Project Manager",
      description: "Project manager with access to project operations",
      permissions: projectManagerPermissions,
    },
  });

  const consultantRole = await prisma.role.upsert({
    where: { name: "Consultant" },
    update: {},
    create: {
      name: "Consultant",
      description: "Environmental consultant with task execution permissions",
      permissions: JSON.stringify([
        // Projects (read-only)
        "projects:read",
        "services:read",
        // Tasks & Checklists
        "tasks:read",
        "tasks:update",
        "checklists:read",
        "checklists:update",
        // Reports & Documents
        "reports:read",
        "reports:create",
        "reports:update",
        "comments:read",
        "comments:create",
        // Notifications
        "notifications:read",
      ]),
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "User" },
    update: {},
    create: {
      name: "User",
      description: "Basic user with limited permissions",
      permissions: JSON.stringify([
        // Basic read permissions
        "projects:read",
        "tasks:read",
        "notifications:read",
      ]),
    },
  });

  console.log("✅ Roles created");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@greenex.com" },
    update: {},
    create: {
      email: "admin@greenex.com",
      password: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      isActive: true,
      isVerified: true,
    },
  });

  // Assign super admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  console.log("✅ Admin user created");

  // Create additional test users for quotations module
  const salesExecPassword = await bcrypt.hash("sales123", 12);
  const salesExecutiveUser = await prisma.user.upsert({
    where: { email: "sales@greenex.com" },
    update: {},
    create: {
      email: "sales@greenex.com",
      password: salesExecPassword,
      firstName: "Sarah",
      lastName: "Johnson",
      phone: "+1-555-0101",
      isActive: true,
      isVerified: true,
    },
  });

  // Assign sales executive role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: salesExecutiveUser.id,
        roleId: salesExecutiveRole.id,
      },
    },
    update: {},
    create: {
      userId: salesExecutiveUser.id,
      roleId: salesExecutiveRole.id,
    },
  });

  const projectManagerPassword = await bcrypt.hash("manager123", 12);
  const projectManagerUser = await prisma.user.upsert({
    where: { email: "manager@greenex.com" },
    update: {},
    create: {
      email: "manager@greenex.com",
      password: projectManagerPassword,
      firstName: "Michael",
      lastName: "Chen",
      phone: "+1-555-0102",
      isActive: true,
      isVerified: true,
    },
  });

  // Assign project manager role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: projectManagerUser.id,
        roleId: managerRole.id,
      },
    },
    update: {},
    create: {
      userId: projectManagerUser.id,
      roleId: managerRole.id,
    },
  });

  console.log("✅ Internal users created");

  // Create sample services
  const services = [
    {
      name: "Environmental Audit",
      description: "Comprehensive environmental assessment and audit services",
      category: "Auditing",
      basePrice: 5000.0,
    },
    {
      name: "Sustainability Consulting",
      description: "Strategic sustainability planning and implementation",
      category: "Consulting",
      basePrice: 3000.0,
    },
    {
      name: "Carbon Footprint Assessment",
      description: "Detailed carbon footprint analysis and reporting",
      category: "Assessment",
      basePrice: 2500.0,
    },
    {
      name: "EcoVadis Preparation",
      description: "EcoVadis assessment preparation and support",
      category: "Certification",
      basePrice: 4000.0,
    },
    {
      name: "Waste Management Planning",
      description: "Comprehensive waste management strategy development",
      category: "Planning",
      basePrice: 2000.0,
    },
  ];

  const createdServices: { [key: string]: any } = {};
  for (const service of services) {
    const created = await prisma.service.create({
      data: service,
    });
    createdServices[service.name] = created;
  }

  console.log("✅ Services created");

  // Create sample organizations
  const organizationsData = [
    {
      name: "GreenTech Industries",
      type: "CLIENT" as const,
      industry: "Technology",
      email: "contact@greentech.com",
      phone: "+1-555-0123",
      city: "San Francisco",
      country: "USA",
    },
    {
      name: "EcoManufacturing Corp",
      type: "PROSPECT" as const,
      industry: "Manufacturing",
      email: "info@ecomanufacturing.com",
      phone: "+1-555-0456",
      city: "Chicago",
      country: "USA",
    },
    {
      name: "Sustainable Solutions Ltd",
      type: "PARTNER" as const,
      industry: "Consulting",
      email: "partnerships@sustainablesolutions.com",
      phone: "+1-555-0789",
      city: "New York",
      country: "USA",
    },
  ];

  const createdOrganizations: { [key: string]: any } = {};
  for (const org of organizationsData) {
    const created = await prisma.organization.create({
      data: org,
    });
    createdOrganizations[org.name] = created;
  }

  console.log("✅ Organizations created");

  // Create client users for organizations (after organizations exist)
  const clientPassword = await bcrypt.hash("client123", 12);
  const clientUser = await prisma.user.upsert({
    where: { email: "client@greentech.com" },
    update: {
      userType: "CLIENT",
      organizationId: createdOrganizations["GreenTech Industries"].id,
    },
    create: {
      email: "client@greentech.com",
      password: clientPassword,
      firstName: "Jennifer",
      lastName: "Davis",
      phone: "+1-555-0200",
      userType: "CLIENT",
      organizationId: createdOrganizations["GreenTech Industries"].id,
      isActive: true,
      isVerified: true,
    },
  });

  // Assign client user role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: clientUser.id,
        roleId: clientUserRole.id,
      },
    },
    update: {},
    create: {
      userId: clientUser.id,
      roleId: clientUserRole.id,
    },
  });

  // Create additional client users for other organizations
  const ecoManufacturingClientPassword = await bcrypt.hash(
    "ecomanufacturing123",
    12
  );
  const ecoManufacturingClientUser = await prisma.user.upsert({
    where: { email: "client@ecomanufacturing.com" },
    update: {
      userType: "CLIENT",
      organizationId: createdOrganizations["EcoManufacturing Corp"].id,
    },
    create: {
      email: "client@ecomanufacturing.com",
      password: ecoManufacturingClientPassword,
      firstName: "Robert",
      lastName: "Martinez",
      phone: "+1-555-0201",
      userType: "CLIENT",
      organizationId: createdOrganizations["EcoManufacturing Corp"].id,
      isActive: true,
      isVerified: true,
    },
  });

  // Assign client user role to EcoManufacturing client
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: ecoManufacturingClientUser.id,
        roleId: clientUserRole.id,
      },
    },
    update: {},
    create: {
      userId: ecoManufacturingClientUser.id,
      roleId: clientUserRole.id,
    },
  });

  // Create client user for Sustainable Solutions Ltd
  const sustainableSolutionsClientPassword = await bcrypt.hash(
    "sustainable123",
    12
  );
  const sustainableSolutionsClientUser = await prisma.user.upsert({
    where: { email: "client@sustainablesolutions.com" },
    update: {
      userType: "CLIENT",
      organizationId: createdOrganizations["Sustainable Solutions Ltd"].id,
    },
    create: {
      email: "client@sustainablesolutions.com",
      password: sustainableSolutionsClientPassword,
      firstName: "Lisa",
      lastName: "Anderson",
      phone: "+1-555-0202",
      userType: "CLIENT",
      organizationId: createdOrganizations["Sustainable Solutions Ltd"].id,
      isActive: true,
      isVerified: true,
    },
  });

  // Assign client user role to Sustainable Solutions client
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: sustainableSolutionsClientUser.id,
        roleId: clientUserRole.id,
      },
    },
    update: {},
    create: {
      userId: sustainableSolutionsClientUser.id,
      roleId: clientUserRole.id,
    },
  });

  console.log("✅ Client users created");

  // Create sample contacts for organizations
  const contactsData = [
    {
      organizationId: createdOrganizations["GreenTech Industries"].id,
      firstName: "David",
      lastName: "Wilson",
      email: "david.wilson@greentech.com",
      phone: "+1-555-1234",
      position: "Environmental Manager",
      isPrimary: true,
    },
    {
      organizationId: createdOrganizations["GreenTech Industries"].id,
      firstName: "Emma",
      lastName: "Thompson",
      email: "emma.thompson@greentech.com",
      phone: "+1-555-1235",
      position: "Sustainability Director",
      isPrimary: false,
    },
    {
      organizationId: createdOrganizations["EcoManufacturing Corp"].id,
      firstName: "Robert",
      lastName: "Martinez",
      email: "robert.martinez@ecomanufacturing.com",
      phone: "+1-555-4567",
      position: "Operations Manager",
      isPrimary: true,
    },
    {
      organizationId: createdOrganizations["Sustainable Solutions Ltd"].id,
      firstName: "Lisa",
      lastName: "Anderson",
      email: "lisa.anderson@sustainablesolutions.com",
      phone: "+1-555-7890",
      position: "Partnership Manager",
      isPrimary: true,
    },
  ];

  const createdContacts: any[] = [];
  for (const contact of contactsData) {
    const created = await prisma.contact.create({
      data: contact,
    });
    createdContacts.push(created);
  }

  console.log("✅ Sample contacts created");

  // Create sample leads with SRS-aligned status and source values
  const sampleLeadsData = [
    {
      organizationId: createdOrganizations["GreenTech Industries"].id,
      contactId: createdContacts[0].id, // David Wilson
      source: "MOBILE_APP" as const,
      status: "NEW" as const,
      title: "Environmental Audit Enquiry",
      description:
        "Interested in comprehensive environmental audit services for their tech facility",
      estimatedValue: 15000,
      probability: 75,
      businessStage: "INITIAL" as const,
      requiresMeeting: true,
    },
    {
      organizationId: createdOrganizations["EcoManufacturing Corp"].id,
      contactId: createdContacts[2].id, // Robert Martinez
      source: "MANUAL" as const,
      status: "IN_PROGRESS" as const,
      title: "Sustainability Consulting Project",
      description:
        "Manufacturing sustainability improvements and compliance assessment",
      estimatedValue: 25000,
      probability: 60,
      businessStage: "QUOTATION_SENT" as const,
      requiresMeeting: false,
    },
    {
      organizationId: createdOrganizations["GreenTech Industries"].id,
      contactId: createdContacts[1].id, // Emma Thompson
      source: "MANUAL" as const,
      status: "NEW" as const,
      title: "EcoVadis Assessment Support",
      description:
        "Need assistance with EcoVadis assessment preparation and documentation",
      estimatedValue: 12000,
      probability: 80,
      businessStage: "INITIAL" as const,
      requiresMeeting: true,
    },
    {
      organizationId: createdOrganizations["Sustainable Solutions Ltd"].id,
      contactId: createdContacts[3].id, // Lisa Anderson
      source: "MOBILE_APP" as const,
      status: "QUALIFIED" as const,
      title: "Partnership for Carbon Footprint Services",
      description:
        "Exploring partnership opportunities for carbon footprint assessment services",
      estimatedValue: 50000,
      probability: 45,
      businessStage: "MEETING_SCHEDULED" as const,
      requiresMeeting: true,
    },
  ];

  const createdLeads: any[] = [];
  for (const lead of sampleLeadsData) {
    const created = await prisma.lead.create({
      data: lead,
    });
    createdLeads.push(created);
  }

  console.log(
    "✅ Sample leads created with SRS-aligned status and source values"
  );

  // Create sample meetings for client testing
  const sampleMeetingsData = [
    {
      leadId: createdLeads[0].id, // Environmental Audit Enquiry
      title: "Initial Environmental Audit Discussion",
      description:
        "Kickoff meeting to discuss environmental audit requirements and scope",
      scheduledAt: new Date("2024-01-20T10:00:00Z"),
      duration: 60,
      location: "GreenTech Industries Office",
      meetingType: "KICKOFF" as const,
      status: "COMPLETED" as const,
      organizedBy: salesExecutiveUser.id,
      attendees: "David Wilson (GreenTech), Sarah Johnson (Greenex)",
      clientSide: "David Wilson - Environmental Manager",
      greenexSide: "Sarah Johnson - Sales Executive",
      outcome: "Agreed on audit scope and timeline. Quotation to be prepared.",
      actionItems:
        "Prepare detailed quotation, Schedule site visit for next week",
    },
    {
      leadId: createdLeads[2].id, // EcoVadis Assessment Support
      title: "EcoVadis Assessment Planning Meeting",
      description:
        "Planning meeting for EcoVadis assessment preparation and documentation support",
      scheduledAt: new Date("2024-01-25T14:00:00Z"),
      duration: 45,
      meetingLink: "https://meet.google.com/abc-defg-hij",
      meetingType: "PLANNING" as const,
      status: "SCHEDULED" as const,
      organizedBy: projectManagerUser.id,
      attendees: "Emma Thompson (GreenTech), Michael Chen (Greenex)",
      clientSide: "Emma Thompson - Sustainability Director",
      greenexSide: "Michael Chen - Project Manager",
      followUpRequired: true,
      followUpDate: new Date("2024-01-30T10:00:00Z"),
    },
  ];

  for (const meeting of sampleMeetingsData) {
    await prisma.meeting.create({
      data: meeting,
    });
  }

  console.log("✅ Sample meetings created for client testing");

  // Create sample quotations for client testing
  const sampleQuotationsData = [
    {
      leadId: createdLeads[0].id, // Environmental Audit Enquiry
      quotation_number: "QUO-2024-0001",
      title: "Environmental Audit Services - GreenTech Industries",
      description:
        "Comprehensive environmental audit including compliance assessment, waste management review, and sustainability reporting",
      amount: 15000.0,
      currency: "INR",
      valid_until: new Date("2024-02-20T23:59:59Z"),
      status: "SENT" as const,
      sentAt: new Date("2024-01-21T09:00:00Z"),
      uploadedBy: salesExecutiveUser.id,
      notes:
        "Quotation prepared following initial meeting. Includes 3-day onsite audit and comprehensive report.",
    },
    {
      leadId: createdLeads[2].id, // EcoVadis Assessment Support
      quotation_number: "QUO-2024-0002",
      title: "EcoVadis Assessment Preparation Support",
      description:
        "Complete EcoVadis assessment preparation including documentation review, gap analysis, and submission support",
      amount: 12000.0,
      currency: "INR",
      valid_until: new Date("2024-02-25T23:59:59Z"),
      status: "UPLOADED" as const,
      uploadedBy: projectManagerUser.id,
      notes:
        "Draft quotation for EcoVadis support services. Pending final review before sending.",
    },
  ];

  for (const quotation of sampleQuotationsData) {
    await prisma.quotation.create({
      data: quotation,
    });
  }

  console.log("✅ Sample quotations created for client testing");

  // SRS 5.13.2 - Create CMS Categories
  const categoriesData = [
    {
      name: "Awareness",
      description: "Environmental awareness and education content",
      slug: "awareness",
    },
    {
      name: "Carbon",
      description: "Carbon footprint and climate change content",
      slug: "carbon",
    },
    {
      name: "Water",
      description: "Water conservation and management content",
      slug: "water",
    },
    {
      name: "Waste",
      description: "Waste management and reduction content",
      slug: "waste",
    },
    {
      name: "EcoVadis",
      description: "EcoVadis assessment and certification content",
      slug: "ecovadis",
    },
    {
      name: "HR & Ethics",
      description: "Human resources and ethics content",
      slug: "hr-ethics",
    },
  ];

  const createdCategories: { [key: string]: any } = {};
  for (const category of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    createdCategories[category.slug] = created;
  }

  console.log("✅ CMS Categories created");

  // Create sample tags
  const tagsData = [
    { name: "Workshop", slug: "workshop" },
    { name: "Training", slug: "training" },
    { name: "Beginner", slug: "beginner" },
    { name: "Advanced", slug: "advanced" },
    { name: "Best Practices", slug: "best-practices" },
    { name: "Case Study", slug: "case-study" },
    { name: "Compliance", slug: "compliance" },
    { name: "Sustainability", slug: "sustainability" },
  ];

  const createdTags: { [key: string]: any } = {};
  for (const tag of tagsData) {
    const created = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    createdTags[tag.slug] = created;
  }

  console.log("✅ CMS Tags created");

  // SRS 5.13.1 - Create sample content (Blog, Graphics, Videos)
  // Sample Blog Content
  const blogContent = await prisma.content.upsert({
    where: { slug: "getting-started-environmental-sustainability" },
    update: {},
    create: {
      type: "BLOG",
      title: "Getting Started with Environmental Sustainability",
      slug: "getting-started-environmental-sustainability",
      summary:
        "A comprehensive guide to beginning your environmental sustainability journey.",
      content: `<h2>Introduction</h2><p>Environmental sustainability is crucial for businesses today. This guide will help you understand the basics and get started on the right path.</p><h3>Key Areas to Focus</h3><ul><li>Energy efficiency</li><li>Waste reduction</li><li>Carbon footprint management</li></ul>`,
      categoryId: createdCategories["awareness"].id,
      authorName: "Greenex Team",
      status: "PUBLISHED",
      publishDate: new Date(),
      isPublic: true,
      isFeatured: true,
      showInApp: true,
    },
  });

  // Sample Graphic Content
  const graphicContent = await prisma.content.upsert({
    where: { slug: "carbon-footprint-infographic" },
    update: {},
    create: {
      type: "GRAPHIC",
      title: "Carbon Footprint Infographic",
      slug: "carbon-footprint-infographic",
      summary:
        "Visual guide to understanding and reducing your carbon footprint.",
      categoryId: createdCategories["carbon"].id,
      authorName: "Greenex Design Team",
      status: "PUBLISHED",
      publishDate: new Date(),
      isPublic: true,
      isFeatured: false,
      showInApp: true,
      imageUrl: "/uploads/carbon-footprint-infographic.png", // Placeholder
    },
  });

  // Sample Video Content
  const videoContent = await prisma.content.upsert({
    where: { slug: "environmental-compliance-workshop" },
    update: {},
    create: {
      type: "VIDEO",
      title: "Environmental Compliance Workshop",
      slug: "environmental-compliance-workshop",
      summary:
        "Learn about environmental compliance requirements and best practices.",
      categoryId: createdCategories["awareness"].id,
      authorName: "Greenex Training Team",
      status: "PUBLISHED",
      publishDate: new Date(),
      isPublic: false, // Client-only content
      isFeatured: false,
      showInApp: true,
      isTraining: true,
      eventDate: new Date("2024-01-15T10:00:00Z"),
      eventLink: "https://meet.google.com/abc-defg-hij",
      videoUrl: "https://youtube.com/watch?v=example123",
      videoThumb: "https://img.youtube.com/vi/example123/maxresdefault.jpg",
    },
  });

  // Create content-tag relationships
  await prisma.contentTag.upsert({
    where: {
      contentId_tagId: {
        contentId: blogContent.id,
        tagId: createdTags["beginner"].id,
      },
    },
    update: {},
    create: {
      contentId: blogContent.id,
      tagId: createdTags["beginner"].id,
    },
  });
  await prisma.contentTag.upsert({
    where: {
      contentId_tagId: {
        contentId: videoContent.id,
        tagId: createdTags["workshop"].id,
      },
    },
    update: {},
    create: {
      contentId: videoContent.id,
      tagId: createdTags["workshop"].id,
    },
  });
  console.log("✅ Sample CMS content created");
  console.log("🌟 Database seeded successfully!");
  console.log("");
  console.log("🔐 Test User Credentials:");
  console.log("  📋 Admin (Super Admin):");
  console.log("     Email: admin@greenex.com");
  console.log("     Password: admin123");
  console.log("     Permissions: Full system access");
  console.log("");
  console.log("  💼 Sales Executive:");
  console.log("     Email: sales@greenex.com");
  console.log("     Password: sales123");
  console.log("     Permissions: Full CRM + Quotations");
  console.log("");
  console.log("  🎯 Project Manager:");
  console.log("     Email: manager@greenex.com");
  console.log("     Password: manager123");
  console.log("     Permissions: Projects + Quotations (read/create/update)");
  console.log("");
  console.log("  👤 Client Users:");
  console.log("     GreenTech Industries Client:");
  console.log("       Email: client@greentech.com");
  console.log("       Password: client123");
  console.log("       Organization: GreenTech Industries");
  console.log("     EcoManufacturing Corp Client:");
  console.log("       Email: client@ecomanufacturing.com");
  console.log("       Password: ecomanufacturing123");
  console.log("       Organization: EcoManufacturing Corp");
  console.log("     Sustainable Solutions Ltd Client:");
  console.log("       Email: client@sustainablesolutions.com");
  console.log("       Password: sustainable123");
  console.log("       Organization: Sustainable Solutions Ltd");
  console.log(
    "     Permissions: Projects + Quotations + Meetings + Comments + Reports (for their organization only)"
  );
  console.log("");
  console.log("📝 Sample data created:");
  console.log("   - 7 user roles with quotations permissions");
  console.log("   - 4 test users with different access levels");
  console.log("   - 5 environmental services");
  console.log("   - 3 sample organizations with contacts");
  console.log("   - 4 sample contacts across organizations");
  console.log("   - 4 diverse leads for quotation testing");
  console.log("   - 2 sample meetings (completed and scheduled)");
  console.log("   - 2 sample quotations (sent and draft)");
  console.log("   - CMS with 6 categories, 8 tags, and 3 sample content items");
  console.log("");
  console.log("🎯 Ready for Comprehensive Testing:");
  console.log("   - Use sales@greenex.com to create/manage quotations");
  console.log("   - Use manager@greenex.com to view/update quotations");
  console.log(
    "   - Use client@greentech.com to view quotations/meetings/comments"
  );
  console.log("   - 4 leads, 2 meetings, 2 quotations available");
  console.log("   - Full permission system with client access in place");
}
main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
