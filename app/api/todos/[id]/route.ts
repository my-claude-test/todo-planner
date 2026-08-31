import connectDB from '@/lib/mongodb';
import Todo from '@/models/Todo';
import { json, errorResponse, isValidObjectId } from '@/lib/apiHelpers';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;
  if (!isValidObjectId(params.id)) return errorResponse('잘못된 ID 형식입니다.', 400);
  try {
    await connectDB();
    const todo = await Todo.findOne({ _id: params.id, userId: user._id }).lean();
    if (!todo) return errorResponse('할일을 찾을 수 없습니다.', 404);
    return json(todo);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

/** PUT — 전체 필드 수정 (제목/설명/우선순위/마감일/연결 등) */
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
    if (['todo', 'doing', 'done'].includes(body.status)) update.status = body.status;
    if (['high', 'medium', 'low'].includes(body.priority)) update.priority = body.priority;
    if ('dueDate' in body) update.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if ('dayOfWeek' in body) update.dayOfWeek = typeof body.dayOfWeek === 'number' ? body.dayOfWeek : null;
    if ('weeklyPlanId' in body)
      update.weeklyPlanId =
        body.weeklyPlanId && isValidObjectId(body.weeklyPlanId) ? body.weeklyPlanId : null;
    if ('goalId' in body)
      update.goalId = body.goalId && isValidObjectId(body.goalId) ? body.goalId : null;

    const todo = await Todo.findOneAndUpdate({ _id: params.id, userId: user._id }, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!todo) return errorResponse('할일을 찾을 수 없습니다.', 404);
    return json(todo);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

/**
 * PATCH — 드래그앤드랍 커밋용. 카드 1건만 변경.
 * body: { status?, order?, dayOfWeek? }
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;
  if (!isValidObjectId(params.id)) return errorResponse('잘못된 ID 형식입니다.', 400);
  try {
    await connectDB();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (['todo', 'doing', 'done'].includes(body.status)) update.status = body.status;
    if (typeof body.order === 'string' && body.order.length > 0) update.order = body.order;
    if ('dayOfWeek' in body) update.dayOfWeek = typeof body.dayOfWeek === 'number' ? body.dayOfWeek : null;

    if (Object.keys(update).length === 0) {
      return errorResponse('변경할 필드가 없습니다.', 400);
    }

    const todo = await Todo.findOneAndUpdate({ _id: params.id, userId: user._id }, update, {
      new: true,
    }).lean();
    if (!todo) return errorResponse('할일을 찾을 수 없습니다.', 404);
    return json(todo);
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
    const todo = await Todo.findOneAndDelete({ _id: params.id, userId: user._id });
    if (!todo) return errorResponse('할일을 찾을 수 없습니다.', 404);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}
