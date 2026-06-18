import { Router } from "express";
import pg from "pg";
import { logger } from "../lib/logger";

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const useSSL = connectionString?.includes('neon.tech') || connectionString?.includes('sslmode=require');
const pool = new pg.Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: 3,
});

const router = Router();

const CF_APP_ID = process.env.CASHFREE_APP_ID || '';
const CF_SECRET = process.env.CASHFREE_SECRET_KEY || '';
const CF_ENV = process.env.CASHFREE_ENV || 'sandbox';
const CF_BASE = CF_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const PLANS: Record<string, { amount: number; label: string; duration: number }> = {
  monthly: { amount: 99, label: 'Suno Plus Monthly', duration: 30 },
  yearly:  { amount: 799, label: 'Suno Plus Yearly', duration: 365 },
};

async function cfRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${CF_BASE}${path}`, {
    method,
    headers: {
      'x-client-id': CF_APP_ID,
      'x-client-secret': CF_SECRET,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cashfree ${method} ${path} failed: ${res.status} ${err}`);
  }
  return res.json();
}

router.post('/cashfree/create-order', async (req, res) => {
  try {
    const { uid, plan, phoneNumber, nickname } = req.body;
    if (!uid || !plan || !PLANS[plan]) {
      res.status(400).json({ error: 'Missing uid or invalid plan' });
      return;
    }
    if (!CF_APP_ID || !CF_SECRET) {
      res.status(503).json({ error: 'Payment gateway not configured yet. Please add Cashfree keys.' });
      return;
    }

    const orderId = `suno_${uid.replace(/[^a-z0-9]/gi, '')}_${Date.now()}`;
    const planInfo = PLANS[plan];
    const phone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:8080';

    const order = await cfRequest('POST', '/orders', {
      order_id: orderId,
      order_amount: planInfo.amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: uid,
        customer_name: nickname || 'Suno User',
        customer_phone: phone || '9999999999',
      },
      order_meta: {
        return_url: `${baseUrl}/api/cashfree/return?order_id=${orderId}&uid=${uid}&plan=${plan}`,
        notify_url: `${baseUrl}/api/cashfree/webhook`,
      },
    });

    await pool.query(
      `UPDATE suno_users SET payment_details = payment_details || $1 WHERE uid = $2`,
      [JSON.stringify({ pendingOrderId: orderId, pendingPlan: plan }), uid]
    );

    res.json({
      orderId,
      paymentSessionId: order.payment_session_id,
      amount: planInfo.amount,
      label: planInfo.label,
      env: CF_ENV,
    });
  } catch (err: any) {
    logger.error({ err }, 'Cashfree create-order error');
    res.status(500).json({ error: err.message });
  }
});

router.get('/cashfree/return', async (req, res) => {
  const { order_id, uid, plan } = req.query as Record<string, string>;
  try {
    if (!order_id || !uid || !plan) {
      res.redirect('/?payment=failed');
      return;
    }
    const data = await cfRequest('GET', `/orders/${order_id}`);
    if (data.order_status === 'PAID') {
      await activatePremium(uid, plan);
      res.redirect('/?payment=success&plan=' + plan);
    } else {
      res.redirect('/?payment=failed');
    }
  } catch (err: any) {
    logger.error({ err }, 'Cashfree return error');
    res.redirect('/?payment=failed');
  }
});

router.post('/cashfree/webhook', async (req, res) => {
  try {
    const event = req.body;
    if (event?.data?.order?.order_status === 'PAID') {
      const orderId: string = event.data.order.order_id;
      const row = await pool.query(
        `SELECT uid FROM suno_users WHERE payment_details->>'pendingOrderId' = $1 LIMIT 1`,
        [orderId]
      );
      if (row.rows[0]) {
        const uid = row.rows[0].uid;
        const plan = event.data.order.order_tags?.plan || 'monthly';
        await activatePremium(uid, plan);
      }
    }
    res.json({ received: true });
  } catch (err: any) {
    logger.error({ err }, 'Cashfree webhook error');
    res.status(400).json({ error: err.message });
  }
});

router.get('/cashfree/status/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const row = await pool.query(
      `SELECT is_premium, premium_plan, premium_expires_at FROM suno_users WHERE uid = $1`,
      [uid]
    );
    if (!row.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const u = row.rows[0];
    res.json({
      isPremium: u.is_premium && new Date(u.premium_expires_at) > new Date(),
      plan: u.premium_plan,
      expiresAt: u.premium_expires_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function activatePremium(uid: string, plan: string) {
  const days = PLANS[plan]?.duration || 30;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await pool.query(
    `UPDATE suno_users
     SET is_premium = TRUE, premium_plan = $1, premium_expires_at = $2,
         payment_details = payment_details || '{"isPremiumSignedUp": true}'
     WHERE uid = $3`,
    [plan, expiresAt.toISOString(), uid]
  );
  logger.info({ uid, plan, expiresAt }, 'Premium activated');
}

export default router;
