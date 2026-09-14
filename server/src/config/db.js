import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  // Case 1: External MONGO_URI is provided (e.g. MongoDB Atlas)
  if (mongoUri && mongoUri.trim() !== '') {
    try {
      const sanitizedHost = mongoUri.includes('@') ? `...@${mongoUri.split('@')[1]}` : mongoUri.substring(0, 30);
      console.log(`📡 Connecting to external MongoDB at: ${sanitizedHost}`);
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`✅ MongoDB Connected to External Instance: ${conn.connection.host} (DB: ${conn.connection.name})`);
      return;
    } catch (err) {
      console.error(`❌ Fatal: External MongoDB connection failed: ${err.message}`);
      console.error(`🛑 MONGO_URI was explicitly configured but failed to connect. Refusing in-memory fallback.`);
      process.exit(1);
    }
  }

  // Case 2: Missing MONGO_URI in production environment
  if (isProduction) {
    console.error(`❌ Fatal: MONGO_URI environment variable is required in production mode!`);
    console.error(`🛑 MongoMemoryServer cannot be used in production because in-memory data does not persist across restarts.`);
    process.exit(1);
  }

  // Case 3: Zero-config fallback for local development & automated tests
  try {
    console.log('📦 MONGO_URI not provided. Starting Embedded MongoMemoryServer for instant zero-dependency execution...');
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB In-Memory Server Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ Failed to connect to In-Memory MongoDB:', err);
    process.exit(1);
  }
};

export const closeDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};
