import { Router } from "express";
import webpush from "web-push";
import pg from "pg";
import { logger } from "../lib/logger";

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const useSSL = connectionString?.includes('neon.tech') || connectionString?.includes('sslmode=require');

const pool = new pg.Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

// VAPID key management — generate once at startup, reuse across requests
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (!vapidPublicKey || !vapidPrivateKey) {
  const keys = webpush.generateVAPIDKeys();
  vapidPublicKey = keys.publicKey;
  vapidPrivateKey = keys.privateKey;
  logger.warn(
    { publicKey: vapidPublicKey },
    'VAPID keys generated at runtime. Save VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as secrets to persist them across restarts.'
  );
}

webpush.setVapidDetails(
  'mailto:support@sunoindia.app',
  vapidPublicKey,
  vapidPrivateKey
);

// Ensure subscriptions table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS suno_push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, id)
  );
  CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON suno_push_subscriptions(user_id);
`).catch(err => logger.error({ err }, 'Failed to create push subscriptions table'));

const router = Router();

router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

router.post("/subscribe", async (req, res) => {
  try {
    const { userId, subscription } = req.body;
    if (!userId || !subscription?.endpoint) {
      res.status(400).json({ error: "Missing userId or subscription" });
      return;
    }

    const id = `sub_${Buffer.from(subscription.endpoint).toString('base64').slice(-12)}`;
    await pool.query(`
      INSERT INTO suno_push_subscriptions (id, user_id, subscription)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET subscription = EXCLUDED.subscription, user_id = EXCLUDED.user_id
    `, [id, userId, JSON.stringify(subscription)]);

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Error saving push subscription');
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

router.delete("/subscribe", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) { res.status(400).json({ error: "Missing userId" }); return; }
    await pool.query('DELETE FROM suno_push_subscriptions WHERE user_id = $1', [userId]);
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Error deleting push subscription');
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

export async function sendPushToUser(
  receiverId: string,
  payload: { title: string; body: string; icon?: string; data?: Record<string, any> }
): Promise<void> {
  try {
    const result = await pool.query(
      'SELECT subscription FROM suno_push_subscriptions WHERE user_id = $1',
      [receiverId]
    );
    if (!result.rows.length) return;

    const payloadStr = JSON.stringify(payload);
    await Promise.allSettled(
      result.rows.map(async (row) => {
        try {
          await webpush.sendNotification(row.subscription, payloadStr);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired — clean it up
            await pool.query('DELETE FROM suno_push_subscriptions WHERE user_id = $1 AND subscription = $2', [receiverId, row.subscription]);
          }
        }
      })
    );
  } catch (err) {
    logger.error({ err }, 'Error sending push notification');
  }
}

export default router;
