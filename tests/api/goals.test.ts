import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startTestDB, stopTestDB, clearCollections } from '../helpers/db';
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

/** 목표 목록 GET 용 요청 */
function listReq() {
  return req('http://t/api/goals', 'GET');
}

describe('/api/goals', () => {
  it('POST 로 목표 생성 후 GET 목록에 포함', async () => {
    const { POST, GET } = await import('@/app/api/goals/route');
    const created = await POST(req('http://t/api/goals', 'POST', { title: '토익 900', description: '3월까지' }));
    expect(created.status).toBe(201);
    const goal = await created.json();
    expect(goal.title).toBe('토익 900');
    expect(goal.progress).toBe(0);

    const listRes = await GET(listReq());
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0]._id).toBe(goal._id);
  });

  it('title 없으면 400', async () => {
    const { POST } = await import('@/app/api/goals/route');
    const res = await POST(req('http://t/api/goals', 'POST', { description: 'x' }));
    expect(res.status).toBe(400);
  });

  it('PUT 로 설명 수정, GET 단건에 반영', async () => {
    const { POST } = await import('@/app/api/goals/route');
    const { PUT, GET } = await import('@/app/api/goals/[id]/route');
    const goal = await (await POST(req('http://t/api/goals', 'POST', { title: 'A' }))).json();

    const upd = await PUT(req(`http://t/api/goals/${goal._id}`, 'PUT', { description: '수정됨' }), {
      params: { id: goal._id },
    });
    expect(upd.status).toBe(200);

    const got = await (await GET(req(`http://t/api/goals/${goal._id}`, 'GET'), { params: { id: goal._id } })).json();
    expect(got.description).toBe('수정됨');
  });

  it('잘못된 ObjectId -> 400, 없는 id -> 404', async () => {
    const { GET } = await import('@/app/api/goals/[id]/route');
    expect((await GET(req('http://t/api/goals/bad', 'GET'), { params: { id: 'bad' } })).status).toBe(400);
    const okId = '64b7f9a2f1a2c3d4e5f60718';
    expect((await GET(req(`http://t/api/goals/${okId}`, 'GET'), { params: { id: okId } })).status).toBe(404);
  });

  it('목표 진행률 = 연결된 Todo 완료율 (4개 중 2개 done -> 50)', async () => {
    const { POST: createGoal, GET: listGoals } = await import('@/app/api/goals/route');
    const { POST: createTodo } = await import('@/app/api/todos/route');
    const { PATCH: patchTodo } = await import('@/app/api/todos/[id]/route');
    const goal = await (await createGoal(req('http://t/api/goals', 'POST', { title: 'G' }))).json();

    const todos = [];
    for (let i = 0; i < 4; i += 1) {
      todos.push(
        await (
          await createTodo(req('http://t/api/todos', 'POST', { title: `T${i}`, goalId: goal._id }))
        ).json(),
      );
    }
    for (let i = 0; i < 2; i += 1) {
      await patchTodo(req(`http://t/api/todos/${todos[i]._id}`, 'PATCH', { status: 'done' }), {
        params: { id: todos[i]._id },
      });
    }

    const list = await (await listGoals(listReq())).json();
    expect(list[0].progress).toBe(50);
  });

  it('연결된 Todo 0건이면 진행률 0', async () => {
    const { POST: createGoal, GET: listGoals } = await import('@/app/api/goals/route');
    await createGoal(req('http://t/api/goals', 'POST', { title: 'Empty' }));
    const list = await (await listGoals(listReq())).json();
    expect(list[0].progress).toBe(0);
  });

  it('DELETE 시 연결된 Todo / WeeklyPlan 의 goalId 가 null 처리', async () => {
    const { POST: createGoal } = await import('@/app/api/goals/route');
    const { DELETE } = await import('@/app/api/goals/[id]/route');
    const { POST: createTodo, GET: listTodos } = await import('@/app/api/todos/route');
    const { POST: createWeekly } = await import('@/app/api/weekly/route');
    const { GET: getWeekly } = await import('@/app/api/weekly/[id]/route');
    const goal = await (await createGoal(req('http://t/api/goals', 'POST', { title: 'G' }))).json();
    await createTodo(req('http://t/api/todos', 'POST', { title: 'T', goalId: goal._id }));
    const plan = await (
      await createWeekly(
        req('http://t/api/weekly', 'POST', { weekStart: '2026-08-24T00:00:00.000Z', goalId: goal._id }),
      )
    ).json();
    expect(plan.goalId).toBeTruthy();

    const del = await DELETE(req(`http://t/api/goals/${goal._id}`, 'DELETE'), { params: { id: goal._id } });
    expect(del.status).toBe(200);

    const todos = await (await listTodos(req('http://t/api/todos', 'GET'))).json();
    expect(todos[0].goalId).toBeNull();

    const gotPlan = await (
      await getWeekly(req(`http://t/api/weekly/${plan._id}`, 'GET'), { params: { id: plan._id } })
    ).json();
    expect(gotPlan.goalId).toBeNull();
  });

  it('PUT 응답에도 진행률이 반영 (제목 수정이 진행률을 0 으로 만들지 않음)', async () => {
    const { POST: createGoal } = await import('@/app/api/goals/route');
    const { PUT } = await import('@/app/api/goals/[id]/route');
    const { POST: createTodo } = await import('@/app/api/todos/route');
    const { PATCH: patchTodo } = await import('@/app/api/todos/[id]/route');
    const goal = await (await createGoal(req('http://t/api/goals', 'POST', { title: 'G' }))).json();

    const t1 = await (
      await createTodo(req('http://t/api/todos', 'POST', { title: 'T1', goalId: goal._id }))
    ).json();
    await createTodo(req('http://t/api/todos', 'POST', { title: 'T2', goalId: goal._id }));
    await patchTodo(req(`http://t/api/todos/${t1._id}`, 'PATCH', { status: 'done' }), {
      params: { id: t1._id },
    });

    const updated = await (
      await PUT(req(`http://t/api/goals/${goal._id}`, 'PUT', { title: '이름 변경' }), {
        params: { id: goal._id },
      })
    ).json();
    expect(updated.title).toBe('이름 변경');
    expect(updated.progress).toBe(50);
  });
});

describe('/api/goals 사용자 간 격리', () => {
  it('진행률 계산은 요청자의 Todo 만 집계한다 (다른 사용자 Todo 는 카운트 누출 없음)', async () => {
    const { GET: listGoals } = await import('@/app/api/goals/route');
    const { POST: createGoal } = await import('@/app/api/goals/route');
    const { POST: createTodo } = await import('@/app/api/todos/route');
    const { PATCH: patchTodo } = await import('@/app/api/todos/[id]/route');

    // A(기본 쿠키) 가 공유 목표를 만든다
    const goal = await (await createGoal(req('http://t/api/goals', 'POST', { title: '공유 목표' }))).json();

    // B 가 그 목표에 연결된 Todo 4개를 만들고 2개 완료
    const b = await createUserWithCookie('user-b', '3003');
    for (let i = 0; i < 4; i += 1) {
      const t = await (
        await createTodo(
          req('http://t/api/todos', 'POST', { title: `B${i}`, goalId: goal._id }, b.cookie),
        )
      ).json();
      if (i < 2) {
        await patchTodo(req(`http://t/api/todos/${t._id}`, 'PATCH', { status: 'done' }, b.cookie), {
          params: { id: t._id },
        });
      }
    }

    // A 의 목록에서 진행률은 0 이어야 한다 (B 의 2/4 가 새어들어오면 50)
    const listForA = await (await listGoals(req('http://t/api/goals', 'GET'))).json();
    expect(listForA[0].progress).toBe(0);
  });

  it('공유 목표 삭제 시 다른 사용자의 Todo goalId 는 건드리지 않는다', async () => {
    const { POST: createGoal, GET: listGoals } = await import('@/app/api/goals/route');
    const { DELETE } = await import('@/app/api/goals/[id]/route');
    const { POST: createTodo, GET: listTodos } = await import('@/app/api/todos/route');

    const goal = await (await createGoal(req('http://t/api/goals', 'POST', { title: '공유 목표' }))).json();
    const b = await createUserWithCookie('user-b2', '3004');
    await createTodo(req('http://t/api/todos', 'POST', { title: 'B의 할일', goalId: goal._id }, b.cookie));

    // A 가 목표 삭제
    const del = await DELETE(req(`http://t/api/goals/${goal._id}`, 'DELETE'), { params: { id: goal._id } });
    expect(del.status).toBe(200);

    // B 의 Todo 는 여전히 goalId 를 유지 (A 의 정리는 A 소유분에만 적용)
    const bTodos = await (await listTodos(req('http://t/api/todos', 'GET', undefined, b.cookie))).json();
    expect(String(bTodos[0].goalId)).toBe(String(goal._id));

    // A 목록에는 목표가 사라졌다
    expect(await (await listGoals(req('http://t/api/goals', 'GET'))).json()).toHaveLength(0);
  });
});
