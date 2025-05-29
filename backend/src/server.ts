// src/server.ts
import 'dotenv/config';
import mongoose from 'mongoose';

import { app } from './app';           // 👉 Express 설정 분리
import { connectMongo } from './config/mongo';

import { startRegistryCron } from './services/registrySync';
import { startAlertCron }    from './services/alertCron';

/* ── 메인 부트스트랩 ─────────────────────────── */
(async () => {
  /* 1. DB 연결 */
  await connectMongo();
  console.log('[DB] Mongo connected');
  console.log('[DB] using database =', mongoose.connection.db.databaseName);

  /* 2. HTTP 서버 가동 */
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`API up at :${PORT}`);
  });

  /* 3. 크론 작업 시작 (DB 연결 & 서버 listen 후) */
  startRegistryCron();
  startAlertCron();
})();
