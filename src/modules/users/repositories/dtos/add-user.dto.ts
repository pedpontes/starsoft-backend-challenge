import { User } from '../../entities/user.entity';

export class AddUserDto {
  name: User['name'];
  email: User['email'];
}
