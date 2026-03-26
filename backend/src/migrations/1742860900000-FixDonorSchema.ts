import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixDonorSchema1742860900000 implements MigrationInterface {
  name = 'FixDonorSchema1742860900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Додаємо description до donors
    const donorsTable = await queryRunner.getTable('donors');
    if (donorsTable) {
      const descriptionColumn = donorsTable.findColumnByName('description');
      if (!descriptionColumn) {
        await queryRunner.addColumn(
          'donors',
          new TableColumn({
            name: 'description',
            type: 'text',
            isNullable: true,
          })
        );
        console.log('✅ Added description column to donors table');
      }
    }

    // Змінюємо contact_info з jsonb на varchar (якщо потрібно)
    const contactInfoColumn = donorsTable?.findColumnByName('contact_info');
    if (contactInfoColumn && contactInfoColumn.type === 'jsonb') {
      // Копіюємо дані перед зміною типу
      await queryRunner.query(`
        ALTER TABLE donors 
        RENAME COLUMN contact_info TO contact_info_old;
      `);
      
      await queryRunner.addColumn(
        'donors',
        new TableColumn({
          name: 'contact_info',
          type: 'varchar',
          length: '255',
          isNullable: true,
        })
      );

      // Копіюємо дані назад (беремо перше поле з jsonb якщо є)
      await queryRunner.query(`
        UPDATE donors 
        SET contact_info = (contact_info_old->>'phone')::text
        WHERE contact_info_old IS NOT NULL;
      `);

      await queryRunner.dropColumn('donors', 'contact_info_old');
      console.log('✅ Converted contact_info from jsonb to varchar');
    }

    // Додаємо metadata якщо немає
    const metadataColumn = donorsTable?.findColumnByName('metadata');
    if (!metadataColumn) {
      await queryRunner.addColumn(
        'donors',
        new TableColumn({
          name: 'metadata',
          type: 'jsonb',
          isNullable: true,
        })
      );
      console.log('✅ Added metadata column to donors table');
    }

    // Додаємо version якщо немає (вже є в схемі, але перевіряємо)
    const versionColumn = donorsTable?.findColumnByName('version');
    if (!versionColumn) {
      await queryRunner.addColumn(
        'donors',
        new TableColumn({
          name: 'version',
          type: 'integer',
          default: 1,
          isNullable: false,
        })
      );
      console.log('✅ Added version column to donors table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Видаляємо додані колонки
    const donorsTable = await queryRunner.getTable('donors');
    if (donorsTable) {
      if (donorsTable.findColumnByName('description')) {
        await queryRunner.dropColumn('donors', 'description');
      }
      if (donorsTable.findColumnByName('metadata')) {
        await queryRunner.dropColumn('donors', 'metadata');
      }
    }
    
    // Повертаємо contact_info назад до jsonb (якщо було змінено)
    // Цей rollback не ідеальний, бо ми втратимо структуру jsonb
    console.log('⚠️ Rollback: contact_info type change is not fully reversible');
  }
}
