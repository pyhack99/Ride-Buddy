/**
 * RIDE BUDDY - CORE LOGIC v2.4.0
 * System: Gemini AI Integration, Community Radar & PWA Guard
 */

// 1. KONFIGURATION
const GEMINI_API_KEY = "AIzaSyA6YyDo4FcwZo2kkFMNWC87X70ih2rHYNI"; // Indsæt din nøgle fra Google AI Studio
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 2. INITIALISERING
document.addEventListener('DOMContentLoaded', () => {
    // Kør installationstjek med det samme
    checkInstallation(); 
    
    // Setup tema og profil
    applyTheme();
    loadProfile();
    
    // Hvis vi er på radar-siden, start kortet
    if (document.getElementById('map')) {
        initRadarMap();
    }
});

// --- WEB APP / INSTALLATION CHECK ---
function checkInstallation() {
    // Tjek 1: Er det iOS Standalone? (Vigtigst for iPhone)
    const isIOSStandalone = window.navigator.standalone === true;

    // Tjek 2: Er det Android/Chrome Standalone?
    const isPWAStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Tjek 3: Er vi på install-siden i forvejen?
    const isInstallPage = window.location.pathname.includes('install.html');

    // DEBUG LOG (Kan ses i browser konsollen)
    console.log("App Status - iOS:", isIOSStandalone, "PWA:", isPWAStandalone);

    // HVIS vi er gemt på hjemskærmen (Standalone), så stop her og lad brugeren blive
    if (isIOSStandalone || isPWAStandalone) {
        return; 
    }

    // HVIS vi er i en almindelig browser og IKKE på install-siden, så send dem til guiden
    if (!isInstallPage) {
        window.location.href = 'install.html';
    }
}

// --- GEMINI AI INTEGRATION ---
async function getAIRecommendation() {
    const output = document.getElementById('ai-response');
    const vehicle = localStorage.getItem('rb_vehicle') || "Motorcykel";
    const country = localStorage.getItem('rb_country') || "Danmark";
    
    if (output) output.innerText = "Storebror analyserer forholdene...";

    const prompt = `Du er Storebror AI, en MC-ekspert. Giv en lynhurtig køre-briefing (maks 3 korte sætninger) til en rytter på en ${vehicle} i ${country}. Ingen emojis.`;

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
        if (output) output.innerText = "Fejl i AI-forbindelse. Kør forsigtigt.";
    }
}

// --- LIVE RADAR (KORT & KAMERAER) ---
let map;

function initRadarMap() {
    // Start kortet (Default på KBH)
    map = L.map('map', { zoomControl: false }).setView([55.6761, 12.5683], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{y}.png').addTo(map);

    loadSavedMarkers();

    // Tilføj kamera ved klik
    map.on('click', function(e) {
        if (confirm("Rapporter et fartkamera her?")) {
            addCameraMarker(e.latlng.lat, e.latlng.lng);
        }
    });
}

function addCameraMarker(lat, lng) {
    // Rødt prik-ikon
    const camIcon = L.divIcon({
        className: 'custom-cam-icon',
        html: `<div style="background:#ff3b30; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });

    const marker = L.marker([lat, lng], { icon: camIcon }).addTo(map);
    marker.bindPopup(`
        <div style="text-align:center;">
            <b style="display:block;margin-bottom:5px;">Fartkamera</b>
            <button onclick="removeMarker(${lat}, ${lng})" style="background:var(--danger); color:white; border:none; padding:8px; border-radius:8px; font-weight:bold;">Fjern</button>
        </div>
    `);

    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved.push({ lat, lng });
    localStorage.setItem('rb_cameras', JSON.stringify(saved));
}

function loadSavedMarkers() {
    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved.forEach(cam => {
        const camIcon = L.divIcon({
            className: 'custom-cam-icon',
            html: `<div style="background:#ff3b30; width:14px; height:14px; border-radius:50%; border:2px solid white;"></div>`,
            iconSize: [14, 14]
        });
        L.marker([cam.lat, cam.lng], { icon: camIcon }).addTo(map)
         .bindPopup(`<div style="text-align:center;"><button onclick="removeMarker(${cam.lat}, ${cam.lng})" style="background:var(--danger); color:white; border:none; padding:8px; border-radius:8px;">Fjern</button></div>`);
    });
}

function removeMarker(lat, lng) {
    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved = saved.filter(c => c.lat !== lat && c.lng !== lng);
    localStorage.setItem('rb_cameras', JSON.stringify(saved));
    location.reload(); 
}

function centerOnMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 15);
            L.circle([pos.coords.latitude, pos.coords.longitude], { color: '#007aff', radius: 25 }).addTo(map);
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
            alert("Billede modtaget. Storebror analyserer dit gear via Gemini...");
        };
        reader.readAsDataURL(input.files[0]);
    }
}
