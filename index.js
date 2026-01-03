const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve index.html ONLY (no public folder)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const uaList = [
  "Mozilla/5.0 (Linux; Android 10) Chrome/105.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11) Chrome/87.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11) Chrome/106.0 Mobile Safari/537.36"
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
    if (!k || !v.length) return;
    out[k.trim()] = v.join("=").trim();
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
          .map(x => x.join("="))
          .join("; ")
      },
      timeout: 15000
    }
  );

  return res.data?.id;
}

// API
app.post("/fb-share", async (req, res) => {
  const { cookie, link, limit } = req.body;

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
      message: "Token extraction failed (invalid cookie)"
    });
  }

  const cookiesObj = parseCookiesToObject(cookie);
  const total = Number(limit);
  let success = 0;

  for (let i = 0; i < total; i++) {
    try {
      const id = await sharePost(token, cookiesObj, link, ua);
      if (id) success++;
    } catch {}
  }

  res.json({
    status: true,
    message: `Successfully shared ${success}/${total} times`,
    success
  });
});

app.listen(3000, () => {
  console.log("✅ Running at http://localhost:3000");
});