const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const total = new Map();

/* ================= ROUTES ================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/total", (req, res) => {
  const data = Array.from(total.entries()).map(([sid, v], i) => ({
    session: i + 1,
    sessionId: sid,
    url: v.url,
    postId: v.id,
    count: v.count,
    target: v.target,
    status: v.status
  }));
  res.json(data);
});

app.post("/api/submit", async (req, res) => {
  const { cookie, url, amount, interval } = req.body;

  if (!cookie || !url || !amount || !interval) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const cookies = await convertCookie(cookie);
    share(cookies, url, Number(amount), Number(interval));
    res.json({ status: "started" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= SHARE ENGINE ================= */

async function share(cookies, url, amount, interval) {
  const postId = await getPostID(url);
  if (!postId) throw new Error("Invalid or private post");

  const accessToken = await getAccessToken(cookies);
  if (!accessToken) throw new Error("Failed to get access token");

  const sessionId = crypto.randomUUID();

  total.set(sessionId, {
    url,
    id: postId,
    count: 0,
    target: amount,
    status: "running"
  });

  const api = axios.create({
    baseURL: "https://graph.facebook.com",
    timeout: 15000,
    headers: {
      cookie: cookies,
      accept: "*/*",
      connection: "keep-alive"
    }
  });

  let shared = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  while (shared < amount) {
    try {
      const res = await api.post("/me/feed", null, {
        params: {
          link: `https://m.facebook.com/${postId}`,
          published: 0,
          access_token: accessToken
        }
      });

      if (res.status === 200) {
        shared++;
        total.get(sessionId).count = shared;
      }

      const jitter = Math.random() * 600;
      await sleep(interval * 1000 + jitter);

    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error?.message;

      console.error("SHARE ERROR:", status, msg);

      if (status === 429 || status === 368) {
        total.get(sessionId).status = "rate-limited";
        await sleep(interval * 3000);
        continue;
      }

      if (status === 400 || status === 403) {
        total.get(sessionId).status = "token-expired";
        break;
      }

      await sleep(interval * 2000);
    }
  }

  total.get(sessionId).status = "finished";
}

/* ================= HELPERS ================= */

async function getPostID(url) {
  try {
    const res = await axios.post(
      "https://id.traodoisub.com/api.php",
      `link=${encodeURIComponent(url)}`,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return res.data?.id;
  } catch {
    return null;
  }
}

async function getAccessToken(cookie) {
  try {
    const res = await axios.get(
      "https://business.facebook.com/content_management",
      {
        headers: {
          cookie,
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          accept: "text/html"
        }
      }
    );

    const match = res.data.match(/"accessToken":"(.*?)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function convertCookie(cookie) {
  try {
    const appstate = JSON.parse(cookie);
    const sb = appstate.find(c => c.key === "sb");
    if (!sb) throw new Error();

    return appstate.map(c => `${c.key}=${c.value}`).join("; ");
  } catch {
    throw new Error("Invalid appstate cookie");
  }
}

/* ================= START ================= */

app.listen(5000, () => {
  console.log("Share-Boost running on http://localhost:5000");
});