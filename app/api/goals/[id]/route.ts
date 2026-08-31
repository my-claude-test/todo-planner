import connectDB from '@/lib/mongodb';
import Goal from '@/models/Goal';
import Todo from '@/models/Todo';
import WeeklyPlan from '@/models/WeeklyPlan';
import { json, errorResponse, isValidObjectId } from '@/lib/apiHelpers';
import { requireUser } from '@/lib/auth';
import { percent } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;
  if (!isValidObjectId(params.id)) return errorResponse('잘못된 ID 형식입니다.', 400);
  try {
    await connectDB();
    const goal = await Goal.findById(params.id).lean();
    if (!goal) return errorResponse('목표를 찾을 수 없습니다.', 404);
    const total = await Todo.countDocuments({ goalId: params.id, userId: user._id });
    const done = await Todo.countDocuments({ goalId: params.id, userId: user._id, status: 'done' });
    return json({ ...goal, progress: percent(done, total) });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;
  if (!isValidObjectId(params.id)) return errorResponse('잘못된 ID 형식입니다.', 400);
  try {
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (typeof body.title === 'string') update.title = body.title.trim();
    if (typeof body.description === 'string') update.description = body.description;
    const goal = await Goal.findByIdAndUpdate(params.id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!goal) return errorResponse('목표를 찾을 수 없습니다.', 404);
    // GET 과 동일하게 진행률을 파생 계산해서 돌려준다 (저장된 progress 는 항상 0)
    const total = await Todo.countDocuments({ goalId: params.id, userId: user._id });
    const done = await Todo.countDocuments({ goalId: params.id, userId: user._id, status: 'done' });
    return json({ ...goal, progress: percent(done, total) });
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
    const goal = await Goal.findByIdAndDelete(params.id);
    if (!goal) return errorResponse('목표를 찾을 수 없습니다.', 404);
    // 연결 정리: 요청자 소유의 Todo / WeeklyPlan 의 goalId 참조만 해제
    await Todo.updateMany({ goalId: params.id, userId: user._id }, { $set: { goalId: null } });
    await WeeklyPlan.updateMany({ goalId: params.id }, { $set: { goalId: null } });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}
