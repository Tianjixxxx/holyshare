require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// User agents
const ua_list = [
    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/105.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/106.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/108.0 Mobile Safari/537.36"
];

// In-memory storage
const shareHistory = [];
const activeShares = new Map();

// Extract token
async function extract_token(cookie, ua, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios.get(
                "https://business.facebook.com/business_locations",
                {
                    headers: {
                        "user-agent": ua,
                        "cookie": cookie
                    },
                    timeout: 10000
                }
            );

            const match = res.data.match(/(EAAG\w+)/);
            if (match) return match[1];

        } catch (err) {
            if (i === retries - 1) return null;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

// Home
app.get("/", (req, res) => {
    res.render("index", {
        title: "Facebook Share Booster",
        mode: req.cookies?.theme || 'light'
    });
});

// Share API (POST)
app.post("/api/share", async (req, res) => {
    try {
        const { cookie, link, limit, session_id } = req.body;
        const amount = parseInt(limit);

        if (!cookie || !link || !amount) {
            return res.status(400).json({
                status: false,
                message: "Missing parameters"
            });
        }

        const sid = session_id || Date.now().toString();
        const ua = ua_list[Math.floor(Math.random() * ua_list.length)];

        activeShares.set(sid, {
            total: amount,
            completed: 0,
            status: 'processing',
            startTime: new Date(),
            url: link
        });

        const token = await extract_token(cookie, ua);
        if (!token) {
            activeShares.delete(sid);
            return res.status(401).json({
                status: false,
                message: "Token extraction failed"
            });
        }

        let success = 0;

        for (let i = 0; i < amount; i++) {
            try {
                await axios.post(
                    "https://graph.facebook.com/v18.0/me/feed",
                    null,
                    {
                        params: {
                            link,
                            access_token: token,
                            published: 0
                        },
                        headers: {
                            "user-agent": ua,
                            "cookie": cookie
                        }
                    }
                );

                success++;
                activeShares.set(sid, {
                    ...activeShares.get(sid),
                    completed: success
                });

            } catch {
                break;
            }
        }

        const history = {
            id: sid,
            url: link,
            shares: success,
            requested: amount,
            time: new Date()
        };

        shareHistory.unshift(history);
        activeShares.delete(sid);

        res.json({
            status: true,
            message: `Shared ${success} times`,
            data: history
        });

    } catch (err) {
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Share API (GET)
app.get("/api/shareboost", async (req, res) => {
    try {
        const { cookie, url, amount } = req.query;
        const limit = parseInt(amount);

        if (!cookie || !url || !limit) {
            return res.status(400).json({
                status: false,
                message: "Missing parameters"
            });
        }

        const ua = ua_list[Math.floor(Math.random() * ua_list.length)];
        const token = await extract_token(cookie, ua);

        if (!token) {
            return res.status(401).json({
                status: false,
                message: "Token extraction failed"
            });
        }

        let success = 0;

        for (let i = 0; i < limit; i++) {
            try {
                await axios.post(
                    "https://graph.facebook.com/v18.0/me/feed",
                    null,
                    {
                        params: {
                            link: url,
                            access_token: token,
                            published: 0
                        },
                        headers: {
                            "user-agent": ua,
                            "cookie": cookie
                        }
                    }
                );
                success++;
            } catch {
                break;
            }
        }

        res.json({
            status: true,
            requested: limit,
            success,
            success_rate: ((success / limit) * 100).toFixed(2) + "%"
        });

    } catch {
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Active shares
app.get("/api/active-shares", (req, res) => {
    res.json({
        active: [...activeShares.entries()].map(([id, data]) => ({
            id,
            ...data,
            progress: ((data.completed / data.total) * 100).toFixed(2) + "%"
        }))
    });
});

// History
app.get("/api/share-history", (req, res) => {
    res.json({ history: shareHistory });
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});/* REMOVE BG */
app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    const img = fileURL(req, req.file);
    const api = "https://api-library-kohi.onrender.com/api/removebg?url=" + encodeURIComponent(img);
    const r = await axios.get(api);
    res.json({ url: r.data.data.url });
  } catch {
    res.status(500).json({ error: true });
  }
});

/* UPSCALE */
app.post("/upscale", upload.single("image"), async (req, res) => {
  try {
    const img = fileURL(req, req.file);
    const api = "https://api-library-kohi.onrender.com/api/upscale?url=" + encodeURIComponent(img);
    const r = await axios.get(api);
    res.json({ url: r.data.data.url });
  } catch {
    res.status(500).json({ error: true });
  }
});

/* BLUR */
app.post("/blur", upload.single("image"), async (req, res) => {
  try {
    const img = fileURL(req, req.file);
    const blurURL = "https://api.popcat.xyz/v2/blur?image=" + encodeURIComponent(img);
    res.json({ url: blurURL });
  } catch {
    res.status(500).json({ error: true });
  }
});

/* SYSTEM INFO */
app.get("/info", (req, res) => {
  res.json({
    ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress,
    time: new Date().toISOString(),
    termsAccepted: Boolean(req.cookies.termsAccepted)
  });
});

/* TERMS */
app.post("/accept-terms", (req, res) => {
  res.cookie("termsAccepted", "true", {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false
  });
  res.json({ success: true });
});

/* DOWNLOAD */
app.get("/download", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).end();

    const response = await axios.get(url, { responseType: "stream" });
    const filename = "image_" + Date.now() + path.extname(url.split("?")[0] || ".png");

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    response.data.pipe(res);
  } catch {
    res.status(500).end();
  }
});

/* CLEANUP */
setInterval(() => {
  fs.readdir("uploads", (_, files) => {
    if (!files) return;
    files.forEach(f => {
      const p = path.join("uploads", f);
      fs.stat(p, (_, stat) => {
        if (stat && Date.now() - stat.mtimeMs > 3600000) {
          fs.unlink(p, () => {});
        }
      });
    });
  });
}, 1800000);

/* START */
app.listen(PORT, () => {
  console.log("✅ Backend running on http://localhost:" + PORT);
});
