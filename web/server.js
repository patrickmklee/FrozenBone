import express from "express";
import fs from "node:fs";
import { Readable } from "node:stream";

const app = express();
app.use(express.urlencoded({ extended: false }));

const PARSER_URL = process.env.PARSER_URL || "http://localhost:5600";


app.get("/", (req, res) => {
  res.type("html").send(fs.readFileSync("./index.html", "utf8"));
});

app.post("/parse", async (req, res) => {
  try {
    const replayUrl = req.body.url;
    if (!replayUrl) {
      res.status(400).send("Missing URL");
      return;
    }

    const parserResp = await fetch(
      `http://parser:5600/blob?replay_url=${encodeURIComponent(replayUrl)}`,
      { method: "POST" }
    );

    if (!parserResp.ok || !parserResp.body) {
      const text = await parserResp.text().catch(() => "");
      res.status(502).send(`Parser error ${parserResp.status}\n${text}`);
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");

    // ✅ Convert Web stream → Node stream
    Readable.fromWeb(parserResp.body).pipe(res);
  } catch (err) {
    console.error("Parse failed:", err);
    if (!res.headersSent) res.status(500).send("Internal error");
  }
});


app.listen(3000, () => console.log("Web UI on http://localhost:3000"));
