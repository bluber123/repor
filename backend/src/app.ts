// src/app.ts
import express from 'express';
import cors from 'cors';
import YAML from 'yamljs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import type { Request, Response, RequestHandler } from 'express';

/* ── 라우터 모음 ─────────────────────────────── */
import agentRouter    from './routes/agent.routes';
import contractRouter from './routes/contract.routes';
import propertyRouter from './routes/property.routes';
import registryRouter from './routes/registry.routes';
import passRouter     from './routes/pass.routes';

/* ── 앱 생성 & 공통 미들웨어 ─────────────────── */
export const app = express();

app.use(express.json());
app.use(cors());

/* ── Swagger UI ─────────────────────────────── */
const yamlPath   = path.join(__dirname, '..', 'docs', 'openapi.yaml');
const swaggerDoc = YAML.load(yamlPath);

// serve 가 RequestHandler[] 타입인데, 타입 정의가 살짝 꼬여 있어 오류 발생 → 한 번만 캐스팅
app.use(
  '/api-docs',
  ...(swaggerUi.serve as unknown as RequestHandler[]),
  swaggerUi.setup(swaggerDoc) as unknown as RequestHandler
);

/* ── REST 라우트 ────────────────────────────── */
app.use('/agents',    agentRouter);
app.use('/contracts', contractRouter);
app.use('/properties', propertyRouter);
app.use('/registry',  registryRouter);
app.use('/pass',      passRouter);

/* ── 정적 파일 & 헬스 체크 ─────────────────── */
app.use('/public', express.static('public'));   // PDF 등 다운로드용
app.get('/health', (_req, res) => { res.send('OK'); });
