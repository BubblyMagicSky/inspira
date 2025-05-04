import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum Provider {
  SPOTIFY = 'spotify',
  TMDB = 'tmdb',
}

@Entity()
export class AuthToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.tokens)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({
    type: 'enum',
    enum: Provider,
  })
  provider!: Provider;

  @Column({
    type: 'text',
    transformer: {
      to: (value: string) => {
        const CryptoJS = require('crypto-js');
        const secretKey = process.env.JWT_SECRET || 'default-secret-key';
        return CryptoJS.AES.encrypt(value, secretKey).toString();
      },
      from: (value: string) => {
        if (!value) return null;
        const CryptoJS = require('crypto-js');
        const secretKey = process.env.JWT_SECRET || 'default-secret-key';
        const bytes = CryptoJS.AES.decrypt(value, secretKey);
        return bytes.toString(CryptoJS.enc.Utf8);
      },
    },
  })
  accessToken!: string;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: string) => {
        if (!value) return null;
        const CryptoJS = require('crypto-js');
        const secretKey = process.env.JWT_SECRET || 'default-secret-key';
        return CryptoJS.AES.encrypt(value, secretKey).toString();
      },
      from: (value: string) => {
        if (!value) return null;
        const CryptoJS = require('crypto-js');
        const secretKey = process.env.JWT_SECRET || 'default-secret-key';
        const bytes = CryptoJS.AES.decrypt(value, secretKey);
        return bytes.toString(CryptoJS.enc.Utf8);
      },
    },
  })
  refreshToken!: string;

  @Column({ nullable: true })
  tokenType!: string;

  @Column({ nullable: true })
  scope!: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @Column({ default: true })
  isActive!: boolean;

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }
}
