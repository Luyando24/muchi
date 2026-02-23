
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const keys = envContent.split('\n').map(line => line.split('=')[0].trim()).filter(Boolean);

console.log('Environment variables keys:', keys);
