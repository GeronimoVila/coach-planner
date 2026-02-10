import { IsString, MinLength } from 'class-validator';

export class CreateOnboardingOrgDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(3)
  fullName: string;
}