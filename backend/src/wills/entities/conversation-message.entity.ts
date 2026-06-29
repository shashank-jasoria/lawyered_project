import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Will } from './will.entity';

@Entity('conversation_messages')
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Will, (will) => will.conversation_messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'will_id' })
  will: Will;

  @Column()
  will_id: string;

  @Column()
  role: string; // 'user', 'assistant', 'system'

  @Column('text')
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  structured_data_snapshot: any; // optional snapshot of the extracted facts

  @CreateDateColumn()
  created_at: Date;
}
