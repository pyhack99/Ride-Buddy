/**
 * RIDE BUDDY - CORE LOGIC v2.4.0
 * Fixed: PWA redirect, stability, cleaner structure
 */

// 1. CONFIG
// ⚠️ MOVE THIS TO BACKEND LATER
const GEMINI_API_KEY = "AIzaSyA6YyDo4FcwZo2kkFMNWC87X70ih2rHYNI";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 2. INIT
document.addEventListener('DOMContentLoaded', () => {
    checkInstallation();
    applyTheme();
    loadProfile();

    if (document.getElementById('map')) {
        initRadarMap();
    }
});


// ============================
// PWA CHECK (FIXED)
// ============================
function checkInstallation() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = window.navigator.standalone === true;
    const isInstallPage = window.location.pathname.includes('install.html');
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

    console.log("Standalone:", isStandalone || isIOSStandalone);

    // ONLY redirect on mobile
    if (isMobile && !isStandalone && !isIOSStandalone && !isInstallPage) {
        window.location.href = 'install.html';
    }
}


// ============================
// GEMINI AI
// ============================
async function getAIRecommendation() {
    const output = document.getElementById('ai-response');
    const vehicle = localStorage.getItem('rb_vehicle') || "Motorcykel";
    const country = localStorage.getItem('rb_country') || "Danmark";

    if (output) output.innerText = "Storebror analyserer...";

    const prompt = `Du er Storebror AI, en MC-ekspert. Giv en meget kort sikkerheds-briefing (maks 3 sætninger) til en rytter på en ${vehicle} i ${country} i dag.`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (output) {
            output.innerText = aiText || "Ingen respons fra AI.";
        }

    } catch (e) {
        if (output) output.innerText = "AI offline.";
        console.error(e);
    }
}


// ============================
// MAP / RADAR
// ============================
let map;

function initRadarMap() {
    map = L.map('map', { zoomControl: false }).setView([55.6761, 12.5683], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{y}.png').addTo(map);

    loadSavedMarkers();

    map.on('click', (e) => {
        if (confirm("Rapportér fartkamera her?")) {
            addCameraMarker(e.latlng.lat, e.latlng.lng);
        }
    });
}

function createCamIcon() {
    return L.divIcon({
        className: 'custom-cam-icon',
        html: `<div style="
            background:#ff3b30;
            width:12px;
            height:12px;
            border-radius:50%;
            border:2px solid white;
            box-shadow: 0 0 10px rgba(255,59,48,0.5);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
}

function addCameraMarker(lat, lng) {
    const marker = L.marker([lat, lng], { icon: createCamIcon() }).addTo(map);

    marker.bindPopup(`
        <div style="text-align:center;">
            <b>Fartkamera</b><br><br>
            <button onclick="removeMarker(${lat}, ${lng})"
                style="background:#ff3b30;color:white;border:none;padding:6px 10px;border-radius:8px;">
                Fjern
            </button>
        </div>
    `);

    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];
    saved.push({ lat, lng });
    localStorage.setItem('rb_cameras', JSON.stringify(saved));
}

function loadSavedMarkers() {
    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];

    saved.forEach(cam => {
        L.marker([cam.lat, cam.lng], { icon: createCamIcon() })
            .addTo(map)
            .bindPopup(`
                <button onclick="removeMarker(${cam.lat}, ${cam.lng})">
                    Fjern Kamera
                </button>
            `);
    });
}

function removeMarker(lat, lng) {
    let saved = JSON.parse(localStorage.getItem('rb_cameras')) || [];

    saved = saved.filter(c => c.lat !== lat || c.lng !== lng);

    localStorage.setItem('rb_cameras', JSON.stringify(saved));

    location.reload();
}

function centerOnMe() {
    if (!navigator.geolocation) {
        alert("GPS ikke understøttet.");
        return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;

        map.setView([latitude, longitude], 15);

        L.circle([latitude, longitude], {
            color: '#007aff',
            fillColor: '#007aff',
            fillOpacity: 0.2,
            radius: 30
        }).addTo(map);

    }, () => {
        alert("Tillad GPS.");
    });
}


// ============================
// THEME
// ============================
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


// ============================
// PROFILE
// ============================
function loadProfile() {
    const vDisplay = document.getElementById('display-vehicle');
    const savedVehicle = localStorage.getItem('rb_vehicle');

    if (vDisplay) {
        vDisplay.innerText = savedVehicle || "Vælg maskine";
    }
}

function editVehicle() {
    const current = localStorage.getItem('rb_vehicle') || "";

    const val = prompt("Hvilken maskine kører du på?", current);

    if (val && val.trim()) {
        localStorage.setItem('rb_vehicle', val.trim());
        loadProfile();
    }
}


// ============================
// GEAR SCANNER
// ============================
function processGearImage(input) {
    const preview = document.getElementById('scan-view');

    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = (e) => {
            if (preview) {
                preview.style.backgroundImage = `url(${e.target.result})`;
            }

            alert("Analyserer gear...");
        };

        reader.readAsDataURL(input.files[0]);
    }
}
