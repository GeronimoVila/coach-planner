import { IsISO8601, IsNotEmpty } from 'class-validator';

export class CloneWeekDto {
  @IsNotEmpty()
  @IsISO8601()
  sourceWeekStart: string;

  @IsNotEmpty()
  @IsISO8601()
  targetWeekStart: string;
}