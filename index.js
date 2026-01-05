const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(cookieParser());
app.set("trust proxy", true);

app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

/* FILE UPLOAD */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const fileURL = (req, file) =>
  `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

/* REMOVE BACKGROUND */
app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    const img = fileURL(req, req.file);
    const api =
      "https://api-library-kohi.onrender.com/api/removebg?url=" +
      encodeURIComponent(img);

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
    const api =
      "https://api-library-kohi.onrender.com/api/upscale?url=" +
      encodeURIComponent(img);

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
    const blurURL =
      "https://api.popcat.xyz/v2/blur?image=" +
      encodeURIComponent(img);

    res.json({ url: blurURL });
  } catch {
    res.status(500).json({ error: true });
  }
});

/* SYSTEM INFO (IP + DATE) */
app.get("/info", (req, res) => {
  res.json({
    ip:
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress,
    time: new Date().toISOString(),
    termsAccepted: Boolean(req.cookies.termsAccepted)
  });
});

/* ACCEPT TERMS & PRIVACY */
app.post("/accept-terms", (req, res) => {
  res.cookie("termsAccepted", "true", {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    sameSite: "lax"
  });
  res.json({ success: true });
});

/* DIRECT DOWNLOAD */
app.get("/download", async (req, res) => {
  try {
    const r = await axios.get(req.query.url, {
      responseType: "stream"
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="image.png"'
    );
    r.data.pipe(res);
  } catch {
    res.status(500).end();
  }
});

/* START SERVER */
app.listen(PORT, () => {
  console.log("✅ Backend running on http://localhost:" + PORT);
});