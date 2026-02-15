import { IsEmail, IsString } from 'class-validator';

export class AddUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}
