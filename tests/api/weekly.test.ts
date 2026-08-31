import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startTestDB, stopTestDB, clearCollections } from '../helpers/db';
import { getWeekStartISO } from '@/lib/utils';
import { createUserWithCookie, useTestAuthSecret } from '../helpers/auth';

let cookie = '';

beforeAll(async () => {
  useTestAuthSecret();
  await startTestDB();
});
afterAll(async () => {
  await stopTestDB();
});
beforeEach(async () => {
  await clearCollections();
  cookie = (await createUserWithCookie()).cookie;
});

function req(url: string, method: string, body?: unknown, asCookie: string = cookie) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', cookie: asCookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const WEEK = getWeekStartISO(new Date(2026, 7, 26));

describe('/api/weekly', () => {
  it('POST 생성 후 ?weekStart= 로 조회', async () => {
    const { POST, GET } = await import('@/app/api/weekly/route');
    const res = await POST(
      req('http://t/api/weekly', 'POST', {
        weekStart: WEEK,
        goals: [{ text: '알고리즘 5문제' }, { text: '이력서 초안' }],
        memo: '집중 주간',
      }),
    );
    expect(res.status).toBe(201);

    const got = await (
      await GET(req(`http://t/api/weekly?weekStart=${encodeURIComponent(WEEK)}`, 'GET'))
    ).json();
    expect(got).not.toBeNull();
    expect(got.goals).toHaveLength(2);
    expect(got.memo).toBe('집중 주간');
  });

  it('다른 주 조회 -> null', async () => {
    const { GET } = await import('@/app/api/weekly/route');
    const other = getWeekStartISO(new Date(2026, 0, 5));
    const got = await (
      await GET(req(`http://t/api/weekly?weekStart=${encodeURIComponent(other)}`, 'GET'))
    ).json();
    expect(got).toBeNull();
  });

  it('같은 주 중복 생성 -> 409', async () => {
    const { POST } = await import('@/app/api/weekly/route');
    await POST(req('http://t/api/weekly', 'POST', { weekStart: WEEK }));
    const dup = await POST(req('http://t/api/weekly', 'POST', { weekStart: WEEK }));
    expect(dup.status).toBe(409);
  });

  it('주간 목표 6개 -> 400', async () => {
    const { POST } = await import('@/app/api/weekly/route');
    const res = await POST(
      req('http://t/api/weekly', 'POST', {
        weekStart: WEEK,
        goals: Array.from({ length: 6 }, (_, i) => ({ text: `g${i}` })),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('PATCH 로 goals[n].done 토글, 응답에 반영', async () => {
    const { POST } = await import('@/app/api/weekly/route');
    const { PATCH } = await import('@/app/api/weekly/[id]/route');
    const plan = await (
      await POST(
        req('http://t/api/weekly', 'POST', { weekStart: WEEK, goals: [{ text: 'g1' }] }),
      )
    ).json();
    const itemId = plan.goals[0]._id;

    const res = await PATCH(
      req(`http://t/api/weekly/${plan._id}`, 'PATCH', { goalItemId: itemId, done: true }),
      { params: { id: plan._id } },
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.goals[0].done).toBe(true);
  });

  it('PUT 로 메모/회고 수정', async () => {
    const { POST } = await import('@/app/api/weekly/route');
    const { PUT } = await import('@/app/api/weekly/[id]/route');
    const plan = await (
      await POST(req('http://t/api/weekly', 'POST', { weekStart: WEEK }))
    ).json();
    const res = await PUT(
      req(`http://t/api/weekly/${plan._id}`, 'PUT', { memo: 'm2', retrospective: '회고함' }),
      { params: { id: plan._id } },
    );
    const updated = await res.json();
    expect(updated.memo).toBe('m2');
    expect(updated.retrospective).toBe('회고함');
  });
});

describe('/api/weekly 사용자 간 격리', () => {
  it('공유 주간계획 삭제 시 다른 사용자의 Todo weeklyPlanId 는 건드리지 않는다', async () => {
    const { POST: createWeekly } = await import('@/app/api/weekly/route');
    const { DELETE } = await import('@/app/api/weekly/[id]/route');
    const { POST: createTodo, GET: listTodos } = await import('@/app/api/todos/route');

    const plan = await (
      await createWeekly(req('http://t/api/weekly', 'POST', { weekStart: WEEK }))
    ).json();

    const b = await createUserWithCookie('weekly-b', '4004');
    await createTodo(
      req('http://t/api/todos', 'POST', { title: 'B의 할일', weeklyPlanId: plan._id }, b.cookie),
    );

    const del = await DELETE(req(`http://t/api/weekly/${plan._id}`, 'DELETE'), {
      params: { id: plan._id },
    });
    expect(del.status).toBe(200);

    const bTodos = await (
      await listTodos(req('http://t/api/todos', 'GET', undefined, b.cookie))
    ).json();
    expect(String(bTodos[0].weeklyPlanId)).toBe(String(plan._id));
  });
});
