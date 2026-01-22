/**
 * AirAware - Professional Edition
 * Logic: API Integration, Geolocation, Navigation
 */

const GEO_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const AQI_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const DEFAULT_CITY = 'London';

// State
let appState = {
    currentCity: null,
    completedExercises: [],
    lastVisitDate: null,
    category: 'weight-loss'
};

// Exercise Content (Icons Allowed)
const EXERCISE_DB = {
    'weight-loss': [
        { id: 'wl1', name: 'Jumping Jacks', duration: '2 mins', emoji: '🏃' },
        { id: 'wl2', name: 'High Knees', duration: '3 mins', emoji: '🦵' },
        { id: 'wl3', name: 'Burpees', duration: '1 min', emoji: '🔥' },
        { id: 'wl4', name: 'Squats', duration: '2 mins', emoji: '🏋️' }
    ],
    'breathing': [
        { id: 'br1', name: 'Deep Belly', duration: '5 mins', emoji: '🧘' },
        { id: 'br2', name: '4-7-8 Rhythm', duration: '4 mins', emoji: '🌬️' },
        { id: 'br3', name: 'Box Breathing', duration: '3 mins', emoji: '⬜' }
    ],
    'yoga': [
        { id: 'yg1', name: 'Sun Salutation', duration: '5 mins', emoji: '☀️' },
        { id: 'yg2', name: 'Tree Pose', duration: '2 mins', emoji: '🌳' },
        { id: 'yg3', name: 'Child Plot', duration: '3 mins', emoji: '👶' }
    ],
    'indoor': [
        { id: 'in1', name: 'Push-ups', duration: '3 sets', emoji: '💪' },
        { id: 'in2', name: 'Plank', duration: '60 sec', emoji: '📏' },
        { id: 'in3', name: 'Wall Sit', duration: '60 sec', emoji: '🧱' }
    ]
};

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    loadState();
    setupEvents();
    checkDailyReset();

    // Initial Render
    renderExercises(appState.category);
    updateProgress();

    // Load Data
    if (appState.currentCity) fetchAQI(appState.currentCity);
    else getUserLocation();

    // Loader
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) loader.classList.add('fade-out');
    }, 600);
}

function loadState() {
    const s = localStorage.getItem('airaware_v2');
    if (s) appState = { ...appState, ...JSON.parse(s) };
}

function saveState() {
    localStorage.setItem('airaware_v2', JSON.stringify(appState));
}

function checkDailyReset() {
    const today = new Date().toDateString();
    if (appState.lastVisitDate !== today) {
        appState.completedExercises = [];
        appState.lastVisitDate = today;
        saveState();
    }
}

function setupEvents() {
    // Nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const section = btn.dataset.section;
            switchSection(section);
            if (section === 'cities') loadGlobalCities();
        });
    });

    // Search
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('city-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    document.getElementById('locate-btn').addEventListener('click', getUserLocation);

    // Tabs
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.category = btn.dataset.category;
            renderExercises(appState.category);
        });
    });

    // Reset
    document.getElementById('reset-progress').addEventListener('click', () => {
        if (confirm('Reset daily progress?')) {
            appState.completedExercises = [];
            saveState();
            renderExercises(appState.category);
            updateProgress();
        }
    });
}

function handleSearch() {
    const q = document.getElementById('city-search').value.trim();
    if (q) fetchAQI(q);
}

function switchSection(id) {
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(id);
    target.style.display = 'block';
    setTimeout(() => target.classList.add('active'), 10);
    window.scrollTo(0, 0);
}

// API
async function fetchAQI(city) {
    setStatus('Loading...');
    try {
        const geoRes = await fetch(`${GEO_API_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();

        if (!geoData.results) throw new Error('City not found');

        const { latitude, longitude, name, country } = geoData.results[0];
        const label = `${name}, ${country}`;

        await getAirData(latitude, longitude, label);

        appState.currentCity = name;
        saveState();

    } catch (e) {
        console.error(e);
        showError('Could not load data. Please try another city.');
    } finally {
        // Clear loading status purely if needed, but updateDashboard handles it
    }
}

async function getAirData(lat, lon, label) {
    const url = `${AQI_API_URL}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5`;
    const res = await fetch(url);
    const data = await res.json();

    updateDashboard(data.current, label);
}

async function getUserLocation() {
    if (!navigator.geolocation) return fetchAQI(DEFAULT_CITY);

    setStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
        pos => getAirData(pos.coords.latitude, pos.coords.longitude, "Your Location"),
        () => fetchAQI(DEFAULT_CITY)
    );
}

async function loadGlobalCities() {
    const container = document.getElementById('cities-container');
    if (container.children.length > 0) return;

    container.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8;">Loading rankings...</div>';

    const cities = [
        { name: 'New York', lat: 40.71, lon: -74.00 },
        { name: 'London', lat: 51.50, lon: -0.12 },
        { name: 'Beijing', lat: 39.90, lon: 116.40 },
        { name: 'Delhi', lat: 28.61, lon: 77.20 },
        { name: 'Tokyo', lat: 35.68, lon: 139.69 },
        { name: 'Paris', lat: 48.85, lon: 2.35 },
        { name: 'Dubai', lat: 25.20, lon: 55.27 },
        { name: 'Los Angeles', lat: 34.05, lon: -118.24 }
    ];

    try {
        const promises = cities.map(c =>
            fetch(`${AQI_API_URL}?latitude=${c.lat}&longitude=${c.lon}&current=us_aqi`)
                .then(r => r.json())
                .then(d => ({ ...d, name: c.name }))
        );

        const results = await Promise.all(promises);
        const sorted = results.sort((a, b) => b.current.us_aqi - a.current.us_aqi); // Highest pollution first

        container.innerHTML = '';
        sorted.forEach((item, idx) => {
            const aqi = item.current.us_aqi;
            const meta = getAQIMeta(aqi);

            const div = document.createElement('div');
            div.className = 'city-item';
            div.innerHTML = `
                <div style="display:flex; gap:12px; align-items:center;">
                    <span style="font-weight:700; color:#cbd5e1; width:24px;">${idx + 1}</span>
                    <span style="font-weight:600;">${item.name}</span>
                </div>
                <div style="text-align:right;">
                    <span style="font-weight:700; color:${getHexColor(meta.status)}">${aqi}</span>
                    <span style="font-size:0.75rem; display:block; color:#94a3b8;">AQI</span>
                </div>
            `;
            div.addEventListener('click', () => { fetchAQI(item.name); switchSection('home'); });
            container.appendChild(div);
        });

    } catch (e) {
        container.innerHTML = 'Failed to load rankings.';
    }
}

// Helpers
function getAQIMeta(aqi) {
    if (aqi <= 50) return { label: 'Good', status: 'good', class: 'border-good' };
    if (aqi <= 100) return { label: 'Moderate', status: 'moderate', class: 'border-moderate' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive', status: 'unhealthy', class: 'border-unhealthy' };
    if (aqi <= 200) return { label: 'Unhealthy', status: 'unhealthy', class: 'border-unhealthy' };
    return { label: 'Severe', status: 'severe', class: 'border-severe' };
}

function getHexColor(status) {
    const map = { good: '#10B981', moderate: '#F59E0B', unhealthy: '#F97316', severe: '#EF4444' };
    return map[status] || '#cbd5e1';
}

function updateDashboard(data, label) {
    const { us_aqi, pm10, pm2_5 } = data;
    const meta = getAQIMeta(us_aqi);

    // DOM
    document.getElementById('city-name').textContent = label;
    document.getElementById('last-updated').textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    document.getElementById('aqi-value').textContent = us_aqi;

    // Status Badge
    const badge = document.getElementById('aqi-status');
    badge.textContent = meta.label;
    badge.className = `status-badge status-${meta.status}`;

    // Card Border
    const card = document.getElementById('aqi-card');
    card.className = `card aqi-hero ${meta.class}`;

    // Pollutants
    document.getElementById('pm25').textContent = pm2_5;
    document.getElementById('pm10').textContent = pm10;

    // Insights
    updateInsights(meta.status);
    document.getElementById('error-message').classList.add('hidden');
}

function updateInsights(status) {
    const doList = document.getElementById('advice-do');
    const avoidList = document.getElementById('advice-avoid');

    let advice = { do: [], avoid: [] };

    // Professional Copy
    if (status === 'good') {
        advice.do = ['Ventilate indoor spaces', 'Outdoor physical activities'];
        advice.avoid = ['No restrictions'];
    } else if (status === 'moderate') {
        advice.do = ['Monitor sensitive individuals'];
        advice.avoid = ['Burning waste outdoors'];
    } else if (status === 'unhealthy') {
        advice.do = ['Wear N95 masks outdoors', 'Run air purifiers'];
        advice.avoid = ['Prolonged outdoor exertion', 'High traffic zones'];
    } else {
        advice.do = ['Remain indoors', 'Seal windows', 'Use air filtration'];
        advice.avoid = ['All outdoor activities'];
    }

    doList.innerHTML = advice.do.map(i => `<li>${i}</li>`).join('');
    avoidList.innerHTML = advice.avoid.map(i => `<li>${i}</li>`).join('');
}

// Exercises
function renderExercises(cat) {
    const container = document.getElementById('exercise-container');
    container.innerHTML = '';

    EXERCISE_DB[cat].forEach(ex => {
        const isDone = appState.completedExercises.includes(ex.id);
        const div = document.createElement('div');
        div.className = 'exercise-card';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:16px;">
                <div class="ex-icon">${ex.emoji}</div>
                <div class="ex-info">
                    <h4 style="color:${isDone ? '#10B981' : 'var(--text-primary)'}">${ex.name}</h4>
                    <span>${ex.duration}</span>
                </div>
            </div>
            <button class="check-btn ${isDone ? 'done' : ''}" onclick="toggleEx('${ex.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
        `;
        container.appendChild(div);
    });
}

window.toggleEx = function (id) {
    const idx = appState.completedExercises.indexOf(id);
    if (idx === -1) appState.completedExercises.push(id);
    else appState.completedExercises.splice(idx, 1);

    saveState();
    renderExercises(appState.category);
    updateProgress();
};

function updateProgress() {
    const count = appState.completedExercises.length;
    document.getElementById('progress-count').textContent = `${count} Done Today`;

    // Animate Bar (Goal: 5 Exercises)
    const pct = Math.min((count / 5) * 100, 100);
    const bar = document.getElementById('progress-fill');
    if (bar) bar.style.width = `${pct}%`;
}

function setStatus(msg) {
    document.getElementById('aqi-status').textContent = msg;
    document.getElementById('aqi-status').className = 'status-badge';
}

function showError(msg) {
    const el = document.getElementById('error-message');
    el.textContent = msg;
    el.classList.remove('hidden');
}
