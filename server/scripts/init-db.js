import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { pool, query } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const schemaPath = path.resolve(__dirname, "../sql/schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await query(schemaSql);

  const { rows: existing } = await query("SELECT id, username FROM users");
  const byUsername = new Map(existing.map((user) => [user.username, user.id]));

  async function ensureUser(name, username, password) {
    if (byUsername.has(username)) {
      const existingId = byUsername.get(username);
      await query(`UPDATE users SET name = $1 WHERE id = $2`, [name, existingId]);
      return existingId;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name, username, passwordHash]
    );
    byUsername.set(username, rows[0].id);
    return rows[0].id;
  }

  const issiakaId = await ensureUser("issiaka traore", "issiaka", "pass123");
  const hawaId = await ensureUser("hawa traore", "hawa", "pass123");

  await query(
    `INSERT INTO friendships (user_id, friend_id)
     VALUES ($1, $2), ($2, $1)
     ON CONFLICT DO NOTHING`,
    [issiakaId, hawaId]
  );

  const { rows: articleRows } = await query(
    `SELECT id FROM articles WHERE author_id = $1 AND title = $2`,
    [hawaId, "Mon premier article public"]
  );

  let articleId = articleRows[0]?.id;
  if (!articleId) {
    const created = await query(
      `INSERT INTO articles (author_id, title, content, is_public, allow_comments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        hawaId,
        "Mon premier article public",
        "Bienvenue sur ce mini blog React. Cet article est visible par mes amis.",
        true,
        true,
      ]
    );
    articleId = created.rows[0].id;
  }

  const commentExists = await query(
    `SELECT 1
     FROM comments
     WHERE article_id = $1 AND author_id = $2 AND content = $3
     LIMIT 1`,
    [articleId, issiakaId, "Excellent debut."]
  );
  if (commentExists.rows.length === 0) {
    await query(
      `INSERT INTO comments (article_id, author_id, content)
       VALUES ($1, $2, $3)`,
      [articleId, issiakaId, "Excellent debut."]
    );
  }

  console.log("Base initialisee avec succes.");
}

main()
  .catch((error) => {
    console.error("Erreur init DB:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
