import connectDB from '@/lib/mongodb';
import WeeklyPlan from '@/models/WeeklyPlan';
import { json, errorResponse, isValidObjectId } from '@/lib/apiHelpers';
import { requireUser } from '@/lib/auth';
import { getWeekStart } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** GET /api/weekly?weekStart=ISO&limit=4 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    await connectDB();
    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get('weekStart');
    const limit = Number(searchParams.get('limit') ?? '4');

    if (weekStartParam) {
      const ws = getWeekStart(new Date(weekStartParam));
      const plan = await WeeklyPlan.findOne({ weekStart: ws }).lean();
      return json(plan ?? null);
    }

    const plans = await WeeklyPlan.find()
      .sort({ weekStart: -1 })
      .limit(Number.isFinite(limit) ? limit : 4)
      .lean();
    return json(plans);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}

/** POST /api/weekly — 주간 계획 생성 (같은 주 중복 시 409) */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    await connectDB();
    const body = await req.json();
    if (!body?.weekStart) return errorResponse('weekStart 는 필수입니다.', 400);
    if (body.goalId && !isValidObjectId(body.goalId)) {
      return errorResponse('잘못된 goalId 형식입니다.', 400);
    }

    const weekStart = getWeekStart(new Date(body.weekStart));
    const exists = await WeeklyPlan.findOne({ weekStart });
    if (exists) return errorResponse('해당 주의 계획이 이미 존재합니다.', 409);

    const goals = Array.isArray(body.goals) ? body.goals : [];
    if (goals.length > 5) return errorResponse('주간 목표는 최대 5개입니다.', 400);

    const plan = await WeeklyPlan.create({
      weekStart,
      goals: goals.map((g: { text: string; done?: boolean }) => ({
        text: String(g.text ?? '').trim(),
        done: Boolean(g.done),
      })),
      memo: typeof body.memo === 'string' ? body.memo : '',
      retrospective: typeof body.retrospective === 'string' ? body.retrospective : '',
      goalId: body.goalId ?? null,
    });
    return json(plan, 201);
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
      return errorResponse('해당 주의 계획이 이미 존재합니다.', 409);
    }
    return errorResponse(err instanceof Error ? err.message : '서버 오류', 500);
  }
}
