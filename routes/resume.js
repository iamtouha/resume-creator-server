const path = require("path");
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const router = require("express").Router();
const templateList = require("../list.json");
const transporter = require("../plugins/nodemailer");

router.get("/", (req, res) => {
  const thumbBaseUrl = req.protocol + "://" + req.headers.host + "/thumbnails/";
  const payload = templateList.map((item) => ({
    id: item.id,
    title: item.title,
    thumbnail: thumbBaseUrl + item.thumbnail,
  }));
  res.send(payload);
});

router.get("/:id", (req, res) => {
  const thumbBaseUrl = req.protocol + "://" + req.headers.host + "/thumbnails/";
  const tem = templateList.find((item) => item.id === req.params.id);
  if (tem) {
    res.send({
      id: tem.id,
      title: tem.title,
      thumbnail: thumbBaseUrl + tem.thumbnail,
    });
  } else {
    res.status(404).send("No template found!");
  }
});

router.post("/generate", async (req, res) => {
  const tem = templateList.find((item) => item.id === req.body.template);
  if (!tem) return res.status(404).send("No template found!");

  var content = fs.readFileSync(
    path.resolve(__basedir, "templates/" + tem.path),
    "binary"
  );
  var zip = new PizZip(content);
  var doc;
  try {
    doc = new Docxtemplater(zip);
  } catch (error) {
    errorHandler(error);
  }

  doc.setData(req.body.fields);

  try {
    doc.render();
  } catch (error) {
    errorHandler(error);
  }

  var buf = doc.getZip().generate({ type: "nodebuffer" });

  try {
    if (req.body.receiverEmail) {
      await sendEmail(req.body.receiverEmail, buf);
    }
    res.write(buf, "binary");
    res.end(null, "binary");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("error.message");
  }
});

function replaceErrors(key, value) {
  if (value instanceof Error) {
    return Object.getOwnPropertyNames(value).reduce(function (error, key) {
      error[key] = value[key];
      return error;
    }, {});
  }
  return value;
}

function errorHandler(error) {
  console.log(JSON.stringify({ error: error }, replaceErrors));

  if (error.properties && error.properties.errors instanceof Array) {
    const errorMessages = error.properties.errors
      .map(function (error) {
        return error.properties.explanation;
      })
      .join("\n");
    console.log("errorMessages", errorMessages);
  }
  throw error;
}

async function sendEmail(receiver, buffer) {
  const message = {
    from: `Resume Creator <${process.env.SMTP_USERNAME}>`,
    to: receiver,
    subject: "Your resume is ready!",
    html: `
      <p>Hi,</p>
      <p>Your Resume is Attached with this email. Thanks for using Resume Creator.</p>
      `,
    attachments: [
      {
        filename: "resume.docx",
        content: buffer,
      },
    ],
  };
  await transporter.sendMail(message);
}

module.exports = router;
