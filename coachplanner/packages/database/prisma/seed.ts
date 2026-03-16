import { PrismaClient, Role, PlanType, MembershipStatus, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando el seeding de UAT...');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('12345678', salt);

  // 1. Crear Límites del Plan FREE
  await prisma.planLimits.upsert({
    where: { plan: PlanType.FREE },
    update: {},
    create: {
      plan: PlanType.FREE,
      maxStudents: 50,
      maxCategories: 5,
      maxClasses: 20,
    },
  });

  // 2. Crear al Dueño (Owner)
  const owner = await prisma.user.upsert({
    where: { email: 'admin@uat.com' },
    update: {
      emailVerified: new Date(),
    },
    create: {
      email: 'admin@uat.com',
      fullName: 'Admin Dueño UAT',
      passwordHash,
      role: Role.OWNER,
      provider: 'EMAIL',
      emailVerified: new Date(),
    },
  });

  // 3. Crear la Organización (Gimnasio)
  const organization = await prisma.organization.upsert({
    where: { slug: 'gym-uat' },
    update: {},
    create: {
      name: 'Gimnasio UAT Testing',
      slug: 'gym-uat',
      ownerId: owner.id,
      plan: PlanType.FREE,
      slotDurationMinutes: 60,
      cancellationWindow: 2, // Horas antes para cancelar
      bookingWindowMinutes: 15, //
      isActive: true,
    },
  });

  const adminAuditor = await prisma.user.upsert({
    where: { email: 'auditor@uat.com' },
    update: {
        emailVerified: new Date(),
    },
    create: {
      email: 'auditor@uat.com',
      fullName: 'Geronimo (Auditor UAT)',
      passwordHash,
      role: Role.ADMIN, // Rol global en el sistema
      provider: 'EMAIL',
      emailVerified: new Date(),
      memberships: {
        create: {
          organizationId: organization.id,
          role: Role.ADMIN, // Rol con permisos altos dentro del gimnasio específico
          status: MembershipStatus.ACTIVE,
        }
      }
    },
  });

  // 4. Crear Categorías
  const categoryYoga = await prisma.category.create({
    data: { name: 'Yoga', organizationId: organization.id },
  });
  const categoryCrossfit = await prisma.category.create({
    data: { name: 'Crossfit', organizationId: organization.id },
  });

  // 5. Crear Profesor e integrarlo a la organización
  const instructor = await prisma.user.upsert({
    where: { email: 'profe@uat.com' },
    update: {
        emailVerified: new Date(),
    },
    create: {
      email: 'profe@uat.com',
      fullName: 'Profe Juan',
      passwordHash,
      role: Role.INSTRUCTOR,
      emailVerified: new Date(),
      memberships: {
        create: {
          organizationId: organization.id,
          role: Role.INSTRUCTOR,
          status: MembershipStatus.ACTIVE,
        }
      }
    },
  });

  // 6. Crear Alumnos con Membresías y Créditos
  
  // Alumno 1: Con saldo positivo (10 clases)
  const studentConSaldo = await prisma.user.upsert({
    where: { email: 'alumno1@uat.com' },
    update: {
        emailVerified: new Date(),
    },
    create: {
      email: 'alumno1@uat.com',
      fullName: 'María (Con Saldo)',
      passwordHash,
      role: Role.STUDENT,
      emailVerified: new Date(),
      memberships: {
        create: {
          organizationId: organization.id,
          role: Role.STUDENT,
          status: MembershipStatus.ACTIVE,
          credits: 10,
          categoryId: categoryYoga.id, //
          creditPackages: {
            create: {
              name: 'Pack Inicial 10 Clases',
              initialAmount: 10,
              remainingAmount: 10,
              expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Expira en 1 mes
            }
          }
        }
      }
    },
  });

  // Alumno 2: Sin saldo (0 créditos) para probar rechazos
  const studentSinSaldo = await prisma.user.upsert({
    where: { email: 'alumno2@uat.com' },
    update: {
        emailVerified: new Date(),
    },
    create: {
      email: 'alumno2@uat.com',
      fullName: 'Pedro (Sin Saldo)',
      passwordHash,
      role: Role.STUDENT,
      emailVerified: new Date(),
      memberships: {
        create: {
          organizationId: organization.id,
          role: Role.STUDENT,
          status: MembershipStatus.ACTIVE,
          credits: 0,
        }
      }
    },
  });

  // 7. Crear una Clase para el día de mañana
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0); // 18:00 hrs
  
  const endTomorrow = new Date(tomorrow);
  endTomorrow.setHours(19, 0, 0, 0); // 19:00 hrs

  await prisma.classSession.create({
    data: {
      organizationId: organization.id,
      title: 'Clase de Prueba UAT',
      description: 'Clase generada automáticamente para pruebas',
      startTime: tomorrow,
      endTime: endTomorrow, //
      capacity: 10,
      instructorId: instructor.id, //
      categories: {
        create: {
          categoryId: categoryYoga.id,
        }
      }
    }
  });

console.log('✅ UAT Seeding completado con éxito!');
  console.log('--------------------------------------------------');
  console.log('🔑 Credenciales de prueba:');
  console.log('Contraseña para todos: UATpassword123!');
  console.log('Dueño (Cliente): admin@uat.com');
  console.log('Auditor (Tú): auditor@uat.com');
  console.log('Profesor: profe@uat.com');
  console.log('Alumno c/créditos: alumno1@uat.com');
  console.log('Alumno s/créditos: alumno2@uat.com');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });