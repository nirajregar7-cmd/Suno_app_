import { Router } from "express";
import pg from "pg";
import { logger } from "../lib/logger";
import { sendPushToUser } from "./push";

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const useSSL = connectionString?.includes('neon.tech') || connectionString?.includes('sslmode=require');

const neonPool = new pg.Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

async function initNeonTables() {
  await neonPool.query(`
    CREATE TABLE IF NOT EXISTS suno_likes (
      liker_id TEXT NOT NULL,
      liked_id TEXT NOT NULL,
      liker_nickname TEXT,
      liker_avatar TEXT,
      liker_gender TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (liker_id, liked_id)
    );
    CREATE TABLE IF NOT EXISTS suno_users (
      uid TEXT PRIMARY KEY,
      nickname TEXT,
      avatar TEXT,
      uploaded_photos JSONB DEFAULT '[]',
      city TEXT,
      is_admin BOOLEAN DEFAULT FALSE,
      age_range TEXT,
      gender TEXT,
      country TEXT DEFAULT 'India',
      language TEXT DEFAULT 'Hindi',
      interests JSONB DEFAULT '[]',
      bio TEXT,
      trust_score INTEGER DEFAULT 100,
      offense_count INTEGER DEFAULT 0,
      offense_status TEXT DEFAULT 'clear',
      phone_number TEXT,
      email TEXT,
      safety_settings JSONB DEFAULT '{}',
      voice_verified BOOLEAN DEFAULT FALSE,
      voice_verification JSONB,
      payment_details JSONB DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS suno_posts (
      id TEXT PRIMARY KEY,
      room_id TEXT,
      author_nickname TEXT,
      author_avatar TEXT,
      author_trust_score INTEGER DEFAULT 90,
      author_voice_verified BOOLEAN DEFAULT FALSE,
      content TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      poll JSONB,
      replies JSONB DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS suno_reports (
      id TEXT PRIMARY KEY,
      reported_user_nickname TEXT,
      reported_user_id TEXT,
      reporter_nickname TEXT,
      reason TEXT,
      evidence JSONB DEFAULT '[]',
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      status TEXT DEFAULT 'Pending'
    );
    CREATE TABLE IF NOT EXISTS suno_chats (
      id TEXT PRIMARY KEY,
      sender_id TEXT,
      receiver_id TEXT,
      content TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      is_voice BOOLEAN DEFAULT FALSE,
      voice_duration INTEGER,
      is_read BOOLEAN DEFAULT FALSE
    );
    ALTER TABLE suno_chats ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
    ALTER TABLE suno_users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
    ALTER TABLE suno_users ADD COLUMN IF NOT EXISTS premium_plan TEXT;
    ALTER TABLE suno_users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;
  `);
}

initNeonTables().catch(err => logger.error({ err }, "Failed to init Neon tables"));

const pool = neonPool;

const router = Router();

router.get("/db-diagnostic", async (req, res) => {
  try {
    const r = await pool.query(`SELECT current_database() as db, inet_server_addr() as host, count(*) as user_count FROM suno_users`);
    const connStr = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
    const hostMatch = connStr.match(/@([^/:]+)/);
    const dbHost = hostMatch ? hostMatch[1] : 'unknown';
    res.json({ db: r.rows[0].db, host: dbHost, userCount: r.rows[0].user_count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const COMMUNITIES = [
  {
    id: 'room_mental',
    name: 'Mental Wellness Hub',
    description: 'A safe anonymous space to share stress, anxiety, burnout, and emotional recovery journeys.',
    category: 'Mental Wellness',
    icon: 'Heart',
    posts: []
  },
  {
    id: 'room_relationships',
    name: 'Relationship Advice',
    description: 'Navigate love, heartbreak, family conflicts, and friendship boundaries with peer empathy.',
    category: 'Relationships',
    icon: 'Users',
    posts: []
  },
  {
    id: 'room_tech',
    name: 'Tech & Career Lounge',
    description: 'Tech career dilemmas, coding burnout, imposter syndrome, and interview stress.',
    category: 'Tech',
    icon: 'MessageCircle',
    posts: []
  },
  {
    id: 'room_startup',
    name: 'Entrepreneur Support',
    description: 'Startup struggles, founder loneliness, funding anxieties, and co-founder conflicts.',
    category: 'Entrepreneurship',
    icon: 'Sparkles',
    posts: []
  },
  {
    id: 'room_college',
    name: 'College Support Hub',
    description: 'Surviving final exam weeks, tuition struggles, dorm-life advice, and graduation dread.',
    category: 'College Life',
    icon: 'MessageCircle',
    posts: []
  },
  {
    id: 'room_fitness',
    name: 'Fitness & Wellness',
    description: 'Workout motivation, nutrition tips, body image struggles, and marathon prep.',
    category: 'Fitness',
    icon: 'Activity',
    posts: []
  }
];

router.get("/communities", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suno_posts ORDER BY timestamp DESC');
    const posts = result.rows.map((row: any) => ({
      id: row.id,
      roomId: row.room_id,
      authorNickname: row.author_nickname,
      authorAvatar: row.author_avatar,
      authorTrustScore: row.author_trust_score,
      authorVoiceVerified: row.author_voice_verified,
      content: row.content,
      timestamp: row.timestamp,
      poll: row.poll,
      replies: row.replies || []
    }));

    const communities = COMMUNITIES.map(room => ({
      ...room,
      posts: posts.filter((p: any) => p.roomId === room.id)
    }));

    res.json({ communities });
  } catch (err: any) {
    req.log.error({ err }, "Error fetching communities");
    res.status(500).json({ error: "Failed to fetch communities" });
  }
});

router.get("/db-users", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suno_users');
    const users = result.rows.map((row: any) => ({
      uid: row.uid,
      nickname: row.nickname,
      avatar: row.avatar,
      uploadedPhotos: row.uploaded_photos || [],
      city: row.city,
      isAdmin: row.is_admin,
      ageRange: row.age_range,
      gender: row.gender,
      country: row.country,
      language: row.language,
      interests: row.interests || [],
      bio: row.bio,
      trustScore: row.trust_score,
      offenseCount: row.offense_count,
      offenseStatus: row.offense_status,
      phoneNumber: row.phone_number,
      email: row.email,
      safetySettings: row.safety_settings || {},
      voiceVerified: row.voice_verified,
      voiceVerification: row.voice_verification,
      paymentDetails: row.payment_details || {},
      isPremium: row.is_premium && row.premium_expires_at ? new Date(row.premium_expires_at) > new Date() : false,
      premiumPlan: row.premium_plan,
      premiumExpiresAt: row.premium_expires_at,
    }));
    res.json({ users });
  } catch (err: any) {
    req.log.error({ err }, "Error fetching users");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/db-users", async (req, res) => {
  try {
    const user = req.body;
    if (!user.uid) { res.status(400).json({ error: "Missing user uid" }); return; }

    await pool.query(`
      INSERT INTO suno_users (
        uid, nickname, avatar, uploaded_photos, city, is_admin, age_range, gender, country, language, interests, bio, trust_score, offense_count, offense_status, phone_number, email, safety_settings, voice_verified, voice_verification, payment_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (uid) DO UPDATE SET
        nickname = EXCLUDED.nickname,
        avatar = EXCLUDED.avatar,
        uploaded_photos = EXCLUDED.uploaded_photos,
        city = EXCLUDED.city,
        is_admin = EXCLUDED.is_admin,
        age_range = EXCLUDED.age_range,
        gender = EXCLUDED.gender,
        country = EXCLUDED.country,
        language = EXCLUDED.language,
        interests = EXCLUDED.interests,
        bio = EXCLUDED.bio,
        trust_score = EXCLUDED.trust_score,
        offense_count = EXCLUDED.offense_count,
        offense_status = EXCLUDED.offense_status,
        phone_number = EXCLUDED.phone_number,
        email = EXCLUDED.email,
        safety_settings = EXCLUDED.safety_settings,
        voice_verified = EXCLUDED.voice_verified,
        voice_verification = EXCLUDED.voice_verification,
        payment_details = EXCLUDED.payment_details
    `, [
      user.uid, user.nickname, user.avatar,
      JSON.stringify(user.uploadedPhotos || []),
      user.city || '', !!user.isAdmin, user.ageRange || '18-24',
      user.gender || 'prefer-not-to-say', user.country || 'India',
      user.language || 'English', JSON.stringify(user.interests || []),
      user.bio || '', user.trustScore || 90, user.offenseCount || 0,
      user.offenseStatus || 'clear', user.phoneNumber || null,
      user.email || null, JSON.stringify(user.safetySettings || {}),
      !!user.voiceVerified, JSON.stringify(user.voiceVerification || null),
      JSON.stringify(user.paymentDetails || {})
    ]);

    res.json({ success: true, user });
  } catch (err: any) {
    req.log.error({ err }, "Error upserting user");
    res.status(500).json({ error: "Failed to save user" });
  }
});

router.get("/db-posts", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suno_posts ORDER BY timestamp DESC');
    const posts = result.rows.map((row: any) => ({
      id: row.id,
      roomId: row.room_id,
      authorNickname: row.author_nickname,
      authorAvatar: row.author_avatar,
      authorTrustScore: row.author_trust_score,
      authorVoiceVerified: row.author_voice_verified,
      content: row.content,
      timestamp: row.timestamp,
      poll: row.poll,
      replies: row.replies || []
    }));
    res.json({ posts });
  } catch (err: any) {
    req.log.error({ err }, "Error fetching posts");
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/db-posts", async (req, res) => {
  try {
    const post = req.body;
    if (!post.id || !post.roomId) { res.status(400).json({ error: "Missing post fields" }); return; }

    await pool.query(`
      INSERT INTO suno_posts (id, room_id, author_nickname, author_avatar, author_trust_score, author_voice_verified, content, timestamp, poll, replies)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      post.id, post.roomId, post.authorNickname, post.authorAvatar,
      post.authorTrustScore || 90, !!post.authorVoiceVerified,
      post.content, post.timestamp,
      JSON.stringify(post.poll || null), JSON.stringify(post.replies || [])
    ]);

    res.json({ success: true, post });
  } catch (err: any) {
    req.log.error({ err }, "Error inserting post");
    res.status(500).json({ error: "Failed to save post" });
  }
});

router.put("/db-posts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { replies, poll } = req.body;

    if (replies !== undefined && poll !== undefined) {
      await pool.query('UPDATE suno_posts SET replies = $1, poll = $2 WHERE id = $3',
        [JSON.stringify(replies), JSON.stringify(poll), id]);
    } else if (replies !== undefined) {
      await pool.query('UPDATE suno_posts SET replies = $1 WHERE id = $2',
        [JSON.stringify(replies), id]);
    } else if (poll !== undefined) {
      await pool.query('UPDATE suno_posts SET poll = $1 WHERE id = $2',
        [JSON.stringify(poll), id]);
    }
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Error updating post");
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.get("/db-reports", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suno_reports ORDER BY timestamp DESC');
    const reports = result.rows.map((row: any) => ({
      id: row.id,
      reportedUserNickname: row.reported_user_nickname,
      reportedUserId: row.reported_user_id,
      reporterNickname: row.reporter_nickname,
      reason: row.reason,
      evidence: row.evidence || [],
      timestamp: row.timestamp,
      status: row.status
    }));
    res.json({ reports });
  } catch (err: any) {
    req.log.error({ err }, "Error fetching reports");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.post("/db-reports", async (req, res) => {
  try {
    const report = req.body;
    if (!report.id) { res.status(400).json({ error: "Missing report id" }); return; }

    await pool.query(`
      INSERT INTO suno_reports (id, reported_user_nickname, reported_user_id, reporter_nickname, reason, evidence, timestamp, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      report.id, report.reportedUserNickname, report.reportedUserId,
      report.reporterNickname, report.reason,
      JSON.stringify(report.evidence || []),
      report.timestamp, report.status || 'Pending'
    ]);

    res.json({ success: true, report });
  } catch (err: any) {
    req.log.error({ err }, "Error inserting report");
    res.status(500).json({ error: "Failed to save report" });
  }
});

router.put("/db-reports/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    await pool.query('UPDATE suno_reports SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Error updating report");
    res.status(500).json({ error: "Failed to update report" });
  }
});

router.get("/chats", async (req, res) => {
  try {
    const { user1, user2 } = req.query as { user1: string; user2: string };
    if (!user1 || !user2) { res.status(400).json({ error: "Missing user ids" }); return; }

    // Resolve ALL UIDs for both users (handles old timestamp-based + new phone-based UIDs)
    async function allUidsFor(uid: string): Promise<string[]> {
      const row = await pool.query('SELECT phone_number FROM suno_users WHERE uid = $1 LIMIT 1', [uid]);
      if (!row.rows.length || !row.rows[0].phone_number) return [uid];
      const all = await pool.query('SELECT uid FROM suno_users WHERE phone_number = $1', [row.rows[0].phone_number]);
      return all.rows.map((r: any) => r.uid);
    }
    const [user1Uids, user2Uids] = await Promise.all([allUidsFor(user1), allUidsFor(user2)]);

    const result = await pool.query(
      `SELECT * FROM suno_chats
       WHERE (sender_id = ANY($1::text[]) AND receiver_id = ANY($2::text[]))
          OR (sender_id = ANY($2::text[]) AND receiver_id = ANY($1::text[]))
       ORDER BY timestamp ASC`,
      [user1Uids, user2Uids]
    );

    const user1UidSet = new Set(user1Uids);
    const chats = result.rows.map((row: any) => ({
      id: row.id,
      senderId: user1UidSet.has(row.sender_id) ? user1 : user2,
      senderNickname: '',
      content: row.content,
      timestamp: row.timestamp,
      moderated: false,
      isVoice: row.is_voice,
      voiceDuration: row.voice_duration,
      isRead: row.is_read ?? false
    }));

    res.json({ chats });
  } catch (err: any) {
    req.log.error({ err }, "Error fetching chats");
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

router.post("/chats", async (req, res) => {
  try {
    const { senderId, receiverId, content, timestamp, isVoice, voiceDuration } = req.body;
    if (!senderId || !receiverId || !content) { res.status(400).json({ error: "Missing fields" }); return; }

    const id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await pool.query(
      'INSERT INTO suno_chats (id, sender_id, receiver_id, content, timestamp, is_voice, voice_duration) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, senderId, receiverId, content, timestamp || new Date().toISOString(), !!isVoice, voiceDuration || null]
    );

    // Look up sender nickname for push payload
    const senderRow = await pool.query('SELECT nickname FROM suno_users WHERE uid = $1 LIMIT 1', [senderId]);
    const senderName = senderRow.rows[0]?.nickname || 'Someone';
    const pushBody = isVoice ? `🎙️ ${senderName} sent you a voice message` : content.length > 80 ? content.slice(0, 77) + '…' : content;

    // Fire-and-forget push to receiver
    sendPushToUser(receiverId, {
      title: `💬 ${senderName}`,
      body: pushBody,
      data: { senderId, receiverId }
    }).catch(() => {});

    res.json({ success: true, id });
  } catch (err: any) {
    req.log.error({ err }, "Error saving chat");
    res.status(500).json({ error: "Failed to save chat" });
  }
});

router.put("/chats/read", async (req, res) => {
  try {
    const { receiverId, senderId } = req.body;
    if (!receiverId || !senderId) { res.status(400).json({ error: "Missing fields" }); return; }

    // Resolve all UIDs for both parties
    async function allUidsFor(uid: string): Promise<string[]> {
      const row = await pool.query('SELECT phone_number FROM suno_users WHERE uid = $1 LIMIT 1', [uid]);
      if (!row.rows.length || !row.rows[0].phone_number) return [uid];
      const all = await pool.query('SELECT uid FROM suno_users WHERE phone_number = $1', [row.rows[0].phone_number]);
      return all.rows.map((r: any) => r.uid);
    }
    const [receiverUids, senderUids] = await Promise.all([allUidsFor(receiverId), allUidsFor(senderId)]);

    await pool.query(
      `UPDATE suno_chats SET is_read = TRUE
       WHERE receiver_id = ANY($1::text[]) AND sender_id = ANY($2::text[]) AND is_read = FALSE`,
      [receiverUids, senderUids]
    );

    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Error marking chats as read");
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

router.get("/inbox", async (req, res) => {
  const { uid } = req.query as { uid: string };
  if (!uid) { res.status(400).json({ error: "Missing uid" }); return; }
  try {
    // Step 1: Find ALL UIDs that belong to this user (old timestamp + new phone-based)
    const meRow = await pool.query(
      'SELECT phone_number FROM suno_users WHERE uid = $1 LIMIT 1', [uid]
    );
    let myUids: string[] = [uid];
    if (meRow.rows.length > 0 && meRow.rows[0].phone_number) {
      const allMine = await pool.query(
        'SELECT uid FROM suno_users WHERE phone_number = $1', [meRow.rows[0].phone_number]
      );
      myUids = allMine.rows.map((r: any) => r.uid);
    }

    // Step 2: Get all conversations involving any of my UIDs
    const result = await pool.query(`
      SELECT partner_id, content AS last_message, timestamp AS last_ts, is_incoming
      FROM (
        SELECT receiver_id AS partner_id, content, timestamp, false AS is_incoming
        FROM suno_chats WHERE sender_id = ANY($1::text[])
        UNION ALL
        SELECT sender_id AS partner_id, content, timestamp, true AS is_incoming
        FROM suno_chats WHERE receiver_id = ANY($1::text[])
      ) all_convs
      ORDER BY timestamp DESC
    `, [myUids]);

    // Step 3: Resolve each partner's old UID → their canonical (phone-based) UID
    const partnerUids = [...new Set(result.rows.map((r: any) => r.partner_id))];
    const canonicalMap = new Map<string, string>();
    if (partnerUids.length > 0) {
      const resolved = await pool.query(`
        SELECT u1.uid AS old_uid,
               COALESCE(u2.uid, u1.uid) AS canonical_uid
        FROM suno_users u1
        LEFT JOIN suno_users u2
          ON u2.phone_number = u1.phone_number
          AND u2.uid = CONCAT('usr_', REGEXP_REPLACE(u1.phone_number, '[^0-9]', '', 'g'))
        WHERE u1.uid = ANY($1::text[])
      `, [partnerUids]);
      for (const r of resolved.rows) { canonicalMap.set(r.old_uid, r.canonical_uid); }
    }

    // Step 4: Deduplicate by canonical partner UID, keep latest message, exclude self
    const myUidSet = new Set(myUids);
    const byPartner = new Map<string, any>();
    for (const row of result.rows) {
      const resolvedUid = canonicalMap.get(row.partner_id) || row.partner_id;
      if (myUidSet.has(resolvedUid)) continue; // skip self-conversations
      const existing = byPartner.get(resolvedUid);
      if (!existing || new Date(row.last_ts) > new Date(existing.timestamp)) {
        byPartner.set(resolvedUid, {
          senderId: resolvedUid,
          lastMessage: row.last_message,
          timestamp: row.last_ts,
          isIncoming: row.is_incoming
        });
      }
    }

    const conversations = Array.from(byPartner.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ conversations });
  } catch (err: any) {
    req.log.error({ err }, "Error fetching inbox");
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

// In-memory typing state: key = "senderId:receiverId", value = timestamp
const typingStore = new Map<string, number>();

router.post("/typing", (req, res) => {
  const { senderId, receiverId, isTyping } = req.body;
  if (!senderId || !receiverId) { res.status(400).json({ error: "Missing fields" }); return; }
  const key = `${senderId}:${receiverId}`;
  if (isTyping) {
    typingStore.set(key, Date.now());
  } else {
    typingStore.delete(key);
  }
  res.json({ ok: true });
});

router.get("/typing", (req, res) => {
  const { user1, user2 } = req.query as { user1: string; user2: string };
  if (!user1 || !user2) { res.status(400).json({ error: "Missing fields" }); return; }
  const key = `${user2}:${user1}`; // peer typing toward user
  const ts = typingStore.get(key);
  const isTyping = ts !== undefined && Date.now() - ts < 5000;
  if (ts && !isTyping) typingStore.delete(key);
  res.json({ isTyping });
});

router.post("/moderate-chat", async (req, res) => {
  try {
    const { messages, latestMessageContent, peerProfile } = req.body;

    const piiPattern = /(\b\d{10}\b|@[\w.]+|[\w.-]+@[\w.-]+\.\w+)/i;
    const severeViolators = ['kill yourself', 'i will kill', 'i know where you live', 'give me your address', 'blackmail'];
    const explicitWords = ['sex', 'nude', 'nudes', 'porn', 'sexy photos', 'body pics'];
    const textLower = (latestMessageContent || '').toLowerCase();

    let moderationResult = { isViolating: false, reason: '', severity: 'none', explanation: '' };

    if (piiPattern.test(latestMessageContent || '')) {
      moderationResult = { isViolating: true, reason: 'PII Sharing', severity: 'mild', explanation: 'Sharing contact details violates safety guidelines.' };
    } else if (severeViolators.some(word => textLower.includes(word))) {
      moderationResult = { isViolating: true, reason: 'Abuse/Threats', severity: 'severe', explanation: 'Direct threats detected.' };
    } else if (explicitWords.some(word => textLower.includes(word))) {
      moderationResult = { isViolating: true, reason: 'Sexual Harassment/Explicit content', severity: 'mild', explanation: 'Explicit content is prohibited.' };
    }

    if (moderationResult.isViolating) {
      res.json({
        moderated: true,
        safetyVerdict: moderationResult,
        reply: `[System Moderation Alert: This message was flagged for ${moderationResult.reason}.]`
      });
      return;
    }

    const fallbackReplies = [
      "Thank you for sharing that with me. It takes courage to open up. How has this been affecting your daily routine?",
      "I hear you. You don't have to carry this alone. What's one small step you could take today?",
      "That sounds really tough. I'm here to listen. Can you tell me more about what's been happening?",
      "I completely understand. These feelings are valid. How long have you been experiencing this?",
      "I appreciate you trusting me with this. Let's work through it together. What support do you need most right now?"
    ];

    const index = Math.min(Math.floor((messages?.length || 0) / 2), fallbackReplies.length - 1);
    const reply = fallbackReplies[index];

    await new Promise(resolve => setTimeout(resolve, 800));

    res.json({ moderated: false, reply });
  } catch (err: any) {
    req.log.error({ err }, "Error in moderation");
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// POST /api/likes — like or unlike a peer
router.post('/likes', async (req, res) => {
  try {
    const { likerId, likedId, likerNickname, likerAvatar, likerGender, action } = req.body;
    if (!likerId || !likedId) return res.status(400).json({ error: 'Missing fields' });

    if (action === 'unlike') {
      await pool.query('DELETE FROM suno_likes WHERE liker_id=$1 AND liked_id=$2', [likerId, likedId]);
      return res.json({ ok: true, action: 'unliked' });
    }

    await pool.query(
      `INSERT INTO suno_likes (liker_id, liked_id, liker_nickname, liker_avatar, liker_gender)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (liker_id, liked_id) DO NOTHING`,
      [likerId, likedId, likerNickname || '', likerAvatar || '', likerGender || '']
    );
    res.json({ ok: true, action: 'liked' });
  } catch (err: any) {
    req.log.error({ err }, 'Error saving like');
    res.status(500).json({ error: 'Failed to save like' });
  }
});

// GET /api/likes/received/:userId — who liked this user
router.get('/likes/received/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT liker_id, liker_nickname, liker_avatar, liker_gender, created_at
       FROM suno_likes WHERE liked_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    res.json({ likers: result.rows });
  } catch (err: any) {
    req.log.error({ err }, 'Error fetching received likes');
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});

// GET /api/likes/sent/:userId — who this user liked
router.get('/likes/sent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT liked_id FROM suno_likes WHERE liker_id=$1`,
      [userId]
    );
    res.json({ liked: result.rows.map((r: any) => r.liked_id) });
  } catch (err: any) {
    req.log.error({ err }, 'Error fetching sent likes');
    res.status(500).json({ error: 'Failed to fetch sent likes' });
  }
});

export default router;
