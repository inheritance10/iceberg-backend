import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // Railway DATABASE_URI kullanır, lokal için MONGODB_URI
  uri: process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/iceberg',
}));

