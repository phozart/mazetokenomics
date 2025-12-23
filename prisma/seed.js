const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user (single user mode)
  const adminPassword = await bcrypt.hash('maze', 12);

  // Delete old user if exists with different email
  await prisma.user.deleteMany({
    where: {
      email: { in: ['maze@maze.com', 'admin@byrrgis.com'] }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'maze' },
    update: {
      password: adminPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'maze',
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Created admin user:', admin.email);

  // Create some sample tokens for demo
  const sampleTokens = [
    {
      contractAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933', // PEPE
      chain: 'ETHEREUM',
      name: 'Pepe',
      symbol: 'PEPE',
    },
    {
      contractAddress: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', // SHIB
      chain: 'ETHEREUM',
      name: 'Shiba Inu',
      symbol: 'SHIB',
    },
    {
      contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
      chain: 'ETHEREUM',
      name: 'Chainlink',
      symbol: 'LINK',
    },
  ];

  for (const tokenData of sampleTokens) {
    const existingToken = await prisma.token.findUnique({
      where: {
        contractAddress_chain: {
          contractAddress: tokenData.contractAddress.toLowerCase(),
          chain: tokenData.chain,
        },
      },
    });

    if (!existingToken) {
      const token = await prisma.token.create({
        data: {
          ...tokenData,
          contractAddress: tokenData.contractAddress.toLowerCase(),
        },
      });

      await prisma.vettingProcess.create({
        data: {
          tokenId: token.id,
          status: 'PENDING',
          priority: 'NORMAL',
        },
      });

      console.log('Created sample token:', tokenData.symbol);
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
