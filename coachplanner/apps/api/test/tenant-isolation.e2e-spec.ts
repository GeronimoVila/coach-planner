import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { StudentsService } from '../src/students/students.service';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { Role } from '@repo/database';

describe('Tenant Isolation System (Fuga de Datos)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let studentsService: StudentsService;

  let orgA_Id: string;
  let ownerA_Id: string;
  
  let orgB_Id: string;
  let studentB_Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get<DatabaseService>(DatabaseService);
    studentsService = app.get<StudentsService>(StudentsService);
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

    const ownerA = await db.user.create({ data: { email: 'ownerA@test.com', role: Role.OWNER, fullName: 'Dueño Gym A' } });
    ownerA_Id = ownerA.id;
    const orgA = await db.organization.create({ data: { name: 'Gym A (Atacante)', slug: 'gym-a', ownerId: ownerA.id } });
    orgA_Id = orgA.id;

    const studentA = await db.user.create({ data: { email: 'studentA@test.com', role: Role.STUDENT, fullName: 'Alumno A' } });
    await db.membership.create({ data: { userId: studentA.id, organizationId: orgA.id, role: Role.STUDENT } });

    const ownerB = await db.user.create({ data: { email: 'ownerB@test.com', role: Role.OWNER, fullName: 'Dueño Gym B' } });
    const orgB = await db.organization.create({ data: { name: 'Gym B (Victima)', slug: 'gym-b', ownerId: ownerB.id } });
    orgB_Id = orgB.id;

    const studentB = await db.user.create({ data: { email: 'studentB@test.com', role: Role.STUDENT, fullName: 'Alumno B (Top Secret)' } });
    studentB_Id = studentB.id;
    await db.membership.create({ data: { userId: studentB.id, organizationId: orgB.id, role: Role.STUDENT } });
  });

  afterAll(async () => {
    await app.close();
    await db.$disconnect();
  });

  it('1. GET /students: El Gimnasio A NO debe poder ver a los alumnos del Gimnasio B', async () => {
    console.log('🕵️‍♂️ Simulando petición GET /students desde el Gimnasio A...');

    const studentsOfOrgA = await studentsService.findAll(orgA_Id);

    const containsStudentB = studentsOfOrgA.some(s => s.id === studentB_Id);
    
    expect(containsStudentB).toBe(false);
    expect(studentsOfOrgA.length).toBe(1);
    console.log(`✅ Aislamiento exitoso: Gym A solo ve ${studentsOfOrgA.length} alumno(s).`);
  });

  it('2. PATCH /students/:id: El Gimnasio A NO debe poder modificar un alumno del Gimnasio B', async () => {
    console.log('🕵️‍♂️ El dueño del Gimnasio A intenta cambiar la categoría del Alumno B...');

    const maliciousUpdatePromise = studentsService.update(studentB_Id, orgA_Id, { categoryId: 999 });

    await expect(maliciousUpdatePromise).rejects.toThrow(NotFoundException);
    
    const checkStudentB = await db.membership.findUnique({
        where: { userId_organizationId: { userId: studentB_Id, organizationId: orgB_Id } }
    });
    
    expect(checkStudentB?.categoryId).not.toBe(999);
    console.log('✅ Bloqueo exitoso: Prisma rechazó la actualización cruzada.');
  });
});