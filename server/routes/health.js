import { Router } from 'express';

const router = Router();

// Liveness only — must never touch the DB or any other downstream
// dependency, so a DB/API outage can't turn this into a 5xx (see
// server/src/app.js, which mounts this at both '/health' and '/api/health').
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
