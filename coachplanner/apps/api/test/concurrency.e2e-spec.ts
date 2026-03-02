import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { BookingsService } from '../src/bookings/bookings.service';
import { INestApplication } from '@nestjs/common';

jest.setTimeout(30000);

describe('Booking Concurrency System (Pruebas de Estrés)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let bookingService: BookingsService;

  let orgId: string;
  let categoryId: number;
  let instructorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get<DatabaseService>(DatabaseService);
    bookingService = app.get<BookingsService>(BookingsService);
  });


  beforeEach(async () => {
    await db.booking.deleteMany();
    await db.creditPackage.deleteMany();
    await db.membership.deleteMany();
    await db.classSession.deleteMany();
    await db.category.deleteMany();
    await db.notification.deleteMany();
    await db.organization.deleteMany();
    await db.user.deleteMany();

    const owner = await db.user.create({
      data: { email: 'owner@test.com', role: 'OWNER', fullName: 'Owner Gym' },
    });
    
    const org = await db.organization.create({
      data: { name: 'Iron Gym', slug: 'iron-gym-test', ownerId: owner.id },
    });
    orgId = org.id;

    const instructor = await db.user.create({
      data: { email: 'coach@test.com', role: 'INSTRUCTOR', fullName: 'Coach' },
    });
    instructorId = instructor.id;

    const category = await db.category.create({
        data: { name: 'CrossFit', organizationId: org.id }
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await app.close();
    await db.$disconnect();
  });

  it('1. OVERBOOKING: Debería evitar que 5 usuarios roben el único cupo de 1 clase', async () => {
    console.log('🚀 Iniciando ataque de Sobrecupo...');

    const cls = await db.classSession.create({
      data: {
        title: 'Clase de la Muerte',
        organizationId: orgId, instructorId, categoryId,
        capacity: 1,
        startTime: new Date(Date.now() + 1000000), 
        endTime: new Date(Date.now() + 2000000),
      },
    });

    const studentIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const student = await db.user.create({ data: { email: `student_ob_${i}@test.com`, role: 'STUDENT', fullName: `St ${i}` } });
      studentIds.push(student.id);
      const membership = await db.membership.create({ data: { userId: student.id, organizationId: orgId, credits: 10, categoryId } });
      await db.creditPackage.create({ data: { membershipId: membership.id, name: 'Pack', initialAmount: 10, remainingAmount: 10, expiresAt: new Date(Date.now() + 10000000) } });
    }

    const promises = studentIds.map((studentId) => 
        bookingService.create(studentId, orgId, { classId: cls.id })
            .then(() => ({ status: 'success' }))
            .catch((err) => ({ status: 'failed', error: err.message }))
    );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.status === 'success');

    const finalClass = await db.classSession.findUnique({ where: { id: cls.id }, include: { bookings: true } });

    console.log(`📊 Reservas reales: ${finalClass!.bookings.length} / ${finalClass!.capacity}`);
    
    expect(successes.length).toBe(1);
    expect(finalClass!.bookings.length).toBe(1);
  });

  it('2. DOBLE GASTO: 1 usuario con 1 solo crédito intenta reservar 5 clases simultáneas', async () => {
    console.log('🚀 Iniciando ataque de Doble Gasto...');

    const hackerStudent = await db.user.create({ data: { email: 'hacker@test.com', role: 'STUDENT', fullName: 'Hacker' } });
    const membership = await db.membership.create({ data: { userId: hackerStudent.id, organizationId: orgId, credits: 1, categoryId } });
    await db.creditPackage.create({ 
        data: { membershipId: membership.id, name: 'Pack Pobre', initialAmount: 1, remainingAmount: 1, expiresAt: new Date(Date.now() + 10000000) } 
    });

    const classIds: string[] = [];
    for (let i = 0; i < 5; i++) {
        const cls = await db.classSession.create({
            data: {
              title: `Clase Normal ${i}`,
              organizationId: orgId, instructorId, categoryId,
              capacity: 10,
              startTime: new Date(Date.now() + 1000000 + (i * 10000)),
              endTime: new Date(Date.now() + 2000000 + (i * 10000)),
            },
        });
        classIds.push(cls.id);
    }

    const promises = classIds.map((classId) => 
        bookingService.create(hackerStudent.id, orgId, { classId })
            .then(() => ({ status: 'success' }))
            .catch((err) => ({ status: 'failed', error: err.message }))
    );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.status === 'success');

    const finalMembership = await db.membership.findUnique({ where: { id: membership.id } });

    console.log(`💰 Saldo final del hacker: ${finalMembership!.credits} créditos`);
    
    expect(successes.length).toBe(1);
    expect(finalMembership!.credits).toBe(0);
  });
});