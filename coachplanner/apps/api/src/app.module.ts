import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ClassesModule } from './classes/classes.module';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
  imports: [DatabaseModule, AuthModule, CategoriesModule, ClassesModule, OrganizationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}