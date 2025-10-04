// parse-routes.js
const fs = require("fs");
const cheerio = require("cheerio");

// Load the saved HTML file
const html = fs.readFileSync("api_list_rute.php.htm", "utf8");
const $ = cheerio.load(html);

const routes = [];

$("tr.daftar_nomor").each((_, el) => {
  const routeId = $(el).attr("data-route-id") || "";
  const routeName = $(el).attr("data-route-name") || "";
  const routeColor = "#" + ($(el).attr("data-route-color") || "000000");
  const routeTextColor = "#" + ($(el).attr("data-route-text-color") || "FFFFFF");

  routes.push({
    id: routeId.trim(),
    name: routeName.trim(),
    color: routeColor.toUpperCase(),
    textColor: routeTextColor.toUpperCase(),
  });
});

// Write to routes.json
fs.writeFileSync("routes.json", JSON.stringify(routes, null, 2), "utf8");
console.log(`✅ Parsed ${routes.length} routes into routes.json`);
