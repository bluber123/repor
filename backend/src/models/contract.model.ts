import { Schema, model, Types, Document } from 'mongoose';

export type ContractState = 'draft' | 'active' | 'completed' | 'cancelled';
export type ParticipantRole = 'tenant' | 'landlord';

export interface Participant {
  _id: Types.ObjectId;
  name: string;
  phoneNum: string;
  role: ParticipantRole;
  verified: boolean;
  tokenUsed: boolean;
  ci       : string;
}

export interface ContractDoc extends Document {
  property: Types.ObjectId;
  agent: Types.ObjectId;
  state: ContractState;
  pdfPath: string;
  finance: {
    deposit: number;
    payment: number;
    perMonth: boolean;
  };
  period: {
    start: Date;
    end: Date;
  };
  participants: Participant[];
}

const participantSchema = new Schema<Participant>(
  {
    name:      { type: String, required: true },
    phoneNum:  { type: String, required: true },
    role:      { type: String, enum: ['tenant', 'landlord'], required: true },
    verified:  { type: Boolean, default: false },
    tokenUsed: { type: Boolean, default: false },
    /* ▼ 추가: PASS CI (임대인·임차인 신원 식별키) */
    ci       : { type: String, required: false }
  },
  { _id: true }
);

const contractSchema = new Schema<ContractDoc>(
  {
    property:    { type: Schema.Types.ObjectId, ref: 'properties', required: true },
    agent:       { type: Schema.Types.ObjectId, ref: 'agents',     required: true },
    state:       { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
    pdfPath:     { type: String, required: true },
    finance:     {
      deposit:  { type: Number, required: true },
      payment:  { type: Number, required: true },
      perMonth: { type: Boolean, required: true }
    },
    period:      {
      start: { type: Date, required: true },
      end:   { type: Date, required: true }
    },
    participants:[ participantSchema ]
  },
  { timestamps: true }
);

export const Contract = model<ContractDoc>('contracts', contractSchema);
