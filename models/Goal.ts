import mongoose, { Schema, model, models } from 'mongoose';

const GoalSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
);

export type GoalDoc = mongoose.InferSchemaType<typeof GoalSchema> & { _id: mongoose.Types.ObjectId };

const Goal = models.Goal || model('Goal', GoalSchema);
export default Goal;
