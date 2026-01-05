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

/* ===== MULTER (MEMORY) ===== */
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }
});

/* ======================================================
   REMOVE BG (DIRECT FILE)
====================================================== */
app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    const imgBase64 = req.file.buffer.toString("base64");

    const api =
      "https://api-library-kohi.onrender.com/api/removebg";

    const r = await axios.post(api, {
      image: imgBase64
    });

    const imageUrl = r.data.data.url;

    const imageStream = await axios.get(imageUrl, {
      responseType: "stream"
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="removebg_${Date.now()}.png"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    imageStream.data.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

/* ======================================================
   UPSCALE (DIRECT FILE)
====================================================== */
app.post("/upscale", upload.single("image"), async (req, res) => {
  try {
    const imgBase64 = req.file.buffer.toString("base64");

    const api =
      "https://api-library-kohi.onrender.com/api/upscale";

    const r = await axios.post(api, {
      image: imgBase64
    });

    const imageUrl = r.data.data.url;

    const imageStream = await axios.get(imageUrl, {
      responseType: "stream"
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="upscale_${Date.now()}.png"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    imageStream.data.pipe(res);
  } catch {
    res.status(500).end();
  }
});

/* ======================================================
   BLUR (DIRECT FILE)
====================================================== */
app.post("/blur", upload.single("image"), async (req, res) => {
  try {
    const imgBase64 = req.file.buffer.toString("base64");

    const blurApi =
      "https://api.popcat.xyz/v2/blur";

    const r = await axios.post(blurApi, {
      image: imgBase64
    });

    const imageStream = await axios.get(r.data.url, {
      responseType: "stream"
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="blur_${Date.now()}.png"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    imageStream.data.pipe(res);
  } catch {
    res.status(500).end();
  }
});

/* ======================================================
   SYSTEM + TERMS (UNCHANGED)
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

app.post("/accept-terms", (req, res) => {
  res.cookie("termsAccepted", "true", {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false
  });
  res.json({ success: true });
});

/* ======================================================
   START
====================================================== */
app.listen(PORT, () => {
  console.log("✅ Backend running on http://localhost:" + PORT);
});