import { createServer } from '../server/index.js';
import serverless from 'serverless-http';

const app = createServer();

export default serverless(app);
