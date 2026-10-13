const mongoose = require("mongoose");
require("dotenv").config();
const Case = require("../models/Case");
const Item = require("../models/Item");
const { recomputeCaseValues } = require("../utils/itemValue");

async function convertCurrency() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const FACTOR = 10; // Divide by 10 to make K₽ values realistic for R$
    console.log(`Converting values (Dividing by ${FACTOR})...`);

    // 1. Convert Item base values
    const items = await Item.find();
    for (const item of items) {
      const newValue = Math.max(1, Math.floor(item.baseValue / FACTOR));
      await Item.updateOne({ _id: item._id }, { $set: { baseValue: newValue } });
    }
    console.log(`Updated ${items.length} items.`);

    // 2. Convert Case prices
    const cases = await Case.find();
    for (const c of cases) {
      const newPrice = Math.max(1, Math.floor(c.price / FACTOR));
      await Case.updateOne({ _id: c._id }, { $set: { price: newPrice } });

      // 3. Recompute case values based on new item values
      await recomputeCaseValues(c._id);
      console.log(`Updated case ${c.title}: R$ ${newPrice}`);
    }
    console.log(`Updated ${cases.length} cases and recomputed values.`);

    console.log("\nCurrency conversion complete!");
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

convertCurrency();
