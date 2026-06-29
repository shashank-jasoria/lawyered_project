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

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Will, (will) => will.assets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'will_id' })
  will: Will;

  @Column()
  will_id: string;

  @Column()
  description: string; // e.g., 'House in Pune', 'Savings Account #12345'

  @Column()
  type: string; // 'real_estate', 'bank_account', 'vehicle', 'jewellery', 'other'

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  total_value: number;

  @OneToMany(() => AssetShare, (share) => share.asset)
  asset_shares: AssetShare[];
}