// src/services/alertSender.ts   (또는 sendUnsentAlerts.ts)
import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';

import Alert from '../models/alert.model';
import { formatAlert } from './alertFormatter';

const { USE_STUB_ALERT, MAIL_USER, MAIL_PASS, PUBLIC_ORIGIN } = process.env;
const isStub  = USE_STUB_ALERT === 'true';
const logFile = path.resolve('__stubs__/alerts.log');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: MAIL_USER, pass: MAIL_PASS },
});

/** sent:false 인 Alert들을 찾아 알림 발송 → sent:true */
export async function sendUnsentAlerts() {
  const unsent = await Alert.find({ sent: false }).populate('property');

  for (const a of unsent) {
    /* 1️⃣ 주소 한 줄 */
    const fullAddr =
      a.property.addressBasic +
      (a.property.addressDetail ? ' ' + a.property.addressDetail : '');

    /* 2️⃣ PDF 다운로드 URL (알림별) */
    const url = `${PUBLIC_ORIGIN}/${a.pdfPath}`;

    /* 3️⃣ 메일 본문 (txt + HTML) */
    const bodyText = [
      `[등기변동] ${fullAddr}`,
      formatAlert(a.type, a.diff),
      '',
      `📄 대응 가이드: ${url}`,
    ].join('\n');

    const bodyHtml = `
      <p><strong>[등기변동] ${fullAddr}</strong></p>
      <pre style="font-family: Pretendard, sans-serif">${formatAlert(a.type, a.diff)}</pre>
      <p><a href="${url}">📄 대응 가이드 PDF 다운로드</a></p>
    `;

    /* 4️⃣ 발송 or 스텁 로깅 */
    if (isStub) {
      await fs.appendFile(logFile, bodyText + '\n');
      console.log('(stub alert)', bodyText);
    } else {
      await transporter.sendMail({
        from   : MAIL_USER,
        to     : a.property.subsEmail,
        subject: '부동산 등기변동 알림',
        text   : bodyText,
        html   : bodyHtml,
      });
    }

    /* 5️⃣ 중복 방지 플래그 */
    a.sent = true;
    await a.save();
  }
}
