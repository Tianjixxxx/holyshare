const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const fileURL = (req, file) =>
  `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

/* REMOVE BG */
app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    const img = fileURL(req, req.file);
    const api = `https://api-library-kohi.onrender.com/api/removebg?url=${encodeURIComponent(img)}`;
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
    const api = `https://api-library-kohi.onrender.com/api/upscale?url=${encodeURIComponent(img)}`;
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
    const blur = `https://api.popcat.xyz/v2/blur?image=${encodeURIComponent(img)}`;
    res.json({ url: blur });
  } catch {
    res.status(500).json({ error: true });
  }
});

/* DOWNLOAD */
app.get("/download", async (req, res) => {
  const r = await axios.get(req.query.url, { responseType: "stream" });
  res.setHeader("Content-Disposition", 'attachment; filename="image.png"');
  r.data.pipe(res);
});

app.listen(PORT, () =>
  console.log("✅ Server running http://localhost:" + PORT)
);