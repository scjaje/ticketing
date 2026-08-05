import { OrderStatus } from '@scott-tickets/common';
import mongoose from 'mongoose';
import type { TicketDoc } from './ticket.js';
import type { PaymentDoc } from './payment.js';

interface OrderAttrs {
  userId: string;
  status: OrderStatus;
  expiresAt: Date;
  ticket: TicketDoc;
}

interface OrderDoc extends mongoose.Document {
  id: string;
  version: number;
  userId: string;
  status: OrderStatus;
  expiresAt: Date;
  ticket: TicketDoc | undefined;
  payment: PaymentDoc | undefined;
}

interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc;
}

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Created,
    },
    expiresAt: {
      type: mongoose.Schema.Types.Date,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
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
// ticketSchema.plugin(updateIfCurrentPlugin);

// This service owns Order data (it's the source of truth), so every save
// must produce a new version number: other services (payments) store the
// version they last saw and use it to detect out-of-order events, and they
// rely on this service incrementing by exactly 1 per save. Forgetting this
// increment is why version stayed stuck at 0 forever and made downstream
// "not found" lookups fail after a cancel.
orderSchema.pre('save', function () {
  this.$where = {
    version: this.get('version'),
  };
  this.increment();
});

orderSchema.statics.build = (attrs: OrderAttrs) => {
  return new Order(attrs);
};

const Order = mongoose.model<OrderDoc, OrderModel>('Order', orderSchema);

export { Order, OrderStatus };
