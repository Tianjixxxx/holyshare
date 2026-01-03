const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static(__dirname));

app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    const imageBuffer = fs.readFileSync(req.file.path);

    const apiRes = await fetch(
      "https://api-library-kohi.onrender.com/api/removebg",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream"
        },
        body: imageBuffer
      }
    );

    const json = await apiRes.json();
    fs.unlinkSync(req.file.path);

    if (!json.status) {
      return res.status(400).json({ error: "Failed to process image" });
    }

    // Fetch the result image and stream it
    const imageRes = await fetch(json.data.url);
    res.setHeader("Content-Type", "image/png");
    imageRes.body.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});