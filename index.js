require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { status: false, message: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enhanced user agents list
const ua_list = [
    "Mozilla/5.0 (Linux; Android 10; Wildfire E Lite) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/105.0.5195.136 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/298.0.0.10.115;]",
    "Mozilla/5.0 (Linux; Android 11; KINGKONG 5 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 Mobile Safari/537.36[FBAN/EMA;FBLC/fr_FR;FBAV/320.0.0.12.108;]",
    "Mozilla/5.0 (Linux; Android 11; G91 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.126 Mobile Safari/537.36[FBAN/EMA;FBLC/fr_FR;FBAV/325.0.1.4.108;]"
];

// In-memory storage for demo (replace with database in production)
const shareHistory = [];
const activeShares = new Map();

// Enhanced token extraction with retry logic
async function extract_token(cookie, ua, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get("https://business.facebook.com/business_locations", {
                headers: {
                    "user-agent": ua,
                    "referer": "https://www.facebook.com/",
                    "Cookie": cookie,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1"
                },
                timeout: 10000
            });
            
            const tokenMatch = response.data.match(/(EAAG\w+)/);
            if (tokenMatch) {
                return tokenMatch[1];
            }
        } catch (error) {
            if (i === retries - 1) {
                console.error('Token extraction failed:', error.message);
                return null;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    return null;
}

// Home page
app.get("/", (req, res) => {
    res.render("index", { 
        title: "Facebook Share Booster",
        mode: req.cookies?.theme || 'light'
    });
});

// Privacy Policy Modal
app.get("/privacy-policy", (req, res) => {
    res.render("privacy-modal");
});

// API Routes
app.post("/api/share", apiLimiter, async (req, res) => {
    try {
        const { cookie, link: post_link, limit, session_id } = req.body;
        const limitNum = parseInt(limit, 10);
        
        // Validation
        if (!cookie || !post_link || !limitNum) {
            return res.status(400).json({ 
                status: false, 
                message: "Missing required parameters." 
            });
        }
        
        if (limitNum > 100) {
            return res.status(400).json({ 
                status: false, 
                message: "Limit cannot exceed 100 shares per request." 
            });
        }
        
        const sid = session_id || Date.now().toString();
        const ua = ua_list[Math.floor(Math.random() * ua_list.length)];
        
        // Add to active shares
        activeShares.set(sid, {
            total: limitNum,
            completed: 0,
            status: 'processing',
            startTime: new Date(),
            url: post_link
        });
        
        // Extract token
        const token = await extract_token(cookie, ua);
        if (!token) {
            activeShares.delete(sid);
            return res.status(401).json({ 
                status: false, 
                message: "Token extraction failed. Please check your cookie." 
            });
        }
        
        let success = 0;
        const delays = [1000, 1500, 2000, 2500, 3000];
        
        for (let i = 0; i < limitNum; i++) {
            try {
                // Random delay to avoid detection
                await new Promise(resolve => setTimeout(resolve, delays[Math.floor(Math.random() * delays.length)]));
                
                const response = await axios.post(
                    "https://graph.facebook.com/v18.0/me/feed",
                    null,
                    {
                        params: { 
                            link: post_link, 
                            access_token: token, 
                            published: 0 
                        },
                        headers: {
                            "user-agent": ua,
                            "Cookie": cookie,
                            "Accept": "application/json",
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        timeout: 15000
                    }
                );
                
                if (response.data && response.data.id) {
                    success++;
                    // Update active share progress
                    activeShares.set(sid, {
                        ...activeShares.get(sid),
                        completed: success
                    });
                } else {
                    break;
                }
            } catch (error) {
                console.error(`Share ${i + 1} failed:`, error.message);
                if (error.response?.status === 403) {
                    break;
                }
            }
        }
        
        // Add to history
        const historyEntry = {
            id: sid,
            url: post_link,
            shares: success,
            total: limitNum,
            timestamp: new Date(),
            status: success > 0 ? 'success' : 'failed'
        };
        
        shareHistory.unshift(historyEntry);
        
        // Remove from active shares
        activeShares.delete(sid);
        
        res.json({
            status: true,
            message: success > 0 ? `✅ Successfully shared ${success} times.` : "❌ No shares were successful.",
            success_count: success,
            session_id: sid,
            history: historyEntry
        });
        
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            status: false, 
            message: "Internal server error. Please try again later." 
        });
    }
});

// New API endpoint
app.get("/api/shareboost", apiLimiter, async (req, res) => {
    try {
        const { cookie, url, amount } = req.query;
        
        if (!cookie || !url || !amount) {
            return res.status(400).json({
                status: false,
                message: "Missing parameters. Required: cookie, url, amount"
            });
        }
        
        const limitNum = parseInt(amount, 10);
        const sid = Date.now().toString();
        const ua = ua_list[Math.floor(Math.random() * ua_list.length)];
        
        const token = await extract_token(cookie, ua);
        if (!token) {
            return res.status(401).json({
                status: false,
                message: "Invalid cookie or token extraction failed."
            });
        }
        
        let success = 0;
        for (let i = 0; i < limitNum; i++) {
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
                            "Cookie": cookie
                        }
                    }
                );
                success++;
            } catch (error) {
                break;
            }
        }
        
        res.json({
            status: true,
            shares: success,
            requested: limitNum,
            success_rate: ((success / limitNum) * 100).toFixed(1) + "%"
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
});

// Get active shares
app.get("/api/active-shares", (req, res) => {
    const active = Array.from(activeShares.entries()).map(([id, data]) => ({
        id,
        ...data,
        progress: (data.completed / data.total) * 100
    }));
    
    res.json({ active });
});

// Get share history
app.get("/api/share-history", (req, res) => {
    res.json({ 
        history: shareHistory.slice(0, 50),
        total: shareHistory.length 
    });
});

// Clear history (demo purposes)
app.delete("/api/clear-history", (req, res) => {
    shareHistory.length = 0;
    res.json({ status: true, message: "History cleared" });
});

// Theme toggle
app.post("/api/theme", (req, res) => {
    const { theme } = req.body;
    res.cookie('theme', theme, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ status: true });
});

// Error pages
app.get("/404", (req, res) => {
    res.status(404).render("404", { 
        title: "404 - Page Not Found",
        mode: req.cookies?.theme || 'light'
    });
});

app.get("/500", (req, res) => {
    res.status(500).render("500", { 
        title: "500 - Server Error",
        mode: req.cookies?.theme || 'light'
    });
});

// Catch 404
app.use((req, res) => {
    res.status(404).redirect("/404");
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).redirect("/500");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
});