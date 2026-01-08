import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeletionVote } from './DeletionVote';
import Media from './Media';
import { User } from './User';

export enum DeletionRequestStatus {
  PENDING = 0,
  APPROVED = 1,
  DECLINED = 2,
}

@Entity()
export class DeletionRequest {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'int', default: DeletionRequestStatus.PENDING })
  public status: DeletionRequestStatus;

  @Column({ nullable: true })
  public seasonNumber?: number;

  @ManyToOne(() => Media, (media) => media.deletionRequests, {
    eager: true,
    onDelete: 'CASCADE',
  })
  public media: Media;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  public requestedBy: User;

  @OneToMany(() => DeletionVote, (vote) => vote.request, {
    eager: true,
    cascade: true,
  })
  public votes: DeletionVote[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;
}
