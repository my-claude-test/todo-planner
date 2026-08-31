import connectDB from '@/lib/mongodb';
import Goal from '@/models/Goal';
import Todo from '@/models/Todo';
import { json, errorResponse } from '@/lib/apiHelpers';
import { requireUser } from '@/lib/auth';
import { percent } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** GET /api/goals — 목표 목록 (연결된 Todo 완료율로 progress 갱신) */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const { user } = auth;
    await connectDB();
    const goals = await Goal.find().sort({ createdAt: -1 }).lean();

    const withProgress = await Promise.all(
      goals.map(async (g) => {
        const total = await Todo.countDocuments({ goalId: g._id, userId: user._id });
        const done = await Todo.countDocuments({ goalId: g._id, userId: user._id, status: 'done' });
        return { ...g, progress: percent(done, total) };
      }),
    );

    return json(withProgress);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류';
    return errorResponse(message, 500);
  }
}

/** POST /api/goals — 목표 생성 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    await connectDB();
    const body = await req.json();
    if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
      return errorResponse('title 은 필수입니다.', 400);
    }
    const goal = await Goal.create({
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : '',
    });
    return json(goal, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류';
    return errorResponse(message, 500);
  }
}
