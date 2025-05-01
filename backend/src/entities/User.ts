import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AuthToken } from './AuthToken';
import { Item } from './Item';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  username!: string;

  @Column({ nullable: true })
  avatarUrl!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => AuthToken, (token: AuthToken) => token.user)
  tokens!: AuthToken[];

  @OneToMany(() => Item, (item: Item) => item.user)
  items!: Item[];
}
