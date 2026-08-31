import mongoose, { Schema, model, models } from 'mongoose';

const TodoSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: '', maxlength: 5000 },
    status: {
      type: String,
      enum: ['todo', 'doing', 'done'],
      default: 'todo',
      index: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    dueDate: { type: Date, default: null },
    dayOfWeek: { type: Number, min: 0, max: 6, default: null },
    order: { type: String, required: true },
    weeklyPlanId: { type: Schema.Types.ObjectId, ref: 'WeeklyPlan', default: null },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  },
  { timestamps: true },
);

TodoSchema.index({ status: 1, order: 1 });

export type TodoDoc = mongoose.InferSchemaType<typeof TodoSchema> & { _id: mongoose.Types.ObjectId };

const Todo = models.Todo || model('Todo', TodoSchema);
export default Todo;
