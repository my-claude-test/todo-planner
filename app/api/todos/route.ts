import connectDB from '@/lib/mongodb';
import Todo from '@/models/Todo';
import { json, errorResponse, isValidObjectId } from '@/lib/apiHelpers';
import { requireUser } from '@/lib/auth';
import { keyBetween } from '@/lib/fractionalIndex';

export const dynamic = 'force-dynamic';

/** GET /api/todos?status=&weeklyPlanId=&goalId= */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const { user } = auth;
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = { userId: user._id };
    const status = searchParams.get('status');
    const weeklyPlanId = searchParams.get('weeklyPlanId');
    const goalId = searchParams.get('goalId');
    if (status) filter.status = status;
    if (weeklyPlanId && isValidObjectId(weeklyPlanId)) filter.weeklyPlanId = weeklyPlanId;
    if (goalId && isValidObjectId(goalId)) filter.goalId = goalId;

    const todos = await Todo.find(filter).sort({ status: 1, order: 1 }).lean();
    return json(todos);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

/** POST /api/todos — order 는 해당 status 컬럼 맨 뒤로 자동 배정 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const { user } = auth;
    await connectDB();
    const body = await req.json();
    if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
      return errorResponse('title 은 필수입니다.', 400);
    }
    const status = ['todo', 'doing', 'done'].includes(body.status) ? body.status : 'todo';

    const last = await Todo.findOne({ status, userId: user._id }).sort({ order: -1 }).lean();
    const order = keyBetween((last as { order?: string } | null)?.order ?? null, null);

    const todo = await Todo.create({
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : '',
      status,
      priority: ['high', 'medium', 'low'].includes(body.priority) ? body.priority : 'medium',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      dayOfWeek: typeof body.dayOfWeek === 'number' ? body.dayOfWeek : null,
      order,
      weeklyPlanId: body.weeklyPlanId && isValidObjectId(body.weeklyPlanId) ? body.weeklyPlanId : null,
      goalId: body.goalId && isValidObjectId(body.goalId) ? body.goalId : null,
      // 소유자는 세션에서만 결정한다. 요청 본문의 userId 는 무시.
      userId: user._id,
    });
    return json(todo, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}
