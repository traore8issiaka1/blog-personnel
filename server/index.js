import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, query } from "./db.js";
import { requireAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "dev_secret";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const allowedOrigins = new Set([frontendUrl, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (/^http:\/\/localhost:517\d$/.test(origin)) return callback(null, true);
      return callback(new Error("Origine non autorisee par CORS"));
    },
  })
);
app.use(express.json());

function toUserDTO(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    friendIds: row.friend_ids || [],
    blockedUserIds: row.blocked_user_ids || [],
  };
}

function toArticleDTO(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    content: row.content,
    isPublic: row.is_public,
    allowComments: row.allow_comments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCommentDTO(row) {
  return {
    id: row.id,
    articleId: row.article_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function toRequestDTO(row) {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function isBlocked(userA, userB) {
  const { rows } = await query(
    `SELECT 1
     FROM blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [userA, userB]
  );
  return rows.length > 0;
}

async function areFriends(userA, userB) {
  const { rows } = await query(
    `SELECT 1
     FROM friendships
     WHERE user_id = $1 AND friend_id = $2
     LIMIT 1`,
    [userA, userB]
  );
  return rows.length > 0;
}

async function canViewArticle(articleId, viewerId) {
  const { rows } = await query(
    `SELECT id, author_id, is_public
     FROM articles
     WHERE id = $1
     LIMIT 1`,
    [articleId]
  );
  const article = rows[0];
  if (!article) return false;
  if (article.author_id === viewerId) return true;
  if (!article.is_public) return false;
  if (await isBlocked(article.author_id, viewerId)) return false;
  return areFriends(article.author_id, viewerId);
}

async function getStateForUser(userId) {
  const usersRes = await query(
    `SELECT
       u.id,
       u.name,
       u.username,
       COALESCE(
         ARRAY(
           SELECT f.friend_id
           FROM friendships f
           WHERE f.user_id = u.id
         ),
         ARRAY[]::uuid[]
       ) AS friend_ids,
       COALESCE(
         ARRAY(
           SELECT b.blocked_id
           FROM blocks b
           WHERE b.blocker_id = u.id
         ),
         ARRAY[]::uuid[]
       ) AS blocked_user_ids
     FROM users u
     ORDER BY u.created_at ASC`
  );

  const requestsRes = await query(
    `SELECT id, from_user_id, to_user_id, status, created_at
     FROM friend_requests
     WHERE from_user_id = $1 OR to_user_id = $1`,
    [userId]
  );

  const articlesRes = await query(
    `SELECT a.id, a.author_id, a.title, a.content, a.is_public, a.allow_comments, a.created_at, a.updated_at
     FROM articles a
     WHERE
       a.author_id = $1
       OR (
         a.is_public = true
         AND EXISTS (
           SELECT 1 FROM friendships f WHERE f.user_id = $1 AND f.friend_id = a.author_id
         )
         AND NOT EXISTS (
           SELECT 1
           FROM blocks b
           WHERE (b.blocker_id = $1 AND b.blocked_id = a.author_id)
              OR (b.blocker_id = a.author_id AND b.blocked_id = $1)
         )
       )
     ORDER BY a.updated_at DESC`,
    [userId]
  );

  const articleIds = articlesRes.rows.map((article) => article.id);
  const commentsRes =
    articleIds.length === 0
      ? { rows: [] }
      : await query(
          `SELECT c.id, c.article_id, c.author_id, c.content, c.created_at
           FROM comments c
           WHERE c.article_id = ANY($1::uuid[])
           ORDER BY c.created_at ASC`,
          [articleIds]
        );

  return {
    users: usersRes.rows.map(toUserDTO),
    friendRequests: requestsRes.rows.map(toRequestDTO),
    articles: articlesRes.rows.map(toArticleDTO),
    comments: commentsRes.rows.map(toCommentDTO),
  };
}

app.get("/api/health", async (_, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, username, password } = req.body || {};
  const safeName = String(name || "").trim();
  const safeUsername = String(username || "").trim().toLowerCase();
  const safePassword = String(password || "").trim();

  if (!safeName || !safeUsername || !safePassword) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  try {
    const duplicate = await query(`SELECT 1 FROM users WHERE username = $1 LIMIT 1`, [safeUsername]);
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ error: "Ce nom utilisateur existe deja." });
    }

    const passwordHash = await bcrypt.hash(safePassword, 10);
    const { rows } = await query(
      `INSERT INTO users (name, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [safeName, safeUsername, passwordHash]
    );

    const token = jwt.sign({ userId: rows[0].id }, jwtSecret, { expiresIn: "7d" });
    return res.status(201).json({ token });
  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  const safeUsername = String(username || "").trim().toLowerCase();
  const safePassword = String(password || "").trim();

  try {
    const { rows } = await query(
      `SELECT id, password_hash
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [safeUsername]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Identifiants invalides." });

    const valid = await bcrypt.compare(safePassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Identifiants invalides." });

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });
    return res.json({ token });
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/api/state", requireAuth, async (req, res) => {
  try {
    const state = await getStateForUser(req.userId);
    return res.json(state);
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/api/friends/requests", requireAuth, async (req, res) => {
  const targetUserId = String(req.body?.targetUserId || "");
  const me = req.userId;
  if (!targetUserId || targetUserId === me) {
    return res.status(400).json({ error: "Action impossible." });
  }

  try {
    const exists = await query(`SELECT 1 FROM users WHERE id = $1`, [targetUserId]);
    if (exists.rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable." });
    if (await isBlocked(me, targetUserId)) {
      return res.status(400).json({ error: "Impossible: un blocage existe entre ces comptes." });
    }
    if (await areFriends(me, targetUserId)) {
      return res.status(400).json({ error: "Vous etes deja amis." });
    }

    const duplicate = await query(
      `SELECT 1
       FROM friend_requests
       WHERE status = 'pending'
         AND (
           (from_user_id = $1 AND to_user_id = $2)
           OR
           (from_user_id = $2 AND to_user_id = $1)
         )`,
      [me, targetUserId]
    );
    if (duplicate.rows.length > 0) return res.status(400).json({ error: "Une demande existe deja." });

    await query(
      `INSERT INTO friend_requests (from_user_id, to_user_id, status)
       VALUES ($1, $2, 'pending')`,
      [me, targetUserId]
    );
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/api/friends/requests/:id/respond", requireAuth, async (req, res) => {
  const requestId = req.params.id;
  const accept = Boolean(req.body?.accept);
  const me = req.userId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const requestRes = await client.query(
      `SELECT id, from_user_id, to_user_id, status
       FROM friend_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );
    const request = requestRes.rows[0];
    if (!request || request.to_user_id !== me || request.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Demande invalide." });
    }

    if (accept) {
      await client.query(
        `INSERT INTO friendships (user_id, friend_id)
         VALUES ($1, $2), ($2, $1)
         ON CONFLICT DO NOTHING`,
        [request.from_user_id, request.to_user_id]
      );
    }

    await client.query(`UPDATE friend_requests SET status = $1 WHERE id = $2`, [
      accept ? "accepted" : "rejected",
      requestId,
    ]);
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Erreur serveur." });
  } finally {
    client.release();
  }
});

app.post("/api/friends/remove", requireAuth, async (req, res) => {
  const friendId = String(req.body?.friendId || "");
  const me = req.userId;
  if (!friendId) return res.status(400).json({ error: "Ami invalide." });

  try {
    await query(
      `DELETE FROM friendships
       WHERE (user_id = $1 AND friend_id = $2)
          OR (user_id = $2 AND friend_id = $1)`,
      [me, friendId]
    );
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/api/friends/block", requireAuth, async (req, res) => {
  const targetUserId = String(req.body?.targetUserId || "");
  const me = req.userId;
  if (!targetUserId || targetUserId === me) return res.status(400).json({ error: "Action impossible." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO blocks (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [me, targetUserId]
    );
    await client.query(
      `DELETE FROM friendships
       WHERE (user_id = $1 AND friend_id = $2)
          OR (user_id = $2 AND friend_id = $1)`,
      [me, targetUserId]
    );
    await client.query(
      `DELETE FROM friend_requests
       WHERE (from_user_id = $1 AND to_user_id = $2)
          OR (from_user_id = $2 AND to_user_id = $1)`,
      [me, targetUserId]
    );
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Erreur serveur." });
  } finally {
    client.release();
  }
});

app.post("/api/friends/unblock", requireAuth, async (req, res) => {
  const targetUserId = String(req.body?.targetUserId || "");
  const me = req.userId;
  if (!targetUserId) return res.status(400).json({ error: "Utilisateur invalide." });

  try {
    await query(`DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`, [me, targetUserId]);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/api/articles", requireAuth, async (req, res) => {
  const me = req.userId;
  const title = String(req.body?.title || "").trim();
  const content = String(req.body?.content || "").trim();
  const isPublic = Boolean(req.body?.isPublic);
  const allowComments = Boolean(req.body?.allowComments);
  if (!title || !content) return res.status(400).json({ error: "Titre et contenu obligatoires." });

  try {
    await query(
      `INSERT INTO articles (author_id, title, content, is_public, allow_comments)
       VALUES ($1, $2, $3, $4, $5)`,
      [me, title, content, isPublic, allowComments]
    );
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.put("/api/articles/:id", requireAuth, async (req, res) => {
  const articleId = req.params.id;
  const me = req.userId;
  const title = String(req.body?.title || "").trim();
  const content = String(req.body?.content || "").trim();
  const isPublic = Boolean(req.body?.isPublic);
  const allowComments = Boolean(req.body?.allowComments);
  if (!title || !content) return res.status(400).json({ error: "Titre et contenu obligatoires." });

  try {
    const updated = await query(
      `UPDATE articles
       SET title = $1,
           content = $2,
           is_public = $3,
           allow_comments = $4,
           updated_at = NOW()
       WHERE id = $5 AND author_id = $6`,
      [title, content, isPublic, allowComments, articleId, me]
    );
    if (updated.rowCount === 0) return res.status(404).json({ error: "Article introuvable." });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.delete("/api/articles/:id", requireAuth, async (req, res) => {
  const articleId = req.params.id;
  const me = req.userId;
  try {
    const deleted = await query(`DELETE FROM articles WHERE id = $1 AND author_id = $2`, [articleId, me]);
    if (deleted.rowCount === 0) return res.status(404).json({ error: "Article introuvable." });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/api/articles/:id/comments", requireAuth, async (req, res) => {
  const articleId = req.params.id;
  const me = req.userId;
  const content = String(req.body?.content || "").trim();
  if (!content) return res.status(400).json({ error: "Commentaire vide." });

  try {
    const articleRes = await query(
      `SELECT id, author_id, allow_comments
       FROM articles
       WHERE id = $1`,
      [articleId]
    );
    const article = articleRes.rows[0];
    if (!article) return res.status(404).json({ error: "Article introuvable." });
    if (!article.allow_comments) return res.status(400).json({ error: "Commentaires desactives." });
    if (!(await canViewArticle(articleId, me))) {
      return res.status(403).json({ error: "Vous ne pouvez pas commenter cet article." });
    }

    await query(
      `INSERT INTO comments (article_id, author_id, content)
       VALUES ($1, $2, $3)`,
      [articleId, me, content]
    );
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.use((_, res) => res.status(404).json({ error: "Route introuvable." }));

app.listen(port, () => {
  console.log(`API en ligne sur http://localhost:${port}`);
});
