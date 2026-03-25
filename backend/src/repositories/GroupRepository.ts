import { DataSource, IsNull, Repository } from 'typeorm';
import { Group } from '../entities';

export class GroupRepository {
  private repo: Repository<Group>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Group);
  }

  findById(id: string): Promise<Group | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['parent', 'children', 'owner'],
    });
  }

  findRootsByOwner(ownerId: string): Promise<Group[]> {
    return this.repo.find({
      where: { ownerId, parentId: IsNull() },
      relations: ['children'],
      order: { name: 'ASC' },
    });
  }

  findByOwner(ownerId: string): Promise<Group[]> {
    return this.repo.find({
      where: { ownerId },
      order: { level: 'ASC', name: 'ASC' },
    });
  }

  findChildren(parentId: string): Promise<Group[]> {
    return this.repo.find({
      where: { parentId },
      order: { name: 'ASC' },
    });
  }

  save(group: Partial<Group>): Promise<Group> {
    return this.repo.save(this.repo.create(group));
  }

  async update(id: string, data: Partial<Group>): Promise<Group | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo.update(id, data as any);
    return this.findById(id);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id).then(() => undefined);
  }
}
