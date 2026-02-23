import { Router, Request, Response } from 'express';
import { ServerNode } from '../../shared/api';

const router = Router();

// GET /api/infrastructure
router.get('/', (req: Request, res: Response<{ nodes: ServerNode[], metrics: any }>) => {
  res.json({
    nodes: [],
    metrics: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: '0 B/s'
    }
  });
});

export const infrastructureRouter = router;
