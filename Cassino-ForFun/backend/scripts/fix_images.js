const mongoose = require("mongoose");
require("dotenv").config();
const Case = require("../models/Case");
const Item = require("../models/Item");

async function fixImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const cases = await Case.find();
    for (const c of cases) {
      const oldCover = c.image;
      const newCover = oldCover.replace("https://kanicasino.com/public", "");
      await Case.updateOne({ _id: c._id }, { $set: { image: newCover } });
      console.log(`Updated case ${c.title}: ${oldCover} -> ${newCover}`);
    }

    const items = await Item.find();
    for (const i of items) {
      const oldImg = i.image;
      const newImg = oldImg.replace("https://kanicasino.com/public", "");
      await Item.updateOne({ _id: i._id }, { $set: { image: newImg } });
      console.log(`Updated item ${i.name}: ${oldImg} -> ${newImg}`);
    }

    console.log("\nAll images updated to relative paths!");
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

fixImages();
