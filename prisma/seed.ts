import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const SAMPLE_PROPERTIES = [
  {
    title: "UHAS Trafalgar Vista Hostel",
    location: "Trafalgar, near UHAS Campus, Ho",
    price: 2200,
    type: "Student Hostel",
    status: "available",
    contact: "0245678901",
    description: "Modern student hostel located just 5 minutes walk from UHAS Trafalgar campus. Features 24/7 water supply, standby generator, fenced security, and study desks. Rooms are shared between 2 students.",
    imageUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
    gallery: [
      { url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80", caption: "Hostel Exterior", order: 1 },
      { url: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80", caption: "Bedroom Interior", order: 2 },
      { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80", caption: "Study Area", order: 3 }
    ]
  },
  {
    title: "HTU Royal Heights Villa",
    location: "HTU Campus Area, Ho",
    price: 1800,
    type: "Student Hostel",
    status: "available",
    contact: "0556789123",
    description: "Affordable and serene accommodation option for HTU students. Conveniently located near the main lecture theatres. Rooms are fully tiled and include a shared kitchen.",
    imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    gallery: [
      { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80", caption: "Apartment Building", order: 1 },
      { url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80", caption: "Bedroom View", order: 2 }
    ]
  },
  {
    title: "Kwaprow Chamber and Hall SC",
    location: "Kwaprow, near UCC, Cape Coast",
    price: 3200,
    type: "Chamber and Hall SC",
    status: "available",
    contact: "0209876543",
    description: "Premium Chamber and Hall Self-Contained room. Clean and spacious, equipped with personal prepaid meter, kitchen cabinet, security doors, and fully paved compound.",
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    gallery: [
      { url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80", caption: "Living Room Area", order: 1 },
      { url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80", caption: "Kitchenette", order: 2 }
    ]
  },
  {
    title: "Trafalgar Single Room SC",
    location: "Trafalgar, Ho",
    price: 1400,
    type: "Single Room SC",
    status: "available",
    contact: "0243456789",
    description: "Self-contained single room with private bathroom and porch. Ideal for single students who prefer privacy. Water runs regularly, located in a safe residential area.",
    imageUrl: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=800&q=80",
    gallery: [
      { url: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=800&q=80", caption: "Room Interior", order: 1 }
    ]
  },
  {
    title: "Campus Gate Hostel (HTU)",
    location: "Adogli Road, near HTU Gate, Ho",
    price: 2500,
    type: "Student Hostel",
    status: "rented",
    contact: "0201122334",
    description: "Highly sought-after hostel right at the gate of HTU campus. Fully occupied for this semester. Includes high-speed Wi-Fi, study lounge, and cleaning services.",
    imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
    gallery: [
      { url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", caption: "Exterior Entrance", order: 1 },
      { url: "https://images.unsplash.com/photo-1505692997895-35c59f1a457b?auto=format&fit=crop&w=800&q=80", caption: "Twin Bedroom Layout", order: 2 }
    ]
  }
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create or Find Ho Rentals Default Company
  let company = await prisma.company.findFirst({
    where: { isOwnCompany: true }
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Ho Rentals",
        contact: "info@horentals.com",
        isOwnCompany: true,
        momoAccount: "0241234567"
      }
    });
    console.log('✅ Default company created:', company.name);
  } else {
    console.log('ℹ️ Default company already exists:', company.name);
  }

  // 2. Create or Find Admin User
  let adminUser = await prisma.user.findUnique({
    where: { email: "admin@horentals.com" }
  });

  if (!adminUser) {
    const hashed = await bcrypt.hash('adminpass123', 10);
    adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@horentals.com",
        password: hashed,
        role: "admin",
        phone: "024admin123",
        companyId: company.id
      }
    });
    console.log('✅ Admin user created:', adminUser.email);
  } else {
    console.log('ℹ️ Admin user already exists:', adminUser.email);
  }

  // 3. Create or Find Landlord Partner User
  let landlordUser = await prisma.user.findUnique({
    where: { email: "kofi@landlord.com" }
  });

  if (!landlordUser) {
    const hashed = await bcrypt.hash('landlordpass123', 10);
    landlordUser = await prisma.user.create({
      data: {
        name: "Kofi Mensah",
        email: "kofi@landlord.com",
        password: hashed,
        role: "partner",
        phone: "0245678901",
        companyId: company.id
      }
    });
    console.log('✅ Landlord user created:', landlordUser.email);
  } else {
    console.log('ℹ️ Landlord user already exists:', landlordUser.email);
  }

  // 4. Seed Properties (Skip if properties already exist in DB)
  const propertiesCount = await prisma.property.count();
  if (propertiesCount === 0) {
    console.log(`🌱 Seeding ${SAMPLE_PROPERTIES.length} sample properties...`);
    for (const p of SAMPLE_PROPERTIES) {
      const createdProperty = await prisma.property.create({
        data: {
          title: p.title,
          location: p.location,
          price: p.price,
          type: p.type,
          status: p.status,
          contact: p.contact,
          description: p.description,
          imageUrl: p.imageUrl,
          ownerId: landlordUser.id,
          companyId: company.id,
          images: {
            create: p.gallery.map(img => ({
              url: img.url,
              caption: img.caption,
              order: img.order
            }))
          }
        }
      });
      console.log(`   - Created property: ${createdProperty.title}`);
    }
    console.log('✅ Property seeding completed!');
  } else {
    console.log(`ℹ️ Database already has ${propertiesCount} properties, skipping seeding new ones.`);
  }

  console.log('🌿 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
