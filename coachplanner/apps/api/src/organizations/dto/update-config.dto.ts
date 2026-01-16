import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsInt()
  @Min(15)
  slotDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(72)
  cancellationWindow?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  openHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  closeHour?: number;
}