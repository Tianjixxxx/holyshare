const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== MIDDLEWARE ===== */
app.use(cors());
app.use(cookieParser());
app.set("trust proxy", true);
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static("uploads"));

/* ===== ENSURE UPLOAD DIR ===== */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

/* ===== MULTER SETUP ===== */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/* ===== HELPER ===== */
const fileURL = (req, file) =>
  `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

/* ======================================================
   IMAGE TOOLS
====================================================== */

/* REMOVE BACKGROUND */
app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    const img = fileURL(req, req.file);
    const api =
      "https://api-library-kohi.onrender.com/api/removebg?url=" +
      encodeURIComponent(img);

    const r = await axios.get(api);
    res.json({ url: r.data.data.url, tool: "removebg" });
  } catch (e) {
    res.status(500).json({ error: true });
  }
});

/* UPSCALE */
app.post("/upscale", upload.single("image"), async (req, res) => {
  try {
    const img = fileURL(req, req.file);
    const api =
      "https://api-library-kohi.onrender.com/api/upscale?url=" +
      encodeURIComponent(img);

    const r = await axios.get(api);
    res.json({ url: r.data.data.url, tool: "upscale" });
  } catch {
    res.status(500).json({ error: true });
  }
});

/* BLUR */
app.post("/blur", upload.single("image"), async (req, res) => {
  try {
    const img = fileURL(req, req.file);
    const blurURL =
      "https://api.popcat.xyz/v2/blur?image=" +
      encodeURIComponent(img);

    res.json({ url: blurURL, tool: "blur" });
  } catch {
    res.status(500).json({ error: true });
  }
});

/* ======================================================
   SYSTEM INFO
====================================================== */
app.get("/info", (req, res) => {
  res.json({
    ip:
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress,
    time: new Date().toISOString(),
    termsAccepted: Boolean(req.cookies.termsAccepted)
  });
});

/* ======================================================
   TERMS & PRIVACY
====================================================== */
app.post("/accept-terms", (req, res) => {
  res.cookie("termsAccepted", "true", {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false
  });
  res.json({ success: true });
});

/* ======================================================
   DIRECT FILE DOWNLOAD (IMPROVED)
====================================================== */
app.get("/download", async (req, res) => {
  try {
    const url = req.query.url;
    const tool = req.query.tool || "image";

    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }

    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 15000
    });

    const ext =
      path.extname(url.split("?")[0]) || ".png";

    const filename = `${tool}_${Date.now()}${ext}`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");

    response.data.pipe(res);
  } catch (err) {
    console.error("Download error:", err.message);
    res.status(500).end();
  }
});

/* ======================================================
   AUTO CLEANUP (SAFE)
====================================================== */
setInterval(() => {
  fs.readdir("uploads", (_, files) => {
    if (!files) return;
    files.forEach(f => {
      const p = path.join("uploads", f);
      fs.stat(p, (_, stat) => {
        if (stat && Date.now() - stat.mtimeMs > 1000 * 60 * 60) {
          fs.unlink(p, () => {});
        }
      });
    });
  });
}, 1000 * 60 * 30);

/* ======================================================
   START SERVER
====================================================== */
app.listen(PORT, () => {
  console.log("✅ Backend running on http://localhost:" + PORT);
});