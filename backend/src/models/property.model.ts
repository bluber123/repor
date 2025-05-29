// src/models/property.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import { LandlordDoc } from './landlord.model';   // ✨ 임대인 모델의 타입

/* ── 서브 도큐먼트: 등기 스냅샷 ───────────────────── */
const snapshotSchema = new Schema(
  {
    fetchedAt: { type: Date, default: Date.now },
    rawXml   : String,
    parsed   : Schema.Types.Mixed,
    hash     : String,
  },
  { _id: false }
);

/* ── 메인 스키마 ─────────────────────────────────── */
export interface PropertyDoc extends Document {
  /* 기본 정보 */
  buildingName : string;
  addressBasic : string;
  addressDetail?: string;
  space        : number;
  uniqueNo     : string;

  /* 임대인(공통 식별) */
  landlord: Types.ObjectId | LandlordDoc;
  landlordName?: string;              // 옵션: 이름 캐싱

  /* 구독자 연락처 */
  subsEmail    : string[];
  subsPhone    : string[];

  /* 등기부 스냅샷 */
  snapshots    : {
    fetchedAt : Date;
    rawXml    : string;
    parsed    : any;
    hash      : string;
  }[];
}

const propertySchema = new Schema<PropertyDoc>(
  {
    /* 기본 정보 */
    buildingName : { type: String, required: true },
    addressBasic : { type: String, required: true },
    addressDetail: String,
    space        : { type: Number, required: true },
    uniqueNo     : { type: String, index: true, required: true },

    /* 임대인 정보 */
    landlord     : { type: Schema.Types.ObjectId, ref: 'Landlord', required: true },
    landlordName : String,           // (선택) 검색/표시용 캐시

    /* 알림 구독 정보 */
    subsEmail    : { type: [String], default: [] },
    subsPhone    : { type: [String], default: [] },

    /* 스냅샷 */
    snapshots    : { type: [snapshotSchema], default: [] },
  },
  { timestamps: true }
);

/* ── 모델 내보내기 ───────────────────────────────── */
export const Property = model<PropertyDoc>(
  'Property',
  propertySchema,
  'properties'
);
