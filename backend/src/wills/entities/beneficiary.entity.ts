import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Will } from './will.entity';
import { AssetShare } from './asset-share.entity';

@Entity('beneficiaries')
export class Beneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Will, (will) => will.beneficiaries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'will_id' })
  will: Will;

  @Column()
  will_id: string;

  @Column()
  full_name: string;

  @Column()
  relationship: string; // e.g., 'son', 'spouse', 'friend'

  // Role flags
  @Column({ default: false })
  is_executor: boolean;

  @Column({ default: false })
  is_guardian: boolean;

  @Column({ default: false })
  is_witness: boolean;

  // For pure beneficiaries, they may have a global share (optional, not used much)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  share_percentage: number;

  @Column({ default: 'beneficiary' })
  type: string; // 'beneficiary', 'executor', 'guardian', 'witness'

  @OneToMany(() => AssetShare, (share) => share.beneficiary)
  asset_shares: AssetShare[];
}