const { Api } = require('../server/lib/api');
const { db } = require('../server/lib/db');
const { hashPassword } = require('../server/lib/auth');

async function seed() {
  console.log('Seeding database...');
  try {
    // Create a school
    const school = await db.school.create({
      data: {
        name: 'Demo School',
        code: 'DEMO',
      },
    });
    console.log(`Created school: ${school.name}`);

    // Create a student
    const student = await db.student.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        nrc: '123456/78/9',
        phone: '0977123456',
        cardId: 'DEMO-123456',
        cardQrData: '...', // Generate a QR code data
        schoolId: school.id,
      },
    });
    console.log(`Created student: ${student.firstName} ${student.lastName}`);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await db.$disconnect();
  }
}

seed();