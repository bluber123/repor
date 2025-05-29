/*  src/utils/sendAlert.ts  */
import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import Alert    from '../models/alert.model';
import {Property} from '../models/property.model';     // ★ NEW
import { formatAlert } from '../services/alertFormatter';
import { sendSolapiSms } from '../utils/sendSolapiSms';

/* ── .env 변수 ─────────────────────────────────── */
const {
  /* 플래그 */
  USE_STUB_ALERT,
  USE_STUB_SMS,

  /* nodemailer */
  MAIL_SERVICE,
  MAIL_USER,
  MAIL_PASS,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
} = process.env;

const isStubMail = USE_STUB_ALERT === 'true';
const isStubSMS  = USE_STUB_SMS   === 'true';
const logFile    = path.resolve('__stubs__/alerts.log');

/* ── nodemailer transport ──────────────────────── */
const transporter = nodemailer.createTransport(
  MAIL_SERVICE === 'smtp'
    ? {
        host  : SMTP_HOST,
        port  : Number(SMTP_PORT ?? 587),
        secure: SMTP_SECURE === 'true',
        auth  : { user: MAIL_USER, pass: MAIL_PASS },
      }
    : {
        service: MAIL_SERVICE,
        auth   : { user: MAIL_USER, pass: MAIL_PASS },
      }
);

/* ── 보조 유틸 ──────────────────────────────────── */
function toDomestic(num: string) {
  if (num.startsWith('+82')) return '0' + num.slice(3);
  return num.replace(/[\s-]/g, '');
}

/*  알림 타입 → 대응 PDF 파일명  */
function getAdvicePdfFilename(alertType: string): string | null {
  if (/auction/i.test(alertType))   return 'auction-advice.pdf';
  if (/mortgage/i.test(alertType))  return 'mortgage-advice.pdf';
  if (/owner/i.test(alertType))     return 'owner-advice.pdf';
  return null;
}

/*  “전세사기 위험” 으로 간주할 alert.type  */         // ★ NEW
const RISKY_TYPES = /auction|경매|경매개시|담보설정|근저당/i;

/*  같은 임대인의 ‘다른’ 건물 임차인에게 경고 SMS 발송  */   // ★ NEW
async function broadcastLandlordRisk(
  landlordId: string,
  excludePropertyId: string,
  riskText: string
) {
  /* 1) 해당 임대인의 다른 건물 추출 */
  const props = await Property.find({
    landlord: landlordId,
    _id     : { $ne: excludePropertyId },
  }).select('subsPhone');

  /* 2) 전화번호 집합화(중복 제거) */
  const phoneSet = new Set<string>();
  for (const p of props) {
    for (const ph of (p.subsPhone ?? [])) phoneSet.add(ph);
  }

  /* 3) SMS 발송 */
  for (const ph of phoneSet) {
    try {
      await sendSolapiSms(toDomestic(ph), riskText, isStubSMS);
    } catch (err) {
      console.error('[RISK-SMS] error:', err);
    }
  }
}

/* ── 메인 함수 ─────────────────────────────────── */
export async function sendUnsentAlerts() {
  const unsent = await Alert.find({ sent: false }).populate('property');
  console.log('[ALERT] unsent.length =', unsent.length);

  for (const a of unsent) {
    /* 0. 공통 데이터 */
    const addr =
      a.property.addressBasic +
      (a.property.addressDetail ? ' ' + a.property.addressDetail : '');

    /* ─────────────── SMS (개별 건물 알림) ─────────────── */
    const smsBody = [
      `[등기변동] ${addr}`,
      formatAlert(a.type, a.diff),
      '',
      '📩 자세한 내용과 대응 가이드는 이메일을 확인해 주세요.'
    ].join('\n');

    for (const ph of a.property.subsPhone ?? []) {
      try {
        await sendSolapiSms(toDomestic(ph), smsBody, isStubSMS);
      } catch (err) {
        console.error('[SMS] error:', err);
      }
    }

    /* ─────────────── EMAIL (PDF 첨부) ─────────────── */
    const mailBody = [
      `[등기변동] ${addr}`,
      formatAlert(a.type, a.diff),
      '',
      '첨부된 PDF에 상황별 대응 방법이 정리돼 있습니다.'
    ].join('\n\n');

    const advicePdf = getAdvicePdfFilename(a.type);
    const attachments = advicePdf
      ? [{ filename: advicePdf, path: path.resolve('public', advicePdf) }]
      : [];

    if (isStubMail) {
      await fs.appendFile(logFile, mailBody + '\n\n');
      console.log('(stub mail)\n' + mailBody);
    } else {
      try {
        const info = await transporter.sendMail({
          from   : `"등기 알림" <${MAIL_USER}>`,
          to     : a.property.subsEmail?.join(','),
          subject: '부동산 등기변동 알림',
          text   : mailBody,
          attachments,
        });
        console.log('[MAIL] sent:', info.messageId);
      } catch (err) {
        console.error('[MAIL] error:', err);
      }
    }

    /* ─────────────── 임대인 리스크 경고 ─────────────── */
    if (RISKY_TYPES.test(a.type) && a.property.landlord) {
      const landlordName = a.property.landlordName ?? ''; // 선택
      const warningSms = [
        '⚠️ 전세사기 위험 알림',
        landlordName ? `임대인 ${landlordName}의` : '해당 임대인의',
        '다른 건물에서 경매·담보설정 등 변동이 확인되었습니다.',
        '계약 체결 전 반드시 권리관계를 재확인하시기 바랍니다.'
      ].join(' ');

      await broadcastLandlordRisk(
        a.property.landlord.toString(),
        a.property._id.toString(),
        warningSms
      );
    }

    /*  sent 플래그 반영 */
    a.sent = true;
    await a.save();
  }
}
