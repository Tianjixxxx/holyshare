const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* MIDDLEWARE */
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
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/* =========================
   REMOVE BACKGROUND
========================= */
app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    const imageUrl =
      `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const api =
      `https://api-library-kohi.onrender.com/api/removebg?url=${encodeURIComponent(imageUrl)}`;

    const response = await axios.get(api);

    if (!response.data.status) {
      return res.status(400).json({ success: false });
    }

    res.json({
      success: true,
      url: response.data.data.url
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   UPSCALE IMAGE
========================= */
app.post("/upscale", async (req, res) => {
  try {
    const api =
      `https://api-library-kohi.onrender.com/api/upscale?url=${encodeURIComponent(req.body.url)}`;

    const response = await axios.get(api);

    if (!response.data.status) {
      return res.status(400).json({ success: false });
    }

    res.json({
      success: true,
      url: response.data.data.url
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   BLUR IMAGE
========================= */
app.post("/blur", async (req, res) => {
  try {
    const blurUrl =
      `https://api.popcat.xyz/v2/blur?image=${encodeURIComponent(req.body.url)}`;

    res.json({
      success: true,
      url: blurUrl
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================
   FORCE FILE DOWNLOAD
========================= */
app.get("/download", async (req, res) => {
  try {
    const response = await axios.get(req.query.url, {
      responseType: "stream"
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="image.png"'
    );
    res.setHeader("Content-Type", "image/png");

    response.data.pipe(res);
  } catch (err) {
    res.status(500).send("Download failed");
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
});