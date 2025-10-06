

const busMarkers = {};
const infoBoxRight = document.getElementById("infoBoxRight");
const infoBoxRightContent = document.getElementById("infoBoxRightContent");
let routes = {};
let map;
let busdb = [];
let currentEventSource = null;
let currentRightInfoScreen = null;

var busFilters = { koridor: [], type: ["transjakarta"] };
async function loadBuses() {
    try {
        const res = await fetch("buses.json");
        busdb = await res.json();
        console.log("Loaded buses:", busdb);
    } catch (err) {
        console.error("Failed to load buses.json:", err);
    }
}

async function loadRoutes() {
    try {
        const res = await fetch("routes.json");
        const data = await res.json();

        routes = Object.fromEntries(data.map(r => [r.id, r]));
        console.log("Loaded routes:", routes);
    } catch (err) {
        console.error("Failed to load routes.json:", err);
    }
}



function initMap() {
    map = L.map('map').setView([-6.21462, 106.84513], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        ext: 'png'
    }).addTo(map);

    const eventSource = new EventSource("https://terakit.ryoojiz.workers.dev/sse/vehicleposition");

    eventSource.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            if (Array.isArray(data.databaseResult)) {
                updateBuses(data.databaseResult);
            }
        } catch (err) {
            console.error("Error parsing SSE:", err, event.data);
        }
    };

    eventSource.onerror = function (err) {
        console.error("SSE error:", err);
    };
}

function createRoundelIcon(text, color = "#646464", textcolor = "white") {
    const canvas = document.createElement("canvas");
    const size = 30;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = textcolor;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, size / 2, size / 2);

    return L.icon({
        iconUrl: canvas.toDataURL(),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
}

function updateBuses(busArray) {
    busArray.forEach(bus => {
        if (busFilters.koridor.length > 0 && !busFilters.koridor.includes(bus.koridor)) {
            // Remove marker if exists
            if (busMarkers[bus.device_id]) {
                map.removeLayer(busMarkers[bus.device_id]);
                delete busMarkers[bus.device_id];
            }
            return;
        }

        if (!busFilters.type.includes("mikrotrans") && bus.koridor !== null && bus.koridor.startsWith("JAK")) {
            // Remove marker if exists
            if (busMarkers[bus.device_id]) {
                map.removeLayer(busMarkers[bus.device_id]);
                delete busMarkers[bus.device_id];
            }
            return;
        }
        const position = { lat: bus.gpslat, lng: bus.gpslon };
        const route = routes[bus.koridor] || {};
        const label = bus.koridor || route.name || "N/A";
        const color = route.color || "#292929";
        const textcolor = route.textColor || "white";

        if (busMarkers[bus.device_id]) {
            // Update position
            busMarkers[bus.device_id].setLatLng([position.lat, position.lng]);
        } else {
            // New marker
            const marker = L.marker([position.lat, position.lng], {
                icon: createRoundelIcon(label, color, textcolor),
                title: `${bus.device_id}`
            }).addTo(map);

            marker.on("click", () => {
                showBusInfo(bus, route);
            });

            busMarkers[bus.device_id] = marker;
        }
    });
}

function findBus(nomorLambungInput) {
    const match = nomorLambungInput.match(/^([A-Z]+)-(\d+)$/);
    if (!match) {
        return { error: "❌ Format Salah. Gunakan OPERATOR-XXXXX" };
    }
    const operator = match[1];
    const num = parseInt(match[2], 10);

    for (const bus of busdb) {
        const nlMatch = bus.NomorLambung.match(new RegExp(`^${operator}-(\\d+)-(\\d+)$`));
        if (nlMatch) {
            const start = parseInt(nlMatch[1], 10);
            const end = parseInt(nlMatch[2], 10);
            if (num >= start && num <= end) {
                return {
                    Operator: bus.Operator,
                    NomorLambung: bus.NomorLambung,
                    Model: bus.Model,
                    Merek: bus.Merek,
                    Karoseri: bus.Karoseri,
                    Tipe: bus.Tipe,
                    Rute: bus.Rute
                };
            }
        }
    }

    return { error: "❌ Not found" };
}

function swapinfoBoxScreens(state) {
    document.getElementById(currentRightInfoScreen).style.setProperty("display", "none")
    currentRightInfoScreen = state
    document.getElementById(state).style.setProperty("display", "block")
}


function showBusInfo(bus, route) {
    swapinfoBoxScreens("busInfo")
    let businfo = findBus(bus.device_id);
    console.log(bus);
    infoBoxRightContent.innerHTML = `
    <img src="https://bustracker.ryj.my.id/operator/${bus.device_id.slice(0, 3) || "NA"}.png" alt="Bus" style="height:35px;width:auto;margin-bottom:10px;">
    <h3>Bus ${bus.device_id}</h3>
    <p><strong>Koridor:</strong> ${bus.koridor || "-"}</p>
    <p><strong>Route:</strong> ${route.name || "Unknown"}</p>
    <p><strong>Route ID:</strong> ${bus.route_id || "-"}</p>
    <p><strong>GPS:</strong> ${bus.gpslat}, ${bus.gpslon}</p>
    <p><strong>Status:</strong> ${bus.status || "-"}</p>
    <p><strong>Service:</strong> ${businfo.Tipe || "-"}</p>
    <p><strong>Manufacturer:</strong> ${businfo.Merek || "-"}</p>
    <p><strong>Model:</strong> ${businfo.Model || "-"}</p>
    <p><strong>Karoseri:</strong> ${businfo.Karoseri || "-"}</p>
    <p><strong>Melayani Rute:</strong> ${businfo.Rute || "-"}</p>
    `;
    if (!infoBoxRight.classList.contains("show")) {
        toggleinfobox()
    }
}


function toggleinfobox() {
    if (infoBoxRight.classList.contains("show")) {
        infoBoxRight.classList.remove("show");
    } else {
        infoBoxRight.classList.add("show");
    }
}

function populateRoutesList() {
    const routesListDiv = document.getElementById("routesList");
    const routesUl = document.getElementById("routesUl");
    Object.values(routes).forEach(route => {
        const li = document.createElement("li");
        var fontSize = "1rem";
        if (route.name && route.id.length < 3) {
            fontSize = "1rem";
        } else if (route.name && route.id.length <= 4) {
            fontSize = "0.75rem";
        } else if (route.name && route.id.length > 4) {
            fontSize = "0.5rem";
        }
        li.innerHTML = `<button class="routeListButton" at><div style="font-size:${fontSize}; background-color: ${route.color || '#292929'}; color: ${route.textColor || 'white'};" class="routeListContainer">${route.id}</div> ${route.name || "Unknown"}</button>`;
        li.children[0].setAttribute("data-route-id", route.id);
        routesUl.appendChild(li);
    });
    routesListDiv.style.display = "none";
    routesUl.querySelectorAll(".routeListButton").forEach(btn => {
        btn.addEventListener("click", function () {
            if (this.classList.contains("selected")) {
                this.classList.remove("selected");
                busFilters.koridor = [];
            } else {
                routesUl.querySelectorAll(".routeListButton").forEach(b => b.classList.remove("selected"));
                this.classList.add("selected");
                const routeId = this.getAttribute("data-route-id");
                busFilters.koridor = [routeId];
            }
        });
    });
}

document.getElementById("btnLocate").onclick = () => {
    map.locate({ setView: true, maxZoom: 16 });
};

document.getElementById("btnRoute").onclick = () => {
    toggleinfobox()
    swapinfoBoxScreens("routesList")
}

document.getElementById("btnTestInfoBox").onclick = toggleinfobox;
document.getElementById("infoBoxClose").onclick = toggleinfobox;
document.getElementById("searchButton").onclick = () => {
    const input = document.getElementById("searchField").value.trim().toUpperCase();
    const businfo = findBus(input);
    if (businfo.error) {
        infoBoxRight.innerHTML = `<p>${businfo.error}</p>`;
    } else {
        infoBoxRight.innerHTML = `
        <h3>Bus ${businfo.NomorLambung}</h3>
        <p><strong>Operator:</strong> ${businfo.Operator}</p>
        <p><strong>Service:</strong> ${businfo.Tipe || "-"}</p>
        <p><strong>Manufacturer:</strong> ${businfo.Merek || "-"}</p>
        <p><strong>Model:</strong> ${businfo.Model || "-"}</p>
        <p><strong>Karoseri:</strong> ${businfo.Karoseri || "-"}</p>
        <p><strong>Melayani Rute:</strong> ${businfo.Rute || "-"}</p>
        `;
    }
    infoBoxRight.style.display = "block";
};
window.onload = async () => {
    await loadRoutes();
    await loadBuses();
    initMap();
    populateRoutesList();
};