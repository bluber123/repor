import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authGuard, AuthReq } from '../middleware/auth.guard';
import { Contract, AuditLog } from '../models';
import { uploadForm } from '../utils/s3';
import { generateLeasePdf } from '../utils/pdf';
import { sendToLedger } from '../utils/ledger';

const router = Router();

/* ---------- 1. 초안(DRAFT) 생성 ---------- */
router.post('/', authGuard, async (req: AuthReq, res: Response) => {
  const contract = await Contract.create({
    agent: req.agentId,
    ...req.body
  });
  res.status(201).json({ id: contract._id });
});

/* ---------- 2. 계약서 PDF 생성 ---------- */
router.post('/:id/pdf', authGuard, async (req: AuthReq, res: Response) => {
  try {
    const { s3Key, hash } = await generateLeasePdf(req.params.id);

    await Contract.findByIdAndUpdate(req.params.id, { pdfPath: s3Key });

    await AuditLog.create({
      contract: req.params.id,
      action: 'PDF_CREATED',
      hash
    });

    res.json({ pdf: s3Key, hash });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ msg: 'pdf error' });
  }
});

/* ---------- 3. 참가자 초대 ---------- */
router.patch('/:id/invite', authGuard, async (req: AuthReq, res: Response) => {
  const { email, role } = req.body;
  const contract = await Contract.findById(req.params.id);
  if (!contract) return res.status(404).json({ msg: 'not found' });

  const exists = contract.participants.some(p => p.email === email);
  if (!exists) contract.participants.push({ email, role });

  const token = jwt.sign(
    { cid: contract._id, email },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  await contract.save();
  res.json({ link: `http://localhost:3000/contracts/sign?token=${token}` });
});

/* ---------- 4. 간이 본인확인 ---------- */
router.post(
  '/verify',
  uploadForm.single('idImage'),
  async (req: any, res: Response) => {
    const { token, code, name, phone } = req.body;
    if (code !== '0000') return res.status(400).json({ msg: 'bad code (stub)' });

    const { cid, email } = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as any;

    const contract = await Contract.findById(cid);
    const p = contract?.participants.find(p => p.email === email);
    if (!p) return res.status(400).json({ msg: 'no participant' });

    Object.assign(p, {
      name,
      phone,
      verified: true,
      idImage: req.file?.key
    });

    await contract!.save();
    res.json({ msg: 'verified' });
  }
);

/* ---------- 5. 전자서명 ---------- */
router.get('/sign', async (req, res) => {
  try {
    const { cid, email } = jwt.verify(
      req.query.token as string,
      process.env.JWT_SECRET!
    ) as any;

    const contract = await Contract.findById(cid);
    const p = contract?.participants.find(p => p.email === email);
    if (!p || p.tokenUsed) return res.status(400).send('invalid');
    if (!p.verified) return res.status(400).send('not verified');

    p.signedAt = new Date();
    p.tokenUsed = true;

    // 모든 서명 완료 시
    if (contract!.participants.every(px => px.signedAt)) {
      contract!.state = 'SIGNED';

      // 1) 감사로그 남기기
      await AuditLog.create({
        contract: cid,
        action: 'SIGNED',
        hash: ''  // 원한다면 PDF 해시를 넣어주세요
      });

      // 2) 블록체인 전송 스텁 호출
      await sendToLedger({ contractId: cid, hash: '' });
    }

    await contract!.save();
    res.send('서명 완료');
  } catch {
    res.status(400).send('bad token');
  }
});

router.get(
  '/:id',           // GET /contracts/:id
  authGuard,
  async (req: AuthReq, res: Response) => {
    const contract = await Contract.findById(req.params.id)
      .populate('property')
      .populate('agent', 'email')
      .lean();
    if (!contract) {
      return res.status(404).json({ msg: 'contract not found' });
    }
    res.json({ contract });
  }
);

export default router;
