import mongoose, { Schema, model, models } from 'mongoose';

const WeeklyGoalSchema = new Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 300 },
    done: { type: Boolean, default: false },
  },
  { _id: true },
);

const WeeklyPlanSchema = new Schema(
  {
    weekStart: { type: Date, required: true, unique: true },
    goals: {
      type: [WeeklyGoalSchema],
      default: [],
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length <= 5,
        message: '주간 목표는 최대 5개까지 가능합니다.',
      },
    },
    memo: { type: String, default: '', maxlength: 5000 },
    retrospective: { type: String, default: '', maxlength: 5000 },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal', default: null },
  },
  { timestamps: true },
);

export type WeeklyPlanDoc = mongoose.InferSchemaType<typeof WeeklyPlanSchema> & {
  _id: mongoose.Types.ObjectId;
};

const WeeklyPlan = models.WeeklyPlan || model('WeeklyPlan', WeeklyPlanSchema);
export default WeeklyPlan;
