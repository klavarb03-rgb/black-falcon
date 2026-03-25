import { DataSource, Repository } from 'typeorm';
import { Kit, KitTemplate } from '../entities';

export class KitRepository {
  private kitRepo: Repository<Kit>;
  private templateRepo: Repository<KitTemplate>;

  constructor(dataSource: DataSource) {
    this.kitRepo = dataSource.getRepository(Kit);
    this.templateRepo = dataSource.getRepository(KitTemplate);
  }

  findKitById(id: string): Promise<Kit | null> {
    return this.kitRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['template', 'owner'],
    });
  }

  findKitsByOwner(ownerId: string): Promise<Kit[]> {
    return this.kitRepo.find({
      where: { ownerId, isDeleted: false },
      relations: ['template'],
      order: { createdAt: 'DESC' },
    });
  }

  saveKit(kit: Partial<Kit>): Promise<Kit> {
    return this.kitRepo.save(this.kitRepo.create(kit));
  }

  async updateKit(id: string, data: Partial<Kit>): Promise<Kit | null> {
    await this.kitRepo.increment({ id }, 'version', 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.kitRepo.update(id, data as any);
    return this.findKitById(id);
  }

  async softDeleteKit(id: string): Promise<void> {
    await this.kitRepo.update(id, { isDeleted: true });
  }

  findTemplateById(id: string): Promise<KitTemplate | null> {
    return this.templateRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['kits'],
    });
  }

  findAllTemplates(): Promise<KitTemplate[]> {
    return this.templateRepo.find({
      where: { isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  saveTemplate(template: Partial<KitTemplate>): Promise<KitTemplate> {
    return this.templateRepo.save(this.templateRepo.create(template));
  }

  async softDeleteTemplate(id: string): Promise<void> {
    await this.templateRepo.update(id, { isDeleted: true });
  }
}
