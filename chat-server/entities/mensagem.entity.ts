import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('Mensagem')
export class Mensagem {
  @PrimaryGeneratedColumn("uuid", { name: 'Id' })
  id: string;

  @Column({ name: 'Mensagem', type: 'varchar' })
  mensagem: string;

  @Column({ name: 'IdRemetente', type: 'uuid' })
  idRemetente: string;

  @Column({ name: 'IdDestinatario', type: 'uuid' })
  idDestinatario: string;

  @Column({ name: 'IdVeiculo', type: 'uuid' })
  idVeiculo: string;

  @Column({ name: 'CriadoEm', type: 'timestamp' })
  criadoEm: Date;

  @ManyToOne(()=>Usuario)
  @JoinColumn({name:"IdRemetente"})
  remetente: Relation<Usuario>

}
