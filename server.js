require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const upload = multer({ dest: "uploads/" });
app.get("/", (req, res) => {
  res.send(index.html);
});

app.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "plant_diagnosis",
    });

    const imageUrl = uploadResult.secure_url;
    console.log("Uploaded to Cloudinary:", imageUrl);
    const plantIdResponse = await axios.post(
      "https://api.plant.id/v2/health_assessment",
      {
        images: [imageUrl],
        modifiers: ["crops_fast", "disease"],
        language: "en",
        disease_details: ["common_names", "description", "treatment", "url"],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Api-Key": process.env.PLANT_ID_API_KEY,
        },
      }
    );

    console.log(" Got response from Plant.id");
    console.log("plant id response: ", plantIdResponse.data);
    fs.unlink(req.file.path, () => {});
    res.json(plantIdResponse.data);
  } catch (error) {
    console.error(" Plant.id error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Image analysis failed" });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(` Crop Monitoring Backend running at http://localhost:${PORT}`);
});
