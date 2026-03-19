/**
 * RIDE BUDDY - CORE LOGIC v2.2.0
 * System: Gemini AI Integration, Standalone Check & Live Radar
 */

// 1. KONFIGURATION
const GEMINI_API_KEY = "AIzaSyA6YyDo4FcwZo2kkFMNWC87X70ih2rHYNI"; // Indsæt din nøgle fra Google AI Studio
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 2. INITIALISERING
document.addEventListener('DOMContentLoaded', () => {
    checkInstallation(); 
    applyTheme();
    loadProfile();
    
    // Start kortet hvis vi er på radar-siden
    if (document.getElementById('map')) {
        initRadarMap();
    }
});

// --- WEB APP INSTALLATIONSTJEK ---
function checkInstallation() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isInstallPage = window.location.pathname.includes('install.html');

    if (!isStandalone && !isInstallPage) {
        window.location.href = 'install.html';
    }
}

// --- TEMA & PROFIL ---
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

// --- GEMINI AI INTEGRATION (ERSTATTER OPENAI) ---
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
        if (output) output.innerText = "Kunne ikke forbinde til Gemini AI. Tjek din API nøgle.";
    }
}

// --- LIVE RADAR (LEAFLET) ---
let map;

function initRadarMap() {
    // Start kortet - centrerer på sidst kendte eller KBH
    map = L.map('map', { zoomControl: false }).setView([55.6761, 12.5683], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{y}.png').addTo(map);

    loadSavedMarkers();

    // Rapporter kamera ved klik
    map.on('click', function(e) {
        if (confirm("Rapporter fartkamera her?")) {
            addCameraMarker(e.latlng.lat, e.latlng.lng);
        }
    });
}

function addCameraMarker(lat, lng) {
    const camIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background:#ff3b30; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    const marker = L.marker([lat, lng], { icon: camIcon }).addTo(map);
    marker.bindPopup(`<button onclick="removeMarker(${lat}, ${lng})" style="background:var(--danger); color:white; border:none; padding:8px; border-radius:8px;">Fjern Kamera</button>`);

    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved.push({ lat, lng });
    localStorage.setItem('rb_cameras', JSON.stringify(saved));
}

function loadSavedMarkers() {
    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved.forEach(cam => {
        const camIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background:#ff3b30; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>`,
            iconSize: [12, 12]
        });
        L.marker([cam.lat, cam.lng], { icon: camIcon }).addTo(map)
         .bindPopup(`<button onclick="removeMarker(${cam.lat}, ${cam.lng})" style="background:var(--danger); color:white; border:none; padding:8px; border-radius:8px;">Fjern Kamera</button>`);
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
            L.circle([pos.coords.latitude, pos.coords.longitude], { color: '#007aff', radius: 20 }).addTo(map);
        });
    }
}

// --- GEAR SCANNER ---
function processGearImage(input) {
    const preview = document.getElementById('scan-view');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (preview) preview.style.backgroundImage = `url(${e.target.result})`;
            alert("Billede modtaget. Storebror analyserer dit gear via Gemini Vision...");
        };
        reader.readAsDataURL(input.files[0]);
    }
}
