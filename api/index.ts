// api/index.ts ― Vercel Serverless entry
import { app } from '../backend/src/app';   // ← 이미 export 해둔 Express 앱

// Vercel 은 default export 로  (req, res) => void  함수를 요구합니다.
export default app;
