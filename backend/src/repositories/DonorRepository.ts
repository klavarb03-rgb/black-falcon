import { DataSource, Repository } from 'typeorm';
import { Donor } from '../entities';

export class DonorRepository {
  private repo: Repository<Donor>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Donor);
  }

  findById(id: string): Promise<Donor | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  findAll(): Promise<Donor[]> {
    return this.repo.find({
      where: { isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  save(donor: Partial<Donor>): Promise<Donor> {
    return this.repo.save(this.repo.create(donor));
  }

  async update(id: string, data: Partial<Donor>): Promise<Donor | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo.update(id, data as any);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { isDeleted: true });
  }
}
