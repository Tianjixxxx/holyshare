const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get("/autoshare", async (req, res) => {
  const { cookie, link, limit } = req.query;

  if (!cookie || !link || !limit) {
    return res.json({
      status: false,
      message: "Missing cookie, link, or limit"
    });
  }

  try {
    const response = await axios.get(
      "https://public-apis-ph-server.onrender.com/api/autoshare",
      {
        params: {
          cookie,
          link,
          limit
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "AutoShare failed",
      error: err.message
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Running at http://localhost:${PORT}`);
});