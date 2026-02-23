
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

console.log('Available Environment Variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('URL') || key.includes('KEY') || key.includes('DB') || key.includes('PASS')) {
    console.log(key);
  }
});
