import mongoose from 'mongoose';
import { Password } from '../services/password.js';

// An interface that describes the properties that are required to create a new user
interface UserAttrs {
  email: string;
  password: string;
}

// An interface that describes the properties that a User Model has
interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

// An interface that describes what properties that a User Document has
interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  id: string;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
      },
    },
  },
);

// No versionKey/increment() here (unlike Ticket/Order): auth doesn't
// publish NATS events for other services to track, so there's no consumer
// that needs an optimistic-concurrency version number to compare against.
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    const hashed = await Password.toHash(this.get('password'));
    this.set('password', hashed);
  }
});

userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs);
};

export const User = mongoose.model<UserDoc, UserModel>('User', userSchema);
