import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  application: Types.ObjectId;
  utr: string;
  amount: number;
  paidOn: Date;
  recordedBy: Types.ObjectId;
}

const paymentSchema = new Schema<IPayment>(
  {
    application: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    utr: { type: String, required: true, unique: true, trim: true, uppercase: true },
    amount: { type: Number, required: true, min: 0.01 },
    paidOn: { type: Date, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
