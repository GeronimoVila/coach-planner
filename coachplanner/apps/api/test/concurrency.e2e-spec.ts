import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { BookingsService } from '../src/bookings/bookings.service';
import { INestApplication } from '@nestjs/common';

// Aumentamos el timeout a 30s para pruebas de estrés
jest.setTimeout(30000);

describe('Booking Concurrency System', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let bookingService: BookingsService;

  let orgId: string;
  let classId: string;
  let studentIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get<DatabaseService>(DatabaseService);
    bookingService = app.get<BookingsService>(BookingsService);

    // -----------------------------------------------------
    // 1. LIMPIEZA ROBUSTA (Orden estricto por Foreign Keys)
    // -----------------------------------------------------
    // Primero borramos las tablas que dependen de otras ("Hijos")
    await db.booking.deleteMany();       // Depende de User, Class, Package
    await db.creditPackage.deleteMany(); // Depende de Membership
    await db.membership.deleteMany();    // Depende de User y Org
    
    // Luego tablas intermedias
    await db.classSession.deleteMany();  // Depende de Org, Instructor, Category
    await db.category.deleteMany();      // Depende de Org
    
    // Finalmente los "Padres"
    await db.notification.deleteMany();  // (Opcional) Depende de User
    await db.organization.deleteMany();  // Depende de Owner (User)
    await db.user.deleteMany();          // Base de la pirámide
    // -----------------------------------------------------

    // 2. Setup: Crear Dueño y Organización
    const owner = await db.user.create({
      data: { email: 'owner@test.com', role: 'OWNER', fullName: 'Owner Gym' },
    });
    
    const org = await db.organization.create({
      data: {
        name: 'Iron Gym',
        slug: 'iron-gym-test',
        ownerId: owner.id,
      },
    });
    orgId = org.id;

    // 3. Setup: Crear Clase con CAPACIDAD = 1
    const instructor = await db.user.create({
      data: { email: 'coach@test.com', role: 'INSTRUCTOR', fullName: 'Coach' },
    });

    const category = await db.category.create({
        data: { name: 'CrossFit', organizationId: org.id }
    });

    const cls = await db.classSession.create({
      data: {
        title: 'Clase de la Muerte',
        organizationId: org.id,
        instructorId: instructor.id,
        categoryId: category.id,
        capacity: 1, // <--- TRAMPA: SOLO 1 LUGAR
        startTime: new Date(Date.now() + 1000000), 
        endTime: new Date(Date.now() + 2000000),
      },
    });
    classId = cls.id;

    // 4. Setup: Crear 5 Alumnos con créditos
    studentIds = []; // Reiniciamos el array por si acaso
    for (let i = 0; i < 5; i++) {
      const student = await db.user.create({
        data: { email: `student${i}@test.com`, role: 'STUDENT', fullName: `Student ${i}` },
      });
      studentIds.push(student.id);

      const membership = await db.membership.create({
        data: {
          userId: student.id,
          organizationId: org.id,
          credits: 10,
          categoryId: category.id
        }
      });

      // Crear paquete de créditos válido
      await db.creditPackage.create({
        data: {
            membershipId: membership.id,
            name: 'Pack Test',
            initialAmount: 5,
            remainingAmount: 5,
            expiresAt: new Date(Date.now() + 10000000)
        }
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('debería evitar el overbooking cuando 5 usuarios reservan al mismo tiempo', async () => {
    console.log('🚀 Iniciando ataque de concurrencia...');

    // DISPARAMOS LAS 5 PETICIONES SIMULTÁNEAMENTE
    const promises = studentIds.map((studentId) => {
        return bookingService.create(studentId, orgId, { classId })
            .then(() => ({ status: 'success', userId: studentId }))
            .catch((err) => ({ status: 'failed', error: err.message }));
    });

    const results = await Promise.all(promises);

    // ANÁLISIS DE RESULTADOS
    const successes = results.filter((r) => r.status === 'success');
    const failures = results.filter((r) => r.status === 'failed');

    console.log(`✅ Éxitos: ${successes.length}`);
    console.log(`❌ Fallos: ${failures.length}`);

    if (failures.length > 0) {
        console.log('💥 Primer error encontrado:', JSON.stringify(failures[0], null, 2));
    }

    // VERIFICACIÓN EN BASE DE DATOS
    const finalClass = await db.classSession.findUnique({
      where: { id: classId },
      include: { bookings: true },
    });

    if (!finalClass) {
        throw new Error('La clase desapareció de la DB 👻');
    }

    console.log(`📊 Reservas reales en BD: ${finalClass.bookings.length} / ${finalClass.capacity}`);

    // LA PRUEBA DE FUEGO
    expect(finalClass.bookings.length).toBeLessThanOrEqual(1);
    expect(successes.length).toBe(1);
  });
});