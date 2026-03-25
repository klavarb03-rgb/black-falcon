import { DataSource, Repository } from 'typeorm';
import { Item, ItemStatus } from '../entities';

export class ItemRepository {
  private repo: Repository<Item>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Item);
  }

  findById(id: string): Promise<Item | null> {
    return this.repo.findOne({
      where: { id, isDeleted: false },
      relations: ['owner', 'group', 'donor'],
    });
  }

  findByOwner(ownerId: string): Promise<Item[]> {
    return this.repo.find({
      where: { ownerId, isDeleted: false },
      relations: ['group', 'donor'],
      order: { createdAt: 'DESC' },
    });
  }

  findByGroup(groupId: string): Promise<Item[]> {
    return this.repo.find({
      where: { groupId, isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  findByStatus(status: ItemStatus, ownerId?: string): Promise<Item[]> {
    return this.repo.find({
      where: ownerId ? { status, ownerId, isDeleted: false } : { status, isDeleted: false },
      relations: ['owner', 'group'],
    });
  }

  save(item: Partial<Item>): Promise<Item> {
    return this.repo.save(this.repo.create(item));
  }

  async update(id: string, data: Partial<Item>): Promise<Item | null> {
    await this.repo.increment({ id }, 'version', 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo.update(id, data as any);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { isDeleted: true });
  }
}
