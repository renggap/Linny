import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (parent of server/).
// This file MUST be the first import in server/index.ts so that all
// transitively-imported modules (auth/jwt.ts, config/index.ts) see the
// populated process.env when they evaluate.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
