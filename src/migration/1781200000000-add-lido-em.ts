import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLidoEm1781200000000 implements MigrationInterface {
    name = 'AddLidoEm1781200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Mensagem" ADD COLUMN "LidoEm" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Mensagem" DROP COLUMN "LidoEm"`);
    }
}
