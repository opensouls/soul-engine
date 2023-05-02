const { setupEventStream } = require("./utils");

const { Samantha, OpenaiConfig } = require("socialagi");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const SOCIALAGI_PORT = process.env.SOCIALAGI_PORT || 5001;
const API_KEY = process.env.OPENAI_API_KEY;

const config = new OpenaiConfig({ apiKey: API_KEY });
const samantha = new Samantha(config);

app.listen(SOCIALAGI_PORT, () => {
  console.log(`socialagi listening on port ${SOCIALAGI_PORT}`);
});

app.get("/listenMessages", (req, res) => {
  setupEventStream(res);

  const saysHandler = (message) => {
    res.write(`data: ${message}\n\n`);
  };
  samantha.on("says", saysHandler);
});

app.get("/listenThoughts", (req, res) => {
  setupEventStream(res);

  const thinksHandler = (thought) => {
    res.write(`data: ${thought}\n\n`);
  };
  samantha.on("thinks", thinksHandler);
});

app.post("/tell", express.json(), (req, res) => {
  const { message } = req.body;
  samantha.tell(message);
  res.status(200).send("OK");
});
