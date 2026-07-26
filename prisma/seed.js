const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany();

  const products = [
    {
      name: 'Dark Den 70%',
      description: 'Our signature dark chocolate crafted from single-origin cocoa beans. Rich, bold, and refined — born in the den.',
      price: 599,
      image: '/images/products/dark-den-70.jpg',
      inStock: true,
    },
    {
      name: 'Mountain Milk',
      description: 'Smooth alpine milk chocolate with notes of caramel and cream. The warmth of the den in every bite.',
      price: 499,
      image: '/images/products/mountain-milk.jpg',
      inStock: true,
    },
    {
      name: "Lion's Gold — Hazelnut",
      description: 'Crunchy roasted hazelnuts enrobed in silky dark chocolate. Strength and elegance, perfectly balanced.',
      price: 799,
      image: '/images/products/lions-gold-hazelnut.jpg',
      inStock: true,
    },
    {
      name: 'Den Collection — Assorted',
      description: 'A curated box of 24 hand-crafted chocolates — Hazelnut, Almond, Pistachio, Cashew, and Walnut.',
      price: 1299,
      image: '/images/products/den-collection.jpg',
      inStock: true,
    },
    {
      name: 'Almond Ridge',
      description: 'Roasted almonds in smooth dark chocolate. Rugged terrain, refined taste.',
      price: 749,
      image: '/images/products/almond-ridge.jpg',
      inStock: true,
    },
    {
      name: 'Pistachio Peak',
      description: 'Pistachio with a hint of sweetness, wrapped in finest milk chocolate.',
      price: 849,
      image: '/images/products/pistachio-peak.jpg',
      inStock: false,
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  console.log('✅ Bruden products seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
