import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from '../entities';

export class UserRepository {
  private repo: Repository<User>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(User);
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  findAll(includeInactive = false): Promise<User[]> {
    return this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  findByRole(role: UserRole): Promise<User[]> {
    return this.repo.find({ where: { role, isActive: true } });
  }

  save(user: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(user));
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo.update(id, data as any);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { isActive: false });
  }
}
