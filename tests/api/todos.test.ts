import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startTestDB, stopTestDB, clearCollections } from '../helpers/db';
import { createUserWithCookie, useTestAuthSecret } from '../helpers/auth';
import type { UserDoc } from '@/models/User';

let cookie = '';
let currentUser: UserDoc;

beforeAll(async () => {
  useTestAuthSecret();
  await startTestDB();
});
afterAll(async () => {
  await stopTestDB();
});
beforeEach(async () => {
  await clearCollections();
  const authed = await createUserWithCookie();
  currentUser = authed.user;
  cookie = authed.cookie;
});

function req(url: string, method: string, body?: unknown, cookieHeader: string = cookie) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookieHeader) headers.cookie = cookieHeader;
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function createTodo(title: string, extra: Record<string, unknown> = {}) {
  const { POST } = await import('@/app/api/todos/route');
  const res = await POST(req('http://t/api/todos', 'POST', { title, ...extra }));
  return res.json();
}

describe('/api/todos', () => {
  it('POST 생성 시 order 자동 배정 (컬럼 맨 뒤, 사전순 증가)', async () => {
    const a = await createTodo('A');
    const b = await createTodo('B');
    const c = await createTodo('C');
    expect(a.order < b.order).toBe(true);
    expect(b.order < c.order).toBe(true);
    expect(a.status).toBe('todo');
  });

  it('GET ?status= 필터', async () => {
    const { GET } = await import('@/app/api/todos/route');
    await createTodo('A');
    await createTodo('B', { status: 'done' });
    const done = await (await GET(req('http://t/api/todos?status=done', 'GET'))).json();
    expect(done).toHaveLength(1);
    expect(done[0].title).toBe('B');
  });

  it('PATCH 로 status + order 이동 (카드 1건만 변경, 다른 카드 order 불변)', async () => {
    const { PATCH } = await import('@/app/api/todos/[id]/route');
    const { GET } = await import('@/app/api/todos/route');
    const a = await createTodo('A');
    const b = await createTodo('B');
    const c = await createTodo('C');
    const beforeOrders = { a: a.order, b: b.order, c: c.order };

    // C 를 doing 컬럼으로, order 를 a 와 b 사이로
    const midOrder = 'a0V'; // 임의의 중간 문자열 대신 실제 사이값 계산은 클라이언트 몫; 여기선 지정값 검증
    const res = await PATCH(
      req(`http://t/api/todos/${c._id}`, 'PATCH', { status: 'doing', order: midOrder }),
      { params: { id: c._id } },
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe('doing');
    expect(updated.order).toBe(midOrder);

    // A, B 는 그대로
    const all = await (await GET(req('http://t/api/todos', 'GET'))).json();
    const byId = Object.fromEntries(all.map((t: { _id: string; order: string }) => [t._id, t.order]));
    expect(byId[a._id]).toBe(beforeOrders.a);
    expect(byId[b._id]).toBe(beforeOrders.b);
  });

  it('PATCH 변경 필드 없으면 400', async () => {
    const { PATCH } = await import('@/app/api/todos/[id]/route');
    const a = await createTodo('A');
    const res = await PATCH(req(`http://t/api/todos/${a._id}`, 'PATCH', {}), {
      params: { id: a._id },
    });
    expect(res.status).toBe(400);
  });

  it('DELETE 후 GET 목록에서 제거', async () => {
    const { DELETE } = await import('@/app/api/todos/[id]/route');
    const { GET } = await import('@/app/api/todos/route');
    const a = await createTodo('A');
    await DELETE(req(`http://t/api/todos/${a._id}`, 'DELETE'), { params: { id: a._id } });
    const all = await (await GET(req('http://t/api/todos', 'GET'))).json();
    expect(all).toHaveLength(0);
  });

  it('잘못된 ObjectId -> 400', async () => {
    const { PUT } = await import('@/app/api/todos/[id]/route');
    const res = await PUT(req('http://t/api/todos/bad', 'PUT', { title: 'x' }), {
      params: { id: 'bad' },
    });
    expect(res.status).toBe(400);
  });
});

/** 다른 사용자(B)와 그의 할일을 모델로 직접 만든다. */
async function seedOtherUsersTodo(title = 'B의 할일') {
  const Todo = (await import('@/models/Todo')).default;
  const { user } = await createUserWithCookie('other-user', '2002');
  const todo = await Todo.create({ title, order: 'a0', userId: user._id });
  return { user, todo };
}

describe('/api/todos 인증 가드', () => {
  it('쿠키 없이 GET /api/todos -> 401', async () => {
    const { GET } = await import('@/app/api/todos/route');
    const res = await GET(req('http://t/api/todos', 'GET', undefined, ''));
    expect(res.status).toBe(401);
  });

  it('쿠키 없이 GET /api/goals -> 401', async () => {
    const { GET } = await import('@/app/api/goals/route');
    const res = await GET(req('http://t/api/goals', 'GET', undefined, ''));
    expect(res.status).toBe(401);
  });

  it('쿠키 없이 GET /api/weekly -> 401', async () => {
    const { GET } = await import('@/app/api/weekly/route');
    const res = await GET(req('http://t/api/weekly', 'GET', undefined, ''));
    expect(res.status).toBe(401);
  });

  it('깨진 쿠키 값(%) 이어도 500 이 아니라 401', async () => {
    const { GET } = await import('@/app/api/todos/route');
    const { GET: getOne } = await import('@/app/api/todos/[id]/route');
    const bad = 'todo_session=%';
    expect((await GET(req('http://t/api/todos', 'GET', undefined, bad))).status).toBe(401);
    const okId = '64b7f9a2f1a2c3d4e5f60718';
    const res = await getOne(req(`http://t/api/todos/${okId}`, 'GET', undefined, bad), {
      params: { id: okId },
    });
    expect(res.status).toBe(401);
  });
});

describe('/api/todos 소유자 격리', () => {
  it('GET 은 내 할일만 반환한다', async () => {
    const { GET } = await import('@/app/api/todos/route');
    await createTodo('A의 할일');
    await seedOtherUsersTodo();

    const mine = await (await GET(req('http://t/api/todos', 'GET'))).json();
    expect(mine).toHaveLength(1);
    expect(mine[0].title).toBe('A의 할일');
  });

  it('POST body 의 userId 는 무시하고 세션 사용자로 소유자를 정한다', async () => {
    const { user: other } = await seedOtherUsersTodo();
    const created = await createTodo('내 할일', { userId: String(other._id) });
    expect(String(created.userId)).toBe(String(currentUser._id));
    expect(String(created.userId)).not.toBe(String(other._id));
  });

  it('남의 할일 PATCH / DELETE -> 404, 원본은 그대로', async () => {
    const { PATCH, DELETE } = await import('@/app/api/todos/[id]/route');
    const Todo = (await import('@/models/Todo')).default;
    const { todo } = await seedOtherUsersTodo();
    const id = String(todo._id);

    const patched = await PATCH(req(`http://t/api/todos/${id}`, 'PATCH', { status: 'done' }), {
      params: { id },
    });
    expect(patched.status).toBe(404);

    const deleted = await DELETE(req(`http://t/api/todos/${id}`, 'DELETE'), { params: { id } });
    expect(deleted.status).toBe(404);

    const still = await Todo.findById(id).lean();
    expect(still).not.toBeNull();
    expect((still as { status: string }).status).toBe('todo');
  });
});

describe('Todo.userId 모델', () => {
  it('userId 를 저장하고 다시 읽어도 유지된다', async () => {
    const Todo = (await import('@/models/Todo')).default;
    const created = await Todo.create({ title: '소유자 있는 할일', order: 'a0', userId: currentUser._id });
    const found = await Todo.findById(created._id).lean();
    expect(found).not.toBeNull();
    expect(String((found as { userId: unknown }).userId)).toBe(String(currentUser._id));
  });

  it('userId 를 주지 않으면 null 이다 (마이그레이션 대상)', async () => {
    const Todo = (await import('@/models/Todo')).default;
    const created = await Todo.create({ title: '주인 없는 할일', order: 'a1' });
    const found = await Todo.findById(created._id).lean();
    expect((found as { userId: unknown }).userId).toBeNull();
  });
});
