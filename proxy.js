// proxy-poll.js
import express from "express";
import fetch from "node-fetch";
import readline from "readline";

const app = express();
const PORT = 3000;

// ⚠️ Replace with fresh cookies from your browser session
const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "text/event-stream",
  'X-Requested-With': 'XMLHttpRequest',
  "Referer": "https://bustracker.transjakarta.co.id/maps",
  "Cookie": "PHPSESSID=YOUR_SESSION_ID; cookiesession1=YOUR_COOKIESESSION"
};

app.get("/api_bus_stops", async (req, res) => {
  try {
    const selectedRouteId = req.query.selectedrouteid;
    if (!selectedRouteId) {
      return res.status(400).json({ error: "selectedrouteid query parameter is required" });
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    const upstream = await fetch(`https://bustracker.transjakarta.co.id/assets/api/api_bus_stop.php?rute=${encodeURIComponent(selectedRouteId)}`, {
      headers: HEADERS
    });
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy failed" });
  }
});

app.get("/sse/vehicleposition", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // ✅ SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const selectedRouteId = req.query.selectedRouteId;
  if (!selectedRouteId) {
    const upstream = await fetch(`https://bustracker.transjakarta.co.id/sse/vehicleposition`, {
      headers: HEADERS
    });
    upstream.body.pipe(res);
  } else {
    const upstream = await fetch(`https://bustracker.transjakarta.co.id/sse/vehicleposition/${encodeURIComponent(selectedRouteId)}`, {
      headers: HEADERS
    });
    upstream.body.pipe(res);
  }

  // ✅ Allow your frontend to connect

});

app.get("/sse/device", async (req, res) => {
  const selectedDevice = req.query.deviceId;
  if (!selectedDevice) {
    return res.status(400).json({ error: "selectedDevice query parameter is required" });
  }
    const upstream = await fetch(`https://bustracker.transjakarta.co.id/sse/device/${encodeURIComponent(selectedDevice)}`, {
    headers: HEADERS
  });
  // ✅ Allow your frontend to connect
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // ✅ SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  upstream.body.pipe(res);
});

app.get("/vehicleposition", async (req, res) => {
  try {
    const upstream = await fetch("https://bustracker.transjakarta.co.id/sse/vehicleposition", {
      headers: HEADERS
    });

    const rl = readline.createInterface({ input: upstream.body });

    let found = false;

    rl.on("line", (line) => {
      if (line.startsWith("data:")) {
        const json = line.replace(/^data:\s*/, "");
        try {
          const parsed = JSON.parse(json);
          found = true;
          res.json(parsed);
          rl.close();
          upstream.body.destroy(); // stop streaming
        } catch (err) {
          console.error("Parse error:", err);
        }
      }
    });

    rl.on("close", () => {
      if (!found) {
        res.status(500).json({ error: "No data received" });
      }
    });

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Polling proxy running on http://localhost:${PORT}`);
});

app.use(express.static('.'))
app.use(express.static('public'))

app.get('/map', function(req, res){
res.sendFile('/Programming/Teej/index.html');
});