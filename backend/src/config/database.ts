import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/User';
import { AuthToken } from '../entities/AuthToken';
import { Item } from '../entities/Item';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'inspira',
  schema: process.env.DB_SCHEMA || 'public',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, AuthToken, Item],
  subscribers: [],
  migrations: [],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');
    return AppDataSource;
  } catch (error) {
    console.error('Error initializing database connection:', error);
    throw error;
  }
};

export const createStubDataSource = () => {
  console.log('Using database stub for testing/CI environment');
  return {
    initialize: async () => console.log('Database stub initialized'),
    getRepository: (entity: any) => ({
      find: async () => [],
      findOne: async () => null,
      save: async (data: any) => data,
      update: async () => ({ affected: 1 }),
      delete: async () => ({ affected: 1 }),
    }),
  };
};

export const getDataSource = () => {
  if (process.env.NODE_ENV === 'test' || process.env.USE_DB_STUB === 'true') {
    return createStubDataSource();
  }
  return AppDataSource;
};
