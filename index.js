const express = require("express");
const cors = require("cors");
require("dotenv").config();

global.__basedir = __dirname;

const app = express();
const port = 3000;

// middlewares
app.use(express.json());
app.use(express.static("public"));
app.use(cors());

// routes
const createResume = require("./routes/resume");
app.use("/resumes", createResume);

app.listen(port, () => {
  console.log("listening on port " + port);
});
