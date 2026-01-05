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
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.post("/removebg", upload.single("image"), async (req, res) => {
  try {
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const apiUrl = `https://api-library-kohi.onrender.com/api/removebg?url=${encodeURIComponent(imageUrl)}`;

    const response = await axios.get(apiUrl);

    if (!response.data.status) {
      return res.status(400).json({ error: "Failed to remove background" });
    }

    res.json({
      success: true,
      result: response.data.data.url
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});