import { IsInt, IsNotEmpty } from 'class-validator';

export class UpdateCategoryDto {
  @IsInt()
  @IsNotEmpty()
  categoryId: number;
}