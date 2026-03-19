/**
 * RIDE BUDDY - CORE LOGIC v2.3.0
 * System: Gemini AI, Live Radar (Community), Standalone PWA Check
 */

// 1. KONFIGURATION
const GEMINI_API_KEY = "AIzaSyA6YyDo4FcwZo2kkFMNWC87X70ih2rHYNI"; // Indsæt din nøgle fra Google AI Studio
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 2. INITIALISERING
document.addEventListener('DOMContentLoaded', () => {
    // Kør tjek for installation først
    checkInstallation(); 
    
    // Anvend gemte indstillinger
    applyTheme();
    loadProfile();
    
    // Hvis vi er på radar-siden, start kortet
    if (document.getElementById('map')) {
        initRadarMap();
    }
});

// --- WEB APP / STANDALONE CHECK (VIGTIGT FOR DIN FEJL) ---
function checkInstallation() {
    // Tjekker om appen kører i "standalone" mode (gemt på hjemskærm)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = window.navigator.standalone === true;
    
    const isInstallPage = window.location.pathname.includes('install.html');

    // DEBUG (Valgfrit: Fjern når det virker)
    console.log("Standalone mode:", isStandalone || isIOSStandalone);

    // Hvis vi IKKE er gemt på hjemskærmen, og IKKE er på install-siden, så flyt brugeren
    if (!isStandalone && !isIOSStandalone && !isInstallPage) {
        window.location.href = 'install.html';
    }
}

// --- GEMINI AI INTEGRATION ---
async function getAIRecommendation() {
    const output = document.getElementById('ai-response');
    const vehicle = localStorage.getItem('rb_vehicle') || "Motorcykel";
    const country = localStorage.getItem('rb_country') || "Danmark";
    
    if (output) output.innerText = "Storebror analyserer forholdene...";

    const prompt = `Du er Storebror AI, en MC-ekspert. Giv en meget kort, professionel sikkerheds-briefing (maks 3 sætninger) til en rytter på en ${vehicle} i ${country} i dag. Ingen emojis.`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        if (output) output.innerText = aiText;
    } catch (e) {
        if (output) output.innerText = "System offline. Tjek din internetforbindelse.";
    }
}

// --- LIVE RADAR (KORT & KAMERAER) ---
let map;

function initRadarMap() {
    // Start kortet - centrerer på KBH som default
    map = L.map('map', { zoomControl: false }).setView([55.6761, 12.5683], 13);

    // Brug et pænt mørkt kort-tema hvis relevant, ellers standard OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{y}.png').addTo(map);

    loadSavedMarkers();

    // Tilføj kamera ved klik på kortet
    map.on('click', function(e) {
        if (confirm("Vil du rapportere et fartkamera her?")) {
            addCameraMarker(e.latlng.lat, e.latlng.lng);
        }
    });
}

function addCameraMarker(lat, lng) {
    // Skab et unikt kamera-ikon (Lille rød cirkel)
    const camIcon = L.divIcon({
        className: 'custom-cam-icon',
        html: `<div style="background:#ff3b30; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px rgba(255,59,48,0.5);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    const marker = L.marker([lat, lng], { icon: camIcon }).addTo(map);
    
    // Popup til at fjerne kameraet igen
    marker.bindPopup(`
        <div style="text-align:center; padding:5px;">
            <b style="display:block; margin-bottom:8px;">Fartkamera</b>
            <button onclick="removeMarker(${lat}, ${lng})" style="background:#ff3b30; color:white; border:none; padding:8px 12px; border-radius:10px; font-weight:600; font-size:12px;">Fjern markør</button>
        </div>
    `);

    // Gem lokalt
    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved.push({ lat, lng });
    localStorage.setItem('rb_cameras', JSON.stringify(saved));
}

function loadSavedMarkers() {
    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved.forEach(cam => {
        const camIcon = L.divIcon({
            className: 'custom-cam-icon',
            html: `<div style="background:#ff3b30; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>`,
            iconSize: [12, 12]
        });
        L.marker([cam.lat, cam.lng], { icon: camIcon }).addTo(map)
         .bindPopup(`<div style="text-align:center;"><button onclick="removeMarker(${cam.lat}, ${cam.lng})" style="background:#ff3b30; color:white; border:none; padding:8px; border-radius:8px;">Fjern Kamera</button></div>`);
    });
}

function removeMarker(lat, lng) {
    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved = saved.filter(c => c.lat !== lat && c.lng !== lng);
    localStorage.setItem('rb_cameras', JSON.stringify(saved));
    location.reload(); // Genindlæs for at fjerne fra kortet
}

function centerOnMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            map.setView([lat, lon], 15);
            
            // Marker din egen position
            L.circle([lat, lon], {
                color: '#007aff',
                fillColor: '#007aff',
                fillOpacity: 0.2,
                radius: 30
            }).addTo(map);
        }, () => {
            alert("Giv tilladelse til GPS for at finde din position.");
        });
    }
}

// --- TEMA & PROFIL LOGIK ---
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('rb_theme', isDark ? 'dark' : 'light');
}

function applyTheme() {
    const theme = localStorage.getItem('rb_theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.checked = true;
    }
}

function loadProfile() {
    const vDisplay = document.getElementById('display-vehicle');
    const savedVehicle = localStorage.getItem('rb_vehicle');
    if (vDisplay) vDisplay.innerText = savedVehicle || "Vælg maskine";
}

function editVehicle() {
    const current = localStorage.getItem('rb_vehicle') || "";
    const val = prompt("Hvilken maskine kører du på?", current);
    if (val !== null && val.trim() !== "") {
        localStorage.setItem('rb_vehicle', val.trim());
        loadProfile();
    }
}

// --- GEAR SCANNER ---
function processGearImage(input) {
    const preview = document.getElementById('scan-view');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (preview) preview.style.backgroundImage = `url(${e.target.result})`;
            alert("Billede modtaget. Storebror analyserer dit gear...");
            // Her kunne man sende e.target.result til Gemini Vision API hvis man ville
        };
        reader.readAsDataURL(input.files[0]);
    }
}
