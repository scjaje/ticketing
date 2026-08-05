import type { OrderStatus } from '@scott-tickets/common';
import mongoose from 'mongoose';

// `mongoose-update-if-current` still registers its hook using the legacy
// `function (next) { ...; next(); }` callback style. Mongoose 7+ no longer
// passes a `next` callback into pre-save hooks, so that package throws
// "next is not a function" on every save. Reimplement the same optimistic
// concurrency logic using the modern (no-callback) hook signature instead.
// function updateIfCurrentPlugin(schema: mongoose.Schema) {
//   const versionKey = schema.get('versionKey');
//   if (!versionKey) {
//     throw new Error('document schema must have a version key');
//   }

//   schema.pre('save', function (this: mongoose.Document & Record<string, any>) {
//     this.$where = { ...this.$where, [versionKey]: this[versionKey] };
//     this.increment();
//   });
// }

// An interface that describes the properties that are required to create a new order
interface OrderAttrs {
  id: string;
  version: number;
  userId: string;
  price: number;
  status: OrderStatus;
}

// An interface that describes the properties that a Order Model has
interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc;
}

// An interface that describes what properties that a Order Document has
interface OrderDoc extends mongoose.Document {
  id: string;
  version: number;
  userId: string;
  price: number;
  status: OrderStatus;
}

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
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
      },
    },
  },
);

orderSchema.set('versionKey', 'version');
// orderSchema.plugin(updateIfCurrentPlugin);

// This is a replica of the orders service's Order, not the source of truth.
// Unlike orders/src/models/ticket.ts, this one uses this.increment() rather
// than copying data.version directly onto the document. That only stays
// correct because payments does exactly one local save per event it
// processes on a given order (created, then cancelled), so its local
// version count stays in lockstep with the orders service's own version.
// If a future listener could save the same order more than once per
// upstream version bump, this would need to switch to explicitly setting
// `order.version = data.version` like the orders/ticket.ts replica does.
orderSchema.pre('save', function () {
  this.$where = {
    version: this.get('version'),
  };
  this.increment();
});

orderSchema.statics.build = (attrs: OrderAttrs) => {
  return new Order({
    _id: attrs.id,
    version: attrs.version,
    userId: attrs.userId,
    price: attrs.price,
    status: attrs.status,
  });
};

export const Order = mongoose.model<OrderDoc, OrderModel>('Order', orderSchema);
