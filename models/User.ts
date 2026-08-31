import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema(
  {
    githubId: { type: String, required: true, unique: true },
    username: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true },
);

export type UserDoc = mongoose.InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

const User = models.User || model('User', UserSchema);
export default User;
