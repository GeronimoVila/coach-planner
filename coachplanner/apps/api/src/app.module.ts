import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <--- 1. IMPORTAR ESTO
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ClassesModule } from './classes/classes.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { StudentsModule } from './students/students.module';
import { CreditPackagesModule } from './credit-packages/credit-packages.module';
import { BookingsModule } from './bookings/bookings.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    ScheduleModule.forRoot(), 
    DatabaseModule, 
    AuthModule, 
    CategoriesModule, 
    ClassesModule, 
    OrganizationsModule, 
    StudentsModule, 
    CreditPackagesModule, 
    BookingsModule, 
    UsersModule, 
    JobsModule, 
    DashboardModule, 
    NotificationsModule, 
    AdminModule,
    EmailModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}