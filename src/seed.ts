import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Get super admin credentials from environment
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@sust.edu';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';

  // Check if super admin already exists
  const existingSuperAdmin = await prisma.admin.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingSuperAdmin) {
    console.log('✅ Super admin already exists:', superAdminEmail);
    return;
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  // Create super admin
  const superAdmin = await prisma.admin.create({
    data: {
      email: superAdminEmail,
      passwordHash,
      isSuperAdmin: true,
      status: 'ACTIVE',
      scopes: {
        create: [
          { scope: 'IUPC' },
          { scope: 'HACKATHON' },
          { scope: 'DL_ENIGMA_2_0' },
        ],
      },
    },
    include: {
      scopes: true,
    },
  });

  console.log('✅ Super admin created successfully!');
  console.log('📧 Email:', superAdmin.email);
  console.log('🔑 Password:', superAdminPassword);
  console.log('🎯 Scopes:', superAdmin.scopes.map(s => s.scope).join(', '));
  console.log('\n⚠️  IMPORTANT: Please change the default password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
