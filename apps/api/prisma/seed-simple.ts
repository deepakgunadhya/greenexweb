import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default roles and permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'System administrator with full access',
      permissions: JSON.stringify([
        'users:read', 'users:create', 'users:update', 'users:delete',
        'roles:read', 'roles:create', 'roles:update', 'roles:delete',
        'organizations:read', 'organizations:create', 'organizations:update', 'organizations:delete',
        'leads:read', 'leads:create', 'leads:update', 'leads:delete',
        'services:read', 'services:create', 'services:update', 'services:delete',
        'projects:read', 'projects:create', 'projects:update', 'projects:delete',
        'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete',
        'analytics:read', 'system:read', 'system:update'
      ])
    }
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Project Manager' },
    update: {},
    create: {
      name: 'Project Manager',
      description: 'Project manager with access to project operations',
      permissions: JSON.stringify([
        'organizations:read',
        'leads:read',
        'projects:read', 'projects:create', 'projects:update',
        'services:read',
        'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete',
        'analytics:read'
      ])
    }
  });

  const consultantRole = await prisma.role.upsert({
    where: { name: 'Consultant' },
    update: {},
    create: {
      name: 'Consultant',
      description: 'Environmental consultant with task execution permissions',
      permissions: JSON.stringify([
        'projects:read',
        'services:read',
        'tasks:read', 'tasks:update'
      ])
    }
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'User' },
    update: {},
    create: {
      name: 'User',
      description: 'Basic user with limited permissions',
      permissions: JSON.stringify([
        'projects:read',
        'tasks:read'
      ])
    }
  });

  const clientUserRole = await prisma.role.upsert({
    where: { name: 'Client User' },
    update: {
      permissions: JSON.stringify([
        'projects:read',
        'quotations:read',
        'meetings:read', 'meetings:update',
        'comments:read', 'comments:create', 'comments:update',
        'reports:read',
        'notifications:read',
        'checklists:read', 'checklists:submit',
        'chat-module:access'
      ])
    },
    create: {
      name: 'Client User',
      description: 'External client with portal access',
      permissions: JSON.stringify([
        'projects:read',
        'quotations:read',
        'meetings:read', 'meetings:update',
        'comments:read', 'comments:create', 'comments:update',
        'reports:read',
        'notifications:read',
        'checklists:read', 'checklists:submit',
        'chat-module:access'
      ])
    }
  });

  console.log('✅ Roles created');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@greenex.com' },
    update: {},
    create: {
      email: 'admin@greenex.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
      isVerified: true
    }
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id
    }
  });

  console.log('✅ Admin user created');

  // Create sample services
  const services = [
    {
      name: 'Environmental Audit',
      description: 'Comprehensive environmental assessment and audit services',
      category: 'Auditing',
      basePrice: 5000.00
    },
    {
      name: 'Sustainability Consulting',
      description: 'Strategic sustainability planning and implementation',
      category: 'Consulting',
      basePrice: 3000.00
    },
    {
      name: 'Carbon Footprint Assessment',
      description: 'Detailed carbon footprint analysis and reporting',
      category: 'Assessment',
      basePrice: 2500.00
    },
    {
      name: 'EcoVadis Preparation',
      description: 'EcoVadis assessment preparation and support',
      category: 'Certification',
      basePrice: 4000.00
    },
    {
      name: 'Waste Management Planning',
      description: 'Comprehensive waste management strategy development',
      category: 'Planning',
      basePrice: 2000.00
    }
  ];

  for (const service of services) {
    await prisma.service.create({
      data: service
    });
  }

  console.log('✅ Services created');

  // Create sample organizations
  const organizations = [
    {
      name: 'GreenTech Industries',
      type: 'CLIENT',
      industry: 'Technology',
      email: 'contact@greentech.com',
      phone: '+1-555-0123',
      city: 'San Francisco',
      country: 'USA'
    },
    {
      name: 'EcoManufacturing Corp',
      type: 'PROSPECT',
      industry: 'Manufacturing',
      email: 'info@ecomanufacturing.com',
      phone: '+1-555-0456',
      city: 'Chicago',
      country: 'USA'
    },
    {
      name: 'Sustainable Solutions Ltd',
      type: 'PARTNER',
      industry: 'Consulting',
      email: 'partnerships@sustainablesolutions.com',
      phone: '+1-555-0789',
      city: 'New York',
      country: 'USA'
    }
  ];

  for (const org of organizations) {
    await prisma.organization.create({
      data: org
    });
  }

  console.log('✅ Organizations created');

  // Create sample leads
  const org1 = await prisma.organization.findFirst({ where: { name: 'GreenTech Industries' } });
  const org2 = await prisma.organization.findFirst({ where: { name: 'EcoManufacturing Corp' } });

  if (org1) {
    await prisma.lead.create({
      data: {
        organizationId: org1.id,
        source: 'WEBSITE',
        status: 'QUALIFIED',
        title: 'Carbon Footprint Assessment Request',
        description: 'Looking for comprehensive carbon footprint assessment for our tech operations',
        estimatedValue: 25000,
        probability: 75
      }
    });
  }

  if (org2) {
    await prisma.lead.create({
      data: {
        organizationId: org2.id,
        source: 'REFERRAL',
        status: 'NEW',
        title: 'Manufacturing Sustainability Audit',
        description: 'Need sustainability audit for manufacturing processes',
        estimatedValue: 50000,
        probability: 50
      }
    });
  }

  console.log('✅ Sample leads created');

  console.log('🌟 Database seeded successfully!');
  console.log('');
  console.log('🔐 Admin credentials:');
  console.log('   Email: admin@greenex.com');
  console.log('   Password: admin123');
  console.log('');
  console.log('📝 Sample data created:');
  console.log('   - 5 user roles with permissions (including Client User)');
  console.log('   - 5 environmental services');
  console.log('   - 3 sample organizations');
  console.log('   - 2 sample leads');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });