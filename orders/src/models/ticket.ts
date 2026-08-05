import mongoose from 'mongoose';
import { Order, OrderStatus } from './order.js';

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

interface TicketAttrs {
  id: string;
  title: string;
  price: number;
}

export interface TicketDoc extends mongoose.Document {
  id: string;
  version: number;
  title: string;
  price: number;
  isReserved(): Promise<boolean>;
}

interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
  findByEvent(event: {
    id: string;
    version: number;
  }): Promise<TicketDoc | null>;
}

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
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

ticketSchema.set('versionKey', 'version');
// ticketSchema.plugin(updateIfCurrentPlugin);

// This is a read-only replica of the tickets service's Ticket, not the
// source of truth, so it must NOT call this.increment() here. The version
// is always copied verbatim from the incoming event's data.version (see
// ticket-updated-listener.ts: `ticket.version = version`) instead of being
// derived locally. If this hook incremented too, the local copy would drift
// one version ahead of the real Ticket and every future findByEvent lookup
// (which expects version - 1) would stop matching.
ticketSchema.pre('save', function () {
  this.$where = {
    version: this.get('version') - 1,
  };
});

ticketSchema.statics.findByEvent = (event: { id: string; version: number }) => {
  const { id, version } = event;
  return Ticket.findOne({
    _id: id,
    version: version - 1,
  });
};
ticketSchema.statics.build = (attrs: TicketAttrs) => {
  return new Ticket({
    _id: attrs.id,
    title: attrs.title,
    price: attrs.price,
  });
};

ticketSchema.methods.isReserved = async function () {
  const existingOrder = await Order.findOne({
    ticket: this,
    status: {
      $in: [
        OrderStatus.Created,
        OrderStatus.AwaitingPayment,
        OrderStatus.Complete,
      ],
    },
  });

  // this returns yes if reserved (meaning data comes back) or false if null.
  return !!existingOrder;
};

const Ticket = mongoose.model<TicketDoc, TicketModel>('Ticket', ticketSchema);

export { Ticket };
