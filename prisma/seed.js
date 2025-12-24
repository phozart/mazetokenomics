const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user (single user mode)
  // Password should be changed immediately after first login in production
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!';
  const adminPassword = await bcrypt.hash(defaultPassword, 12);
  console.log('Admin password set from:', process.env.ADMIN_DEFAULT_PASSWORD ? 'ADMIN_DEFAULT_PASSWORD env var' : 'default (ChangeMe123!)');

  // Delete old user if exists with different email
  await prisma.user.deleteMany({
    where: {
      email: { in: ['maze@maze.com', 'admin@byrrgis.com', 'maze'] }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin' },
    update: {
      password: adminPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'admin',
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Created admin user:', admin.email);

  // Add WOLF token to watchlist by default for testing
  const wolfToken = {
    contractAddress: 'BTr5SwWSKPBrdUzboi2SVr1QvSjmh1caCYUkxsxLpump',
    chain: 'SOLANA',
    symbol: 'WOLF',
    name: 'WOLF',
  };

  // Check if WOLF already exists in watchlist
  const existingWolf = await prisma.watchlistItem.findFirst({
    where: {
      userId: admin.id,
      contractAddress: wolfToken.contractAddress,
    },
  });

  if (!existingWolf) {
    // Create Token record first
    let token = await prisma.token.findFirst({
      where: {
        contractAddress: wolfToken.contractAddress,
        chain: wolfToken.chain,
      },
    });

    if (!token) {
      token = await prisma.token.create({
        data: {
          contractAddress: wolfToken.contractAddress,
          chain: wolfToken.chain,
          symbol: wolfToken.symbol,
          name: wolfToken.name,
          decimals: 9,
        },
      });
      console.log('Created WOLF token');
    }

    // Add to watchlist
    await prisma.watchlistItem.create({
      data: {
        userId: admin.id,
        tokenId: token.id,
        contractAddress: wolfToken.contractAddress,
        chain: wolfToken.chain,
        symbol: wolfToken.symbol,
        name: wolfToken.name,
        sortOrder: 0,
      },
    });
    console.log('Added WOLF to watchlist');

    // Create vetting process for WOLF
    await prisma.vettingProcess.create({
      data: {
        tokenId: token.id,
        status: 'PENDING',
        priority: 'NORMAL',
      },
    });
    console.log('Created vetting process for WOLF');
  }

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
