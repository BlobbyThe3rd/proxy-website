const express = require("express");
const request = require("request");
const cors = require("cors");
const cheerio = require("cheerio");

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

const countries = {
  norway: "NO",
  usa: "US",
  uk: "GB",
  germany: "DE",
  canada: "CA",
  france: "FR",
  japan: "JP",
  india: "IN",
  australia: "AU",
  brazil: "BR"
};

let proxyPools = {};

async function loadProxies() {
  console.log("Fetching proxy lists...");
  for (const [name, code] of Object.entries(countries)) {
    try {
      const res = await fetch(`https://www.proxy-list.download/api/v1/get?type=http&country=${code}`);
      const text = await res.text();
      proxyPools[name] = text.split("\r\n").filter(Boolean).map(ip => `http://${ip}`);
      console.log(`Loaded ${proxyPools[name].length} proxies for ${name}`);
    } catch (err) {
      console.error(`Failed to fetch proxies for ${name}:`, err);
      proxyPools[name] = [];
    }
  }
}

app.use(cors());
app.use(express.static("public"));

app.get("/proxy", (req, res) => {
  let { url, country } = req.query;
  if (!url) return res.status(400).send("URL required");

  let targetUrl = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `http://${url}`;

  let proxy = proxyPools[country] && proxyPools[country].length > 0
    ? proxyPools[country][Math.floor(Math.random() * proxyPools[country].length)]
    : null;

  console.log(`Fetching: ${targetUrl} via ${proxy || "DIRECT"}`);

  request({
    url: targetUrl,
    proxy: proxy || undefined,
    headers: { "User-Agent": "Mozilla/5.0" }
  }, async (error, response, body) => {
    if (error || !body) return res.status(500).send("Failed to fetch page");

    // Rewrite HTML
    const $ = cheerio.load(body);

    // Rewrite links and resources
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("javascript:") && !href.startsWith("#")) {
        const absolute = new URL(href, targetUrl).href;
        $(el).attr("href", `/proxy?url=${encodeURIComponent(absolute)}&country=${country}`);
      }
    });

    $("img, script, link").each((i, el) => {
      const attr = $(el).attr("src") || $(el).attr("href");
      if (attr) {
        const absolute = new URL(attr, targetUrl).href;
        if ($(el).attr("src")) $(el).attr("src", `/proxy?url=${encodeURIComponent(absolute)}&country=${country}`);
        if ($(el).attr("href")) $(el).attr("href", `/proxy?url=${encodeURIComponent(absolute)}&country=${country}`);
      }
    });

    res.setHeader("Content-Security-Policy", "");
    res.setHeader("X-Frame-Options", "");
    res.send($.html());
  });
});

loadProxies().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});