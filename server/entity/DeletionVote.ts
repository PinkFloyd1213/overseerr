import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { User } from './User';
import { DeletionRequest } from './DeletionRequest';

@Entity()
@Unique(['user', 'request'])
export class DeletionVote {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ type: 'boolean' })
    public approve: boolean;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    public user: User;

    @ManyToOne(() => DeletionRequest, (request) => request.votes, {
        onDelete: 'CASCADE',
    })
    public request: DeletionRequest;

    @CreateDateColumn()
    public createdAt: Date;
}