const express = require("express");
const request = require("request");
const cors = require("cors");
const app = express();
const PORT = 3000;

const proxyList = {
  norway: "http://norway-proxy-ip:port",
  usa: "http://usa-proxy-ip:port",
  uk: "http://uk-proxy-ip:port",
  germany: "http://germany-proxy-ip:port",
  canada: "http://canada-proxy-ip:port",
  france: "http://france-proxy-ip:port",
  japan: "http://japan-proxy-ip:port",
  india: "http://india-proxy-ip:port",
  australia: "http://australia-proxy-ip:port",
  brazil: "http://brazil-proxy-ip:port"
};

app.use(cors());
app.use(express.static("public"));

app.get("/proxy", (req, res) => {
  const { url, country } = req.query;
  if (!url) return res.status(400).send("URL required");

  const proxy = proxyList[country] || proxyList["norway"];

  request({
    url: url,
    headers: { "User-Agent": "Mozilla/5.0" },
    proxy: proxy,
    rejectUnauthorized: false
  }).pipe(res);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
