import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  capacity: number;

  @IsNotEmpty()
  @IsInt()
  categoryId: number;
}