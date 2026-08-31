#!/usr/bin/env node
/**
 * Todo.userId 백필 마이그레이션 스크립트 (US-003)
 *
 * 사용법:
 *   node scripts/migrate-todos-userId.mjs                      # dry-run (조회만)
 *   node scripts/migrate-todos-userId.mjs --assign octocat     # userId 가 없는 할일을 해당 GitHub 사용자에게 배정
 *
 * MONGODB_URI 는 프로세스 환경변수에서 읽으며, 없으면 프로젝트 루트의 .env 를 직접 파싱한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** .env 를 최소한으로 파싱해 process.env 에 채운다 (이미 설정된 값은 덮어쓰지 않음). */
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** --assign <username> 파싱. 값이 없으면 null. */
function parseAssign(argv) {
  const idx = argv.indexOf('--assign');
  if (idx === -1) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith('--')) {
    console.error('오류: --assign 뒤에 GitHub username 을 지정하세요.');
    process.exit(1);
  }
  return value;
}

// 컬렉션 스키마는 마이그레이션에 필요한 최소 필드만 인라인으로 정의한다.
// (앱의 TS 모델을 .mjs 에서 직접 import 할 수 없으므로 collection 이름을 명시해 맞춘다.)
const Todo = mongoose.model(
  'MigrationTodo',
  new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, default: null } }, { strict: false }),
  'todos',
);
const User = mongoose.model(
  'MigrationUser',
  new mongoose.Schema({ username: String, githubId: String }, { strict: false }),
  'users',
);

async function main() {
  loadDotEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('오류: MONGODB_URI 환경변수가 설정되지 않았습니다. .env 를 확인하세요.');
    process.exit(1);
  }

  const assign = parseAssign(process.argv.slice(2));
  await mongoose.connect(uri);

  try {
    const total = await Todo.countDocuments({});
    const orphans = await Todo.countDocuments({ userId: null });
    console.log(`전체 할일: ${total}`);
    console.log(`소유자 없는 할일(userId == null): ${orphans}`);

    if (!assign) {
      console.log('dry-run: no changes. pass --assign <githubUsername> to backfill.');
      return;
    }

    // username 은 unique 가 아니다 (GitHub 개명 등으로 중복 가능). 모호하면 중단한다.
    const matches = await User.find({ username: assign }).select('_id githubId').lean();
    if (matches.length === 0) {
      console.error(`오류: username "${assign}" 인 사용자를 찾을 수 없습니다.`);
      process.exitCode = 1;
      return;
    }
    if (matches.length > 1) {
      console.error(
        `오류: username "${assign}" 인 사용자가 ${matches.length} 명입니다. ` +
          `githubId 로 특정하세요: ${matches.map((m) => m.githubId).join(', ')}`,
      );
      process.exitCode = 1;
      return;
    }
    const user = matches[0];

    const result = await Todo.updateMany({ userId: null }, { $set: { userId: user._id } });
    console.log(`배정 대상 사용자: ${assign} (${user._id})`);
    console.log(`modifiedCount: ${result.modifiedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
