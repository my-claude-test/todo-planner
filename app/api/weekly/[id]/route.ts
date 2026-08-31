import connectDB from '@/lib/mongodb';
import WeeklyPlan from '@/models/WeeklyPlan';
import Todo from '@/models/Todo';
import { json, errorResponse, isValidObjectId } from '@/lib/apiHelpers';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  if (!isValidObjectId(params.id)) return errorResponse('잘못된 ID 형식입니다.', 400);
  try {
    await connectDB();
    const plan = await WeeklyPlan.findById(params.id).lean();
    if (!plan) return errorResponse('주간 계획을 찾을 수 없습니다.', 404);
    return json(plan);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

/** PUT — 목표 목록 / 메모 / 회고 / 연결 목표 전체 교체 */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  if (!isValidObjectId(params.id)) return errorResponse('잘못된 ID 형식입니다.', 400);
  try {
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (Array.isArray(body.goals)) {
      if (body.goals.length > 5) return errorResponse('주간 목표는 최대 5개입니다.', 400);
      update.goals = body.goals.map((g: { _id?: string; text: string; done?: boolean }) => ({
        ...(g._id ? { _id: g._id } : {}),
        text: String(g.text ?? '').trim(),
        done: Boolean(g.done),
      }));
    }
    if (typeof body.memo === 'string') update.memo = body.memo;
    if (typeof body.retrospective === 'string') update.retrospective = body.retrospective;
    if ('goalId' in body) {
      if (body.goalId && !isValidObjectId(body.goalId)) {
        return errorResponse('잘못된 goalId 형식입니다.', 400);
      }
      update.goalId = body.goalId ?? null;
    }

    const plan = await WeeklyPlan.findByIdAndUpdate(params.id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!plan) return errorResponse('주간 계획을 찾을 수 없습니다.', 404);
    return json(plan);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

/** PATCH — 특정 주간 목표 하나의 done 토글: { goalItemId, done } */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  if (!isValidObjectId(params.id)) return errorResponse('잘못된 ID 형식입니다.', 400);
  try {
    await connectDB();
    const body = await req.json();
    const { goalItemId, done } = body ?? {};
    if (!goalItemId) return errorResponse('goalItemId 는 필수입니다.', 400);

    const plan = await WeeklyPlan.findById(params.id);
    if (!plan) return errorResponse('주간 계획을 찾을 수 없습니다.', 404);

    const item = plan.goals.id(goalItemId);
    if (!item) return errorResponse('주간 목표 항목을 찾을 수 없습니다.', 404);
    item.done = typeof done === 'boolean' ? done : !item.done;
    await plan.save();
    return json(plan.toObject());
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;
  if (!isValidObjectId(params.id)) return errorResponse('잘못된 ID 형식입니다.', 400);
  try {
    await connectDB();
    const plan = await WeeklyPlan.findByIdAndDelete(params.id);
    if (!plan) return errorResponse('주간 계획을 찾을 수 없습니다.', 404);
    await Todo.updateMany(
      { weeklyPlanId: params.id, userId: user._id },
      { $set: { weeklyPlanId: null } },
    );
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}
