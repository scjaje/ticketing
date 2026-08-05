import mongoose from 'mongoose';

// An interface that describes the properties that are required to create a new payment
interface PaymentAttrs {
  orderId: string;
  stripeId: string;
}

// An interface that describes the properties that a Payment Model has
interface PaymentModel extends mongoose.Model<PaymentDoc> {
  build(attrs: PaymentAttrs): PaymentDoc;
}

// An interface that describes what properties that a Payment Document has
interface PaymentDoc extends mongoose.Document {
  orderId: string;
  stripeId: string;
  version: number;
  id: string;
}

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
    },
    stripeId: {
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

paymentSchema.set('versionKey', 'version');

paymentSchema.pre('save', function () {
  this.$where = {
    version: this.get('version'),
  };
  this.increment();
});

paymentSchema.statics.build = (attrs: PaymentAttrs) => {
  return new Payment(attrs);
};

export const Payment = mongoose.model<PaymentDoc, PaymentModel>(
  'Payment',
  paymentSchema,
);
