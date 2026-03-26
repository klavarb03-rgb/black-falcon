import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBalanceStatusToItems1742860800000 implements MigrationInterface {
  name = 'AddBalanceStatusToItems1742860800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add balance_status column with default 'off_balance'
    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "balance_status" VARCHAR(20) NOT NULL DEFAULT 'off_balance'
    `);

    // Add document_number column (nullable)
    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "document_number" VARCHAR(50) NULL
    `);

    // Add document_date column (nullable)
    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "document_date" DATE NULL
    `);

    // Add supplier_name column (nullable)
    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "supplier_name" VARCHAR(255) NULL
    `);

    // Add 'transfer_to_balance' to the operations type enum
    await queryRunner.query(`
      ALTER TYPE "operation_type" ADD VALUE IF NOT EXISTS 'transfer_to_balance'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the balance-related columns
    await queryRunner.query(`ALTER TABLE "items" DROP COLUMN IF EXISTS "supplier_name"`);
    await queryRunner.query(`ALTER TABLE "items" DROP COLUMN IF EXISTS "document_date"`);
    await queryRunner.query(`ALTER TABLE "items" DROP COLUMN IF EXISTS "document_number"`);
    await queryRunner.query(`ALTER TABLE "items" DROP COLUMN IF EXISTS "balance_status"`);

    // NOTE: PostgreSQL does not support removing enum values directly.
    // To revert the 'transfer_to_balance' enum value you must recreate the enum type.
    // This is intentionally left as a no-op to avoid destructive data loss on rollback.
  }
}
