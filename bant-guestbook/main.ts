import { Hono } from "https://esm.sh/hono";
import sqlite from "https://esm.town/v/std/sqlite@14-main/main.ts";
import { blob } from "https://esm.town/v/std/blob";
import { email } from "https://esm.town/v/std/email";

const COMMENTS_TABLE = "bant_guestbook_comments_1";
const CANDLES_KEY = "bant_guestbook_candles";

await sqlite.execute(`CREATE TABLE IF NOT EXISTS ${COMMENTS_TABLE} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const app = new Hono();
app.onError((err) => Promise.reject(err));

app.get("/api/comments", async (c) => {
  const { rows } = await sqlite.execute(
    `SELECT author, body, created_at FROM ${COMMENTS_TABLE} ORDER BY created_at ASC`,
  );
  return c.json(rows);
});

app.post("/api/comments", async (c) => {
  const { author, body, born } = await c.req.json();

  if (String(born).trim() !== "2011") {
    return c.json({ error: "Incorrect answer" }, 400);
  }
  if (!author?.trim() || !body?.trim()) {
    return c.json({ error: "Name and message are required" }, 400);
  }

  await sqlite.execute(
    `INSERT INTO ${COMMENTS_TABLE} (author, body) VALUES (?, ?)`,
    [author.trim(), body.trim()],
  );

  await email({
    subject: `New guestbook message from ${author.trim()}`,
    text: body.trim(),
  });

  return c.json({ ok: true }, 201);
});

app.get("/api/candles", async (c) => {
  const count = (await blob.getJSON(CANDLES_KEY)) ?? 0;
  return c.json({ count });
});

app.post("/api/candles", async (c) => {
  const count = ((await blob.getJSON(CANDLES_KEY)) ?? 0) as number;
  await blob.setJSON(CANDLES_KEY, count + 1);
  return c.json({ count: count + 1 });
});

export default app.fetch;
