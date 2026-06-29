import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn , OneToMany } from 'typeorm';
import { Will } from '../wills/entities/will.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password_hash: string;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => Will, (will) => will.user)
    wills: Will[];
}