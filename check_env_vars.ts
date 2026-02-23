
import dotenv from 'dotenv';
dotenv.config();

const keys = Object.keys(process.env);
const connectionStrings = keys.filter(key => {
  const value = process.env[key];
  return value && (value.startsWith('postgres://') || value.startsWith('postgresql://'));
});

console.log('Found connection strings in env vars:', connectionStrings);
