const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static("uploads"));

/* ENSURE UPLOAD FOLDER */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

/* MULTER CONFIG */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/* HELPER: FILE URL */
const fileURL = (req, file) =>
  `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

/* =========================
   SYSTEM INFO (TIME / IP)
========================= */
app.get("/info", (req, res) => {
  res.json({
    time: new Date().toISOString(),
    ip:
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress
  });
});

/* =========================
   REMOVE BACKGROUND
========================= */
app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const img = fileURL(req, req.file);
    const api =
      "https://api-library-kohi.onrender.com/api/removebg?url=" +
      encodeURIComponent(img);

    const r = await axios.get(api, { timeout: 60000 });
    res.json({ url: r.data.data.url });

  } catch (e) {
    console.error("RemoveBG error:", e.message);
    res.status(500).json({ error: true });
  }
});

/* =========================
   UPSCALE
========================= */
app.post("/upscale", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const img = fileURL(req, req.file);
    const api =
      "https://api-library-kohi.onrender.com/api/upscale?url=" +
      encodeURIComponent(img);

    const r = await axios.get(api, { timeout: 60000 });
    res.json({ url: r.data.data.url });

  } catch (e) {
    console.error("Upscale error:", e.message);
    res.status(500).json({ error: true });
  }
});

/* =========================
   BLUR
========================= */
app.post("/blur", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const img = fileURL(req, req.file);
    const blurURL =
      "https://api.popcat.xyz/v2/blur?image=" +
      encodeURIComponent(img);

    /* Popcat already returns an image URL */
    res.json({ url: blurURL });

  } catch (e) {
    console.error("Blur error:", e.message);
    res.status(500).json({ error: true });
  }
});

/* =========================
   DIRECT DOWNLOAD (ICON)
========================= */
app.get("/download", async (req, res) => {
  try {
    if (!req.query.url) return res.status(400).end();

    const r = await axios.get(req.query.url, {
      responseType: "stream",
      timeout: 60000
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="image.png"'
    );
    res.setHeader("Content-Type", "application/octet-stream");

    r.data.pipe(res);

  } catch (e) {
    console.error("Download error:", e.message);
    res.status(500).end();
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log("✅ Backend running on http://localhost:" + PORT);
});