import { Router } from "express";
import pg from "pg";
import { logger } from "../lib/logger";

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const useSSL = connectionString?.includes('neon.tech') || connectionString?.includes('sslmode=require');

const pool = new pg.Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

const router = Router();

router.get("/admin/stats", async (req, res) => {
  try {
    const [users, posts, reports, chats] = await Promise.all([
      pool.query('SELECT COUNT(*) as count, AVG(trust_score) as avg_trust FROM suno_users'),
      pool.query('SELECT COUNT(*) as count FROM suno_posts'),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'Pending') as pending FROM suno_reports`),
      pool.query('SELECT COUNT(*) as count FROM suno_chats'),
    ]);

    const bannedCount = await pool.query(`SELECT COUNT(*) as count FROM suno_users WHERE offense_status = 'banned'`);
    const premiumCount = await pool.query(`SELECT COUNT(*) as count FROM suno_users WHERE payment_details->>'isPremiumSignedUp' = 'true'`);
    const todayUsers = await pool.query(`SELECT COUNT(*) as count FROM suno_users WHERE uid LIKE 'usr_%'`);

    res.json({
      users: parseInt(users.rows[0].count),
      avgTrustScore: parseFloat(users.rows[0].avg_trust || '100').toFixed(1),
      posts: parseInt(posts.rows[0].count),
      totalReports: parseInt(reports.rows[0].total),
      pendingReports: parseInt(reports.rows[0].pending),
      totalChats: parseInt(chats.rows[0].count),
      bannedUsers: parseInt(bannedCount.rows[0].count),
      premiumUsers: parseInt(premiumCount.rows[0].count),
    });
  } catch (err: any) {
    logger.error({ err }, "Error fetching admin stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/admin/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT uid, nickname, avatar, gender, city, trust_score, offense_status, offense_count,
             phone_number, is_admin, voice_verified, payment_details, language, country,
             interests, age_range
      FROM suno_users ORDER BY trust_score ASC, offense_count DESC
    `);
    res.json({
      users: result.rows.map((r: any) => ({
        uid: r.uid,
        nickname: r.nickname,
        avatar: r.avatar,
        gender: r.gender,
        city: r.city,
        trustScore: r.trust_score,
        offenseStatus: r.offense_status,
        offenseCount: r.offense_count,
        phoneNumber: r.phone_number,
        isAdmin: r.is_admin,
        voiceVerified: r.voice_verified,
        isPremium: r.payment_details?.isPremiumSignedUp === true,
        language: r.language,
        country: r.country,
        interests: r.interests || [],
        ageRange: r.age_range,
      }))
    });
  } catch (err: any) {
    logger.error({ err }, "Error fetching admin users");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.put("/admin/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { offenseStatus, offenseCount, trustScore, isAdmin } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (offenseStatus !== undefined) { updates.push(`offense_status = $${idx++}`); values.push(offenseStatus); }
    if (offenseCount !== undefined) { updates.push(`offense_count = $${idx++}`); values.push(offenseCount); }
    if (trustScore !== undefined) { updates.push(`trust_score = $${idx++}`); values.push(trustScore); }
    if (isAdmin !== undefined) { updates.push(`is_admin = $${idx++}`); values.push(isAdmin); }

    if (updates.length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

    values.push(uid);
    await pool.query(`UPDATE suno_users SET ${updates.join(', ')} WHERE uid = $${idx}`, values);
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Error updating user");
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/admin/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    await pool.query('DELETE FROM suno_users WHERE uid = $1', [uid]);
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Error deleting user");
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.delete("/admin/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM suno_posts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Error deleting post");
    res.status(500).json({ error: "Failed to delete post" });
  }
});

router.get("/admin/posts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, room_id, author_nickname, author_avatar, content, timestamp,
             author_trust_score, replies
      FROM suno_posts ORDER BY timestamp DESC LIMIT 100
    `);
    res.json({
      posts: result.rows.map((r: any) => ({
        id: r.id,
        roomId: r.room_id,
        authorNickname: r.author_nickname,
        authorAvatar: r.author_avatar,
        content: r.content,
        timestamp: r.timestamp,
        authorTrustScore: r.author_trust_score,
        replyCount: (r.replies || []).length,
      }))
    });
  } catch (err: any) {
    logger.error({ err }, "Error fetching admin posts");
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.put("/admin/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE suno_reports SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Error updating report");
    res.status(500).json({ error: "Failed to update report" });
  }
});

export default router;
