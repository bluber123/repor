// src/models/alert.model.ts
import { Schema, model, Types } from 'mongoose';

// 1) 타입 정의  -------------------------------
export type AlertType =
  | 'OWNER_CHANGE'
  | 'LIEN_ADD'
  | 'LIEN_EDIT'
  | 'LIEN_REMOVE'      // ★ 새로 추가
  | 'AUCTION_START'
  | 'AUCTION_END';     // ★(이미 있다면 그대로)


interface IAlert {
  property : Types.ObjectId;
  type     : AlertType;
  diff     : any;            // deep-diff 결과
  sent     : boolean;
  diffHash : string;
  pdfPath  : string;
  createdAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    property : { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    type     : { type: String, required: true, enum: [
        'OWNER_CHANGE',
        'LIEN_ADD',
        'LIEN_EDIT',
        'LIEN_REMOVE',    // ★ 여기에도 추가
        'AUCTION_START',
        'AUCTION_END',
      ],
    },
    diff     : Schema.Types.Mixed,
    sent     : { type: Boolean, default: false },
    diffHash : { type: String, index: true, unique: true },  // ← 중복 방지
    pdfPath  : { type: String, required: true },
    createdAt: { type: Date,   default: Date.now },
  },
  { versionKey: false }
);

export default model<IAlert>('Alert', alertSchema);
