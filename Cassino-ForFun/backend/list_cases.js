const mongoose = require("mongoose");
require("dotenv").config();
const Case = require("./models/Case");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const cases = await Case.find({}).select('title');
    console.log("Cases in database:");
    cases.forEach(c => console.log(`- ${c.title}`));
    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
run();
