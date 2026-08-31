import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';

let mongod: MongoMemoryServer | null = null;

export async function startTestDB(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  // 명시적으로 연결해 둔다 — 첫 테스트가 DB 를 건드리기 전에 모델이 등록되기만 하고
  // 연결은 안 된 상태에서 clearCollections() 가 버퍼링 타임아웃되는 것을 방지.
  await connectDB();
}

export async function stopTestDB(): Promise<void> {
  await mongoose.disconnect();
  if (global._mongooseCache) {
    global._mongooseCache.conn = null;
    global._mongooseCache.promise = null;
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

export async function clearCollections(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
