const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== MIDDLEWARE ===== */
app.use(cors());
app.use(cookieParser());
app.set("trust proxy", true);
app.use(express.json());
app.use(express.static(__dirname));

/* ======================================================
   HELPER: STREAM IMAGE AS FILE
====================================================== */
async function streamAsFile(res, imageUrl, filename) {
  const response = await axios.get(imageUrl, {
    responseType: "stream",
    timeout: 20000
  });

  const ext = path.extname(imageUrl.split("?")[0]) || ".png";

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}${ext}"`
  );
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");

  response.data.pipe(res);
}

/* ======================================================
   REMOVE BACKGROUND (URL → FILE)
   /removebg?url=
====================================================== */
app.get("/removebg", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).end();

    const api =
      "https://api-library-kohi.onrender.com/api/removebg?url=" +
      encodeURIComponent(url);

    const r = await axios.get(api);
    const outputUrl = r.data.data.url;

    await streamAsFile(res, outputUrl, "removebg_" + Date.now());
  } catch (e) {
    console.error(e.message);
    res.status(500).end();
  }
});

/* ======================================================
   UPSCALE (URL → FILE)
   /upscale?url=
====================================================== */
app.get("/upscale", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).end();

    const api =
      "https://api-library-kohi.onrender.com/api/upscale?url=" +
      encodeURIComponent(url);

    const r = await axios.get(api);
    const outputUrl = r.data.data.url;

    await streamAsFile(res, outputUrl, "upscale_" + Date.now());
  } catch (e) {
    console.error(e.message);
    res.status(500).end();
  }
});

/* ======================================================
   BLUR (URL → FILE)
   /blur?url=
====================================================== */
app.get("/blur", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).end();

    const outputUrl =
      "https://api.popcat.xyz/v2/blur?image=" +
      encodeURIComponent(url);

    await streamAsFile(res, outputUrl, "blur_" + Date.now());
  } catch (e) {
    console.error(e.message);
    res.status(500).end();
  }
});

/* ======================================================
   SYSTEM INFO (UNCHANGED)
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
   TERMS & PRIVACY (UNCHANGED)
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
   START SERVER
====================================================== */
app.listen(PORT, () => {
  console.log("✅ Backend running on http://localhost:" + PORT);
});