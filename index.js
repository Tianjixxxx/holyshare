const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== USER AGENTS ===== */
const uaList = [
  "Mozilla/5.0 (Linux; Android 10) Chrome/105.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11) Chrome/87.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11) Chrome/106.0 Mobile Safari/537.36"
];

/* ===== SERVE INDEX.HTML ===== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ===== HELPERS ===== */
async function extractToken(cookie, ua) {
  try {
    const res = await axios.get(
      "https://business.facebook.com/business_locations",
      {
        headers: {
          "User-Agent": ua,
          "Referer": "https://www.facebook.com/",
          "Cookie": cookie
        },
        timeout: 15000
      }
    );

    const match = String(res.data).match(/(EAAG\w+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function parseCookiesToObject(cookie) {
  const out = {};
  cookie.split(";").forEach(p => {
    const [k, ...v] = p.split("=");
    if (!k || !v.length) return;
    out[k.trim()] = v.join("=").trim();
  });
  return out;
}

async function sharePost(token, cookiesObj, link, n, start, ua) {
  try {
    const body = qs.stringify({
      link,
      access_token: token
    });

    const res = await axios.post(
      "https://graph.facebook.com/v18.0/me/feed",
      body,
      {
        headers: {
          "User-Agent": ua,
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": Object.entries(cookiesObj)
            .map(x => x.join("="))
            .join("; ")
        }
      }
    );

    return res.data.id
      ? { n, status: "success", time: Math.floor((Date.now() - start) / 1000) }
      : { n, status: "failed" };
  } catch (e) {
    return { n, status: "error", message: e.message };
  }
}

/* ===== API ===== */
app.get("/fb-share", async (req, res) => {
  const { cookie, link, limit } = req.query;

  if (!cookie || !link || !limit) {
    return res.json({
      status: false,
      message: "Missing cookie, link, or limit"
    });
  }

  const ua = uaList[Math.floor(Math.random() * uaList.length)];
  const token = await extractToken(cookie, ua);

  if (!token) {
    return res.json({
      status: false,
      message: "Token extraction failed"
    });
  }

  const cookiesObj = parseCookiesToObject(cookie);
  const total = Number(limit);
  const start = Date.now();
  let results = [];

  for (let i = 1; i <= total; i++) {
    results.push(await sharePost(token, cookiesObj, link, i, start, ua));
  }

  res.json({
    status: true,
    success: results.filter(r => r.status === "success").length,
    results
  });
});

app.listen(PORT, () => {
  console.log("✅ Server running at http://localhost:" + PORT);
});