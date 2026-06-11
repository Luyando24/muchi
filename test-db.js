import dotenv from 'dotenv';
dotenv.config();

console.log("Start");
console.log("URL:", process.env.VITE_SUPABASE_URL);
console.log("Key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);