const { Api } = require('../server/lib/api');
const { db } = require('../server/lib/db');
const { hashPassword } = require('../server/lib/auth');

async function seed() {
  console.log('Seeding database...');
  try {
    // Create a hospital
    const hospital = await db.hospital.create({
      data: {
        name: 'Demo Hospital',
        code: 'DEMO',
      },
    });
    console.log(`Created hospital: ${hospital.name}`);

    // Create a patient
    const patient = await db.patient.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        nrc: '123456/78/9',
        phone: '0977123456',
        cardId: 'DEMO-123456',
        cardQrData: '...', // Generate a QR code data
        hospitalId: hospital.id,
      },
    });
    console.log(`Created patient: ${patient.firstName} ${patient.lastName}`);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await db.$disconnect();
  }
}

seed();