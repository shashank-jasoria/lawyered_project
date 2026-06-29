import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Asset } from './asset.entity';
import { Beneficiary } from './beneficiary.entity';

@Entity('asset_shares')
export class AssetShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, (asset) => asset.asset_shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column()
  asset_id: string;

  @ManyToOne(() => Beneficiary, (beneficiary) => beneficiary.asset_shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: Beneficiary;

  @Column()
  beneficiary_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  share_percentage: number; // percentage of *this* asset

  @Column({ nullable: true })
  specific_item: string; // e.g., 'gold necklace' if asset is jewellery collection
}