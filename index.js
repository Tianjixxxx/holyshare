const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// serve frontend
app.use(express.static("public"));

const uaList = [
  "Mozilla/5.0 Android",
  "Mozilla/5.0 iPhone",
  "Mozilla/5.0 Chrome"
];

// mock token extractor
async function extractToken(cookie) {
  if (!cookie.includes("c_user")) return null;
  return "EAAG-MOCK-TOKEN-123456";
}

// mock share function
async function sharePost(token, link, n, start) {
  await new Promise(r => setTimeout(r, 300));
  return {
    n,
    status: "success",
    time: Math.floor((Date.now() - start) / 1000)
  };
}

app.get("/api/start", async (req, res) => {
  try {
    const { cookie, link, limit } = req.query;

    if (!cookie || !link || !limit) {
      return res.status(400).json({
        status: false,
        message: "Missing parameters"
      });
    }

    const ua = uaList[Math.floor(Math.random() * uaList.length)];
    const token = await extractToken(cookie);

    if (!token) {
      return res.status(400).json({
        status: false,
        message: "Invalid cookie"
      });
    }

    const tries = Number(limit);
    const start = Date.now();
    let results = [];

    for (let i = 1; i <= tries; i++) {
      results.push(await sharePost(token, link, i, start));
    }

    res.json({
      status: true,
      message: `Shared ${results.length} times (demo)`,
      ua,
      results
    });

  } catch (e) {
    res.status(500).json({
      status: false,
      error: e.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});