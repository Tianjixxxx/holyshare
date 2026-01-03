const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const uaList = [
  "Mozilla/5.0 (Linux; Android 10) Chrome/105.0 Mobile",
  "Mozilla/5.0 (Linux; Android 11) Chrome/87.0 Mobile",
  "Mozilla/5.0 (Linux; Android 11) Chrome/106.0 Mobile"
];

// extract EAAG token
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
    if (k && v.length) out[k.trim()] = v.join("=").trim();
  });
  return out;
}

async function sharePost(token, cookiesObj, link, ua) {
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
          .map(e => e.join("="))
          .join("; ")
      },
      timeout: 15000
    }
  );

  return res.data?.id ? true : false;
}

// API endpoint
app.post("/api/share", async (req, res) => {
  const { cookie, link, limit } = req.body;

  if (!cookie || !link || !limit) {
    return res.json({ status: false, message: "Missing fields" });
  }

  const ua = uaList[Math.floor(Math.random() * uaList.length)];
  const token = await extractToken(cookie, ua);

  if (!token) {
    return res.json({
      status: false,
      message: "Invalid or expired cookie"
    });
  }

  const cookiesObj = parseCookiesToObject(cookie);
  let success = 0;

  for (let i = 0; i < Number(limit); i++) {
    try {
      const ok = await sharePost(token, cookiesObj, link, ua);
      if (ok) success++;
      await new Promise(r => setTimeout(r, 1000));
    } catch {}
  }

  res.json({
    status: true,
    message: `Shared ${success} times`,
    success
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});