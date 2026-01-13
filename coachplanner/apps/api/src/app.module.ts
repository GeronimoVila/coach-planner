import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ClassesModule } from './classes/classes.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { StudentsModule } from './students/students.module';
import { CreditPackagesModule } from './credit-packages/credit-packages.module';

@Module({
  imports: [DatabaseModule, AuthModule, CategoriesModule, ClassesModule, OrganizationsModule, StudentsModule, CreditPackagesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}