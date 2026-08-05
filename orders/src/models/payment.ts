import mongoose from 'mongoose';

// An interface that describes the properties that are required to create a new payment
interface PaymentAttrs {
  id: string;
  orderId: string;
  stripeId: string;
}

// An interface that describes the properties that a Payment Model has
interface PaymentModel extends mongoose.Model<PaymentDoc> {
  build(attrs: PaymentAttrs): PaymentDoc;
}

// An interface that describes what properties that a Payment Document has
export interface PaymentDoc extends mongoose.Document {
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

// No presave/versioning was added as we currently do not do
// anything else with the payments
// If we were to add changes, like refunds, cancelled payments, etc, we can
// come back and add here if needed.

paymentSchema.statics.build = (attrs: PaymentAttrs) => {
  return new Payment({
    _id: attrs.id,
    stripeId: attrs.stripeId,
    orderId: attrs.orderId,
  });
};

export const Payment = mongoose.model<PaymentDoc, PaymentModel>(
  'Payment',
  paymentSchema,
);
