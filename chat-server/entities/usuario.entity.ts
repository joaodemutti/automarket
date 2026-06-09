import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Usuario')
export class Usuario {
  @PrimaryGeneratedColumn("uuid", { name: 'Id' })
  id: string;

  @Column({ name: 'Login', type: 'varchar' })
  login: string;

  @Column({ name: 'Senha', type: 'varchar' })
  senha: string;

  @Column({ name: 'Nome', type: 'varchar' })
  nome: string;

  @Column({ name: 'CriadoEm', type: 'timestamp' })
  criadoEm: Date;

  @Column({ name: 'DeletadoEm', type: 'timestamp', nullable: true })
  deletadoEm?: Date;
}
