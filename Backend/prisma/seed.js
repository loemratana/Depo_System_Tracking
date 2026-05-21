import { prisma } from '../src/config/db.js';

async function main() {
  console.log('Start seeding...');

  // 1. Create Provinces
  const provinces = [
    { name: 'Phnom Penh', code: 'PP' },
    { name: 'Siem Reap', code: 'SR' },
    { name: 'Battambang', code: 'BTB' },
    { name: 'Kandal', code: 'KD' },
  ];

  for (const p of provinces) {
    const province = await prisma.province.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    console.log(`Created/Updated province: ${province.name}`);

    // 2. Create some Districts for each province
    const districts = [
      { name: `${province.name} District 1`, code: `${p.code}01`, provinceId: province.id },
      { name: `${province.name} District 2`, code: `${p.code}02`, provinceId: province.id },
    ];

    for (const d of districts) {
      // Check if district code already exists to avoid duplicate seed errors
      const existingDistrict = await prisma.district.findFirst({
        where: { code: d.code }
      });

      if (!existingDistrict) {
        await prisma.district.create({
          data: d
        });
        console.log(`  Created district: ${d.name}`);
      } else {
        console.log(`  District already exists: ${d.name}`);
      }
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
