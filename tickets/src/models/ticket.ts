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

// An interface that describes the properties that are required to create a new ticket
interface TicketAttrs {
  title: string;
  price: number;
  userId: string;
}

// An interface that describes the properties that a Ticket Model has
interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
}

// An interface that describes what properties that a Ticket Document has
interface TicketDoc extends mongoose.Document {
  id: string;
  title: string;
  price: number;
  userId: string;
  version: number;
  orderId?: string | undefined;
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
    },
    userId: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
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

// // this runs before saving as a middleware essentially.
// ticketSchema.pre('save', async function () {
//   if (this.isModified('password')) {
//     const hashed = await Password.toHash(this.get('password'));
//     this.set('password', hashed);
//   }
// });

// This service owns Ticket data (it's the source of truth), so every save
// must produce a new version number: other services (orders) store the
// version they last saw and use it to detect out-of-order events, and they
// rely on this service incrementing by exactly 1 per save.
ticketSchema.pre('save', function () {
  this.$where = {
    version: this.get('version'),
  };
  this.increment();
});

ticketSchema.statics.build = (attrs: TicketAttrs) => {
  return new Ticket(attrs);
};

export const Ticket = mongoose.model<TicketDoc, TicketModel>(
  'Ticket',
  ticketSchema,
);
