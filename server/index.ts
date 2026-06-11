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
import { financeRouter } from './routes/finance.js';
import { tuckshopRouter } from './routes/tuckshop.js';
import { contactRouter } from './routes/contact.js';
import { Logger } from './lib/logger.js';
import { requestLogger, errorLogger } from './middleware/logging.js';
import { CONFIG } from '../shared/config.js';
import { trackActiveUser } from './lib/activeUsers.js';

const app = express();
const port = CONFIG.server.port;

app.use(cors());
app.use(requestLogger);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Track active web traffic sessions
app.use((req, res, next) => {
  // Use authorization header token snippet or IP as identifier
  const authHeader = req.headers.authorization;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // We use the token signature/last part as a unique session identifier
    const tokenParts = authHeader.split('.');
    if (tokenParts.length === 3) {
      trackActiveUser(`user_session_${tokenParts[2]}`);
    } else {
      trackActiveUser(`ip_${ip}`);
    }
  } else {
    trackActiveUser(`ip_${ip}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/schools', schoolRouter);
app.use('/api/users', userRouter);
app.use('/api/infrastructure', infrastructureRouter);
app.use('/api/admin', adminRouter);
// Composed School Router
const schoolBaseRouter = express.Router();
schoolBaseRouter.use('/feeding-program', feedingProgramRouter);
schoolBaseRouter.use('/tuckshop', tuckshopRouter);
schoolBaseRouter.use('/', schoolAdminRouter);
schoolBaseRouter.use('/', websiteRouter);

app.use('/api/school', schoolBaseRouter);
app.use('/api/student', studentRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/government', governmentPortalRouter);
app.use('/api/finance', financeRouter);
// The requirement says "Add a new module to school admin portal", 
// usually /api/school is for school admin portal. 
// Let's use /api/school/website as a prefix or just add to /api/school.
// Looking at the implementation of websiteRouter, it uses paths like /website-content.
// So app.use('/api/school', websiteRouter) will result in /api/school/website-content. Perfect.

app.use('/api', contactRouter);

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

// Register global error logging middleware
app.use(errorLogger);

// If running directly (not via Vercel), start the server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    Logger.info(`Server running on port ${port}`);
  });
}

export default app;
