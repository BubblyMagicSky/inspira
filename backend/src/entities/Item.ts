import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum MediaType {
  FILM = 'film',
  MUSIC = 'music',
  BOOK = 'book',
  ART = 'art',
  GAME = 'game',
}

export enum Provider {
  SPOTIFY = 'spotify',
  TMDB = 'tmdb',
}

@Entity()
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.items)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: MediaType,
  })
  type: MediaType;

  @Column({
    type: 'enum',
    enum: Provider,
  })
  provider: Provider;

  @Column()
  externalId: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
