import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity'; // adjust path
import { Beneficiary } from './beneficiary.entity';
import { Asset } from './asset.entity';
import { ConversationMessage } from './conversation-message.entity';

@Entity('wills')
export class Will {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.wills, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ default: 'draft' })
  status: string; // 'draft', 'completed', 'locked'

  // Personal details (all nullable because half-finished)
  @Column({ nullable: true })
  person_name: string;

  @Column({ nullable: true })
  person_age: number;

  @Column({ nullable: true, type: 'text' })
  person_address: string;

  @Column({ nullable: true })
  sound_mind: boolean;

  @Column({ nullable: true })
  revocation_line: string; // default provided in UI

  // Executor and guardian – FK to beneficiaries table (optional)
  @ManyToOne(() => Beneficiary, { nullable: true, eager: false })
  @JoinColumn({ name: 'executor_id' })
  executor: Beneficiary;

  @Column({ nullable: true })
  executor_id: string;

  @ManyToOne(() => Beneficiary, { nullable: true, eager: false })
  @JoinColumn({ name: 'guardian_id' })
  guardian: Beneficiary;

  @Column({ nullable: true })
  guardian_id: string;

  // Signature fields
  @Column({ nullable: true, type: 'date' })
  signature_date: string;

  @Column({ nullable: true })
  signature_place: string;

  @Column({ nullable: true })
  has_minor_children: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => Beneficiary, (beneficiary) => beneficiary.will)
  beneficiaries: Beneficiary[];

  @OneToMany(() => Asset, (asset) => asset.will)
  assets: Asset[];

  @OneToMany(() => ConversationMessage, (message) => message.will)
  conversation_messages: ConversationMessage[];
}