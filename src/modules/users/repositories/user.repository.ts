import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AddUserDto } from '../dtos/add-user.dto';
import { UserRepository } from './contracts/user.repository';
import {
  UsersPaginationOrderBy,
  UsersPaginationRequest,
  UsersPaginationResponse,
} from '../types/users.pagination';

@Injectable()
export class UserTypeOrmRepository extends UserRepository {
  #user: Repository<User>;

  constructor(private readonly dataSource: DataSource) {
    super();
    this.#user = this.dataSource.getRepository(User);
  }

  async add(addUser: AddUserDto) {
    try {
      const user = this.#user.create(addUser);

      return await this.#user.save(user);
    } catch (e) {
      console.error('(UserRepository.add) Error create User', e);
      throw new Error('(UserRepository.add) Error create User');
    }
  }

  async loadById(id: User['id']) {
    try {
      return await this.#user.findOne({
        where: {
          id: id,
        },
      });
    } catch (e) {
      console.error('(UserRepository.loadById) Error load User', e);
      throw new Error('(UserRepository.loadById) Error load User');
    }
  }

  async loadAll(request: UsersPaginationRequest) {
    const page = request.page;
    const limit = request.limit;
    const orderBy = request.orderBy ?? UsersPaginationOrderBy.CreatedAtDesc;

    const query = this.#user.createQueryBuilder('user');
    const filters = request.filters;
    if (filters?.name) {
      query.andWhere('user.name ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }
    if (filters?.email) {
      query.andWhere('user.email ILIKE :email', {
        email: `%${filters.email}%`,
      });
    }

    const orderValue = String(orderBy);
    const isDesc = orderValue.startsWith('-');
    const field = isDesc ? orderValue.slice(1) : orderValue;
    const column =
      field === 'name'
        ? 'user.name'
        : field === 'email'
          ? 'user.email'
          : 'user.createdAt';

    query
      .orderBy(column, isDesc ? 'DESC' : 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    try {
      const [data, total] = await query.getManyAndCount();
      return {
        data,
        page,
        limit,
        count: { total },
      };
    } catch (e) {
      console.error('(UserRepository.loadAll) Error load Users', e);
      throw new Error('(UserRepository.loadAll) Error load Users');
    }
  }

  async update(id: User['id'], updates: Partial<AddUserDto>) {
    try {
      const user = await this.#user.findOne({
        where: {
          id: id,
        },
      });
      if (!user) {
        return null;
      }

      const next = this.#user.merge(user, updates);
      return await this.#user.save(next);
    } catch (e) {
      console.error('(UserRepository.update) Error update User', e);
      throw new Error('(UserRepository.update) Error update User');
    }
  }

  async remove(id: User['id']) {
    try {
      const result = await this.#user.delete({ id });
      return (result.affected ?? 0) > 0;
    } catch (e) {
      console.error('(UserRepository.remove) Error remove User', e);
      throw new Error('(UserRepository.remove) Error remove User');
    }
  }
}
