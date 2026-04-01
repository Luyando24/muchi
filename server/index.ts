import express from 'express';
import cors from 'cors';

// Import Routes
import { authRouter } from './routes/auth.js';
import { schoolRouter } from './routes/schools.js';
import { userRouter } from './routes/users.js';
import { infrastructureRouter } from './routes/infrastructure.js';
import { adminRouter } from './routes/admin.js';
import { schoolAdminRouter } from './routes/school.js';
import { studentRouter } from './routes/student.js';
import { teacherRouter } from './routes/teacher.js';
import { websiteRouter } from './routes/website.js';
import { feedingProgramRouter } from './routes/feeding-program.js';
import { governmentPortalRouter } from './routes/government-portal.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/schools', schoolRouter);
app.use('/api/users', userRouter);
app.use('/api/infrastructure', infrastructureRouter);
app.use('/api/admin', adminRouter);
app.use('/api/school', schoolAdminRouter);
app.use('/api/student', studentRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/school', websiteRouter);
app.use('/api/school/feeding-program', feedingProgramRouter);
app.use('/api/government', governmentPortalRouter);
// The requirement says "Add a new module to school admin portal", 
// usually /api/school is for school admin portal. 
// Let's use /api/school/website as a prefix or just add to /api/school.
// Looking at the implementation of websiteRouter, it uses paths like /website-content.
// So app.use('/api/school', websiteRouter) will result in /api/school/website-content. Perfect.

// Basic health check route
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Demo endpoint
app.get('/api/demo', (req, res) => {
  res.json({
    message: 'Hello from the backend!',
    status: 'success'
  });
});

// If running directly (not via Vercel), start the server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
