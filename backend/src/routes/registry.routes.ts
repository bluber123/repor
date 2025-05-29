import { Router, Response } from 'express';
import { Registry } from '../models/registry.model';
import { RegistryEvent } from '../models/registryEvent.model';
import { authGuard, AuthReq } from '../middleware/auth.guard';
import { fetchRegistry } from '../utils/registryApi';
import { fetchRegistryStub } from '../utils/registryStub';

const router = Router();

/* 최신 스냅샷 조회  ─ GET /registry/:propId */
router.get('/:propId', authGuard, async (req, res) => {
  const snap = await Registry
    .findOne({ property: req.params.propId })
    .sort({ fetchedAt: -1 });
  if (!snap) return res.status(404).json({ msg: 'no snapshot' });
  res.json(snap);
});

/* 변동 이력 조회 ─ GET /registry/:propId/events */
router.get('/:propId/events', authGuard, async (req, res) => {
  const list = await RegistryEvent
    .find({ property: req.params.propId })
    .sort({ detectedAt: -1 });
  res.json(list);
});

/* 수동 갱신 ─ POST /registry/:propId/refresh  (디버그용) */
router.post('/:propId/refresh', authGuard, async (req, res: Response) => {
    const prop = await Registry.populate(req.params.propId, { path: 'property' });
    if (!prop) return res.status(404).json({ msg: 'property not found' });

    const { addressBasic } = (prop as any).property;
    const data = process.env.REGISTRY_API_KEY
      ? await fetchRegistry(addressBasic)
      : await fetchRegistryStub(addressBasic);

    res.json({ fetched: data.hash });
  });

export default router;
