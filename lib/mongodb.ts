import mongoose from 'mongoose';

/**
 * Next.js 개발 모드의 HMR 은 매 리로드마다 모듈을 재평가하므로
 * 전역 캐시에 커넥션을 보관해 재연결(커넥션 누수)을 방지한다.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI 환경변수가 설정되지 않았습니다. .env 파일에 MongoDB Atlas 연결 문자열을 추가하세요. (.env.example 참고)',
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

export default connectDB;
