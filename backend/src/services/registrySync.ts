import cron from 'node-cron';
import crypto from 'crypto';
import deepDiff, { Diff } from 'deep-diff';

import { Property } from '../models/property.model';
import Alert, { AlertType } from '../models/alert.model';
import { fetchRegistry, RegistryResult } from '../utils/registryApi';
import { classify } from '../utils/diffClassifier';
import { generatePdf } from '../utils/pdf';          // ← PDF 헬퍼

// ─────────────────────────────────────────────
// 1. 크론 잡 등록
// ─────────────────────────────────────────────
export function startRegistryCron() {
  const rule = process.env.REGISTRY_CRON ?? '* * * * *';
  console.log('[CRON] preparing registry cron on rule', rule);
  try {
    cron.schedule(rule, run, { timezone: 'Asia/Seoul' });
    console.log('[CRON] registry cron scheduled ✓');
  } catch (err) {
    console.error('[CRON] registry schedule FAILED →', err);
  }
}

// ─────────────────────────────────────────────
// 2. Tick 실행 함수
// ─────────────────────────────────────────────
async function run() {
  console.log('[CRON] registry tick', new Date().toLocaleTimeString());

  let props;
  try {
    props = await Property.find();
    console.log('[CRON] props.length =', props.length);
  } catch (err) {
    console.error('[CRON] find() error →', err);
    return;
  }

  for (const prop of props) {
    try {
      await processProperty(prop);
    } catch (err) {
      console.error('[CRON] processProperty error for', prop.uniqueNo, err);
    }
  }
}

// ─────────────────────────────────────────────
// 3. 개별 Property 처리
// ─────────────────────────────────────────────
async function processProperty(prop: any) {
  // 등기부 조회 (stub 포함)
  const { rawXml, parsed, hash, noChange } =
    (await fetchRegistry(prop.uniqueNo)) as RegistryResult;

  // 변경 없음 ①
  if (noChange) return;

  // 직전 스냅샷과 동일 ②
  const lastSnap = prop.snapshots.at(-1);
  if (lastSnap && lastSnap.hash === hash) return;

  // 새 스냅샷 저장 ③
  prop.snapshots.push({ rawXml, parsed, hash, fetchedAt: new Date() });
  await prop.save();

  /* 🔹 diff 계산 & Alert 생성 */
  if (!lastSnap) {
    console.log('[REGISTRY] first snapshot stored for', prop.uniqueNo);
    return;
  }

  const delta = deepDiff(lastSnap.parsed, parsed) ?? [];
  const touched = new Set<string>();
  let created = 0;

  for (const d of delta as Diff<any, any>[]) {
    const type = classify(d);
    if (type === 'UNKNOWN') {
      console.log('[DEBUG] UNKNOWN', JSON.stringify(d, null, 2));
      continue;
    }

    const pathStr = (d.path ?? []).join('.');
    const seenKey = `${type}:${pathStr}`;
    if (touched.has(seenKey)) continue;
    touched.add(seenKey);

    const diffHash = sha256(
      `${prop.uniqueNo}|${type}|${pathStr}|${JSON.stringify(d.lhs)}|${JSON.stringify(d.rhs)}`
    );

    const exists = await Alert.exists({ diffHash });
    if (exists) continue;

    /* 📄 PDF 자동 생성 */
    const pdfPath = await generatePdf(type.toLowerCase(), {
      address:   prop.address,
      uniqueNo:  prop.uniqueNo,
      diffPath:  pathStr,
      lhs:       d.lhs,
      rhs:       d.rhs,
    });

    await Alert.create({
      property : prop._id,
      type     : type as AlertType,
      diff     : d,
      diffHash ,
      pdfPath ,          // ← 모델에 필드 추가 필요
      sent     : false,
    });

    created++;
  }

  console.log('[REGISTRY] diff detected for', prop.uniqueNo, `(new=${created})`);
}

// ─────────────────────────────────────────────
// 4. 유틸: SHA-256
// ─────────────────────────────────────────────
export function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
