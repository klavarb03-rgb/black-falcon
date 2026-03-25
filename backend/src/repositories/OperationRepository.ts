import { DataSource, Repository } from 'typeorm';
import { Operation, OperationType } from '../entities';

export class OperationRepository {
  private repo: Repository<Operation>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Operation);
  }

  findById(id: string): Promise<Operation | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['item', 'createdBy', 'fromUser', 'toUser'],
    });
  }

  findByItem(itemId: string): Promise<Operation[]> {
    return this.repo.find({
      where: { itemId },
      relations: ['createdBy', 'fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
    });
  }

  findByUser(userId: string): Promise<Operation[]> {
    return this.repo.find({
      where: [{ createdById: userId }, { fromUserId: userId }, { toUserId: userId }],
      relations: ['item', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  findByType(type: OperationType): Promise<Operation[]> {
    return this.repo.find({
      where: { type },
      relations: ['item', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  save(operation: Partial<Operation>): Promise<Operation> {
    return this.repo.save(this.repo.create(operation));
  }
}
