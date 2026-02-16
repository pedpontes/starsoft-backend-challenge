import { User } from '../../entities/user.entity';

export class UpdateUserDto {
  name?: User['name'];
  email?: User['email'];
}
