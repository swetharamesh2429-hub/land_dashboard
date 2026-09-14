import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

dotenv.config();

async function runProductionTests() {
  console.log('\n🧪 ==============================================================');
  console.log('🧪 RAKSHA-NER PRODUCTION READINESS & DATABASE CONNECTION TESTS');
  console.log('🧪 ==============================================================\n');

  // Test 1: Real MONGO_URI in production mode
  console.log('▶️ Test 1: Testing connection to external MongoDB (Atlas) in production mode...');
  const originalEnv = process.env.NODE_ENV;
  const realMongoUri = process.env.MONGO_URI;
  process.env.NODE_ENV = 'production';

  if (!realMongoUri) {
    console.warn('⚠️ No real MONGO_URI in .env to test external Atlas connection.');
  } else {
    try {
      await connectDB();
      console.log('✅ Test 1 PASSED: Successfully connected to external MongoDB in production mode.');
      await mongoose.connection.close();
    } catch (e) {
      console.error('❌ Test 1 FAILED:', e.message);
    }
  }

  // Test 2: In production mode with missing MONGO_URI, verify it refuses in-memory server
  console.log('\n▶️ Test 2: Testing production mode with missing MONGO_URI...');
  delete process.env.MONGO_URI;
  process.env.NODE_ENV = 'production';

  let exitedWithCode = null;
  const originalExit = process.exit;
  process.exit = (code) => {
    exitedWithCode = code;
    throw new Error(`process.exit called with code ${code}`);
  };

  try {
    await connectDB();
    console.error('❌ Test 2 FAILED: connectDB did not halt when MONGO_URI was missing in production!');
  } catch (err) {
    if (exitedWithCode === 1) {
      console.log('✅ Test 2 PASSED: Successfully refused in-memory server and exited with code 1 when MONGO_URI is missing in production.');
    } else {
      console.error('❌ Test 2 UNEXPECTED:', err.message);
    }
  } finally {
    process.exit = originalExit;
    process.env.MONGO_URI = realMongoUri;
    process.env.NODE_ENV = originalEnv;
  }

  console.log('\n==============================================================');
  console.log('🎉 ALL DATABASE PRODUCTION CHECKS COMPLETED');
  console.log('==============================================================\n');
}

runProductionTests();
