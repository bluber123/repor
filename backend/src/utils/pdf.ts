import fsSync from 'fs';
import path   from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';          // ★ 추가
import Handlebars from 'handlebars';

/**
 * 템플릿명과 데이터만 넘기면 public/pdfs/ 에 PDF 파일 저장 후
 * 'pdfs/파일명.pdf' 경로를 돌려준다.
 */
export async function generatePdf(
  templateName: string,
  data: Record<string, any>,
): Promise<string> {

  /* ───── 1) 템플릿 로드 ───── */
  const tplPath      = path.join(__dirname, '..', 'templates', 'pdf', `${templateName}.hbs`);
  const fallbackPath = path.join(__dirname, '..', 'templates', 'pdf', 'default.hbs');
  const tplSrc = fsSync.readFileSync(
    fsSync.existsSync(tplPath) ? tplPath : fallbackPath,
    'utf8',
  );
  const content = Handlebars.compile(tplSrc)(data);

  /* ───── 2) PDF 문서·폰트 설정 ───── */
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);              // ★ 등록

  let font;
  try {
    const fontBytes = fsSync.readFileSync(
      path.join(process.cwd(), 'fonts', 'NotoSansKR-Regular.ttf'),
    );
    font = await pdfDoc.embedFont(fontBytes, { subset: true });
  } catch (e) {
    console.warn('[PDF] NotoSansKR 임베드 실패 → Helvetica로 대체', e);
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  /* ───── 3) 텍스트 렌더링 ───── */
  const fontSize = 11;
  const lineGap  = 4;
  let   y        = height - 40;

  for (const line of content.split('\n')) {
    page.drawText(line, { x: 40, y, size: fontSize, font });
    y -= fontSize + lineGap;
    if (y < 40) { y = height - 40; pdfDoc.addPage(); }
  }

  /* ───── 4) 저장 ───── */
  const pdfBytes = await pdfDoc.save();
  const fileName = `${templateName}-${Date.now()}.pdf`;
  const outDir   = path.join(process.cwd(), 'public', 'pdfs');
  if (!fsSync.existsSync(outDir)) fsSync.mkdirSync(outDir, { recursive: true });
  fsSync.writeFileSync(path.join(outDir, fileName), pdfBytes);

  return `pdfs/${fileName}`;
}
