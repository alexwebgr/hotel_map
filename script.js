// ── Tile layers ──
const tileLayers = {
  satellite: L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    subdomains: ['0','1','2','3'], maxZoom: 21, maxNativeZoom: 21, attribution: '© Google'
  }),
  hybrid: L.tileLayer('https://mt{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    subdomains: ['0','1','2','3'], maxZoom: 21, maxNativeZoom: 21, attribution: '© Google'
  }),
  street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 21, maxNativeZoom: 19, attribution: '© OpenStreetMap'
  })
};

const map = L.map('map', { zoomControl: true, layers: [tileLayers.hybrid] })
  .setView([35.5138, 24.0180], 18);

// ── State ──
let pins = [];
let pending = null;
let ghostMarker = null;
let isLoggedIn = false;
let addPinEnabled = false;
let currentLayer = 'hybrid';

// ── DOM refs (populated in initElements) ──
let pinTypeSelect, nameInput, coordsDisplay, searchInput,
    exportBtn, importBtn, importInput, authToggle, showPinsBtn, addPinBtn,
    sidebar, sidebarContent, sidebarToggle,
    submitBtn, cancelBtn;

// ── Pin type config ──
const pinTypes = [
  { value: 'rooms',      label: 'Rooms',      color: '#01696f' },
  { value: 'pool',       label: 'Pool',       color: '#3b82f6' },
  { value: 'bar',        label: 'Bar',        color: '#8b4513' },
  { value: 'reception',  label: 'Reception',  color: '#10b981' },
  { value: 'restaurant', label: 'Restaurant', color: '#f97316' },
  { value: 'gym',        label: 'Gym',        color: '#8b5cf6' }
];

// ── Helpers ──
function getTypeConfig(value) {
  return pinTypes.find(t => t.value === value) || pinTypes[0];
}

function makeMarkerIcon(color, name) {
  const abbr = name.substring(0, 3);
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);color:#fff;font-size:9px;font-weight:700;font-family:Helvetica Neue,Helvetica,Arial,sans-serif">${abbr}</span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -32]
  });
}

function createMarker(lat, lng, typeConfig, name) {
  const marker = L.marker([lat, lng], { icon: makeMarkerIcon(typeConfig.color, name) }).addTo(map);
  marker.bindPopup(
    `<div class="pi">
      <div class="pi-name">${name}</div>
      <div class="pi-type" style="color:${typeConfig.color}">${typeConfig.label}</div>
      <div class="pi-coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
    </div>`
  );
  return marker;
}

function createGhostMarker(lat, lng, color) {
  return L.circleMarker([lat, lng], {
    radius: 6, color, fillColor: color, fillOpacity: 0.45, weight: 2
  }).addTo(map);
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

// ── Geolocation ──
navigator.geolocation && navigator.geolocation.getCurrentPosition(
  p => map.setView([p.coords.latitude, p.coords.longitude], 19),
  () => {}, { enableHighAccuracy: true, timeout: 8000 }
);

// ── Layer control ──
function setLayer(name) {
  map.removeLayer(tileLayers[currentLayer]);
  map.addLayer(tileLayers[name]);
  currentLayer = name;
  document.querySelectorAll('.layer-group .ctrl-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + name).classList.add('active');
}

// ── Auth ──
function toggleAuth() {
  isLoggedIn = !isLoggedIn;
  localStorage.setItem('hotelMapIsLoggedIn', isLoggedIn);
  if (!isLoggedIn && addPinEnabled) {
    addPinEnabled = false;
    addPinBtn.classList.remove('active');
  }
  updateAuthUI();
}

function updateAuthUI() {
  authToggle.textContent    = isLoggedIn ? 'Logout' : 'Login';
  showPinsBtn.style.display = isLoggedIn ? '' : 'none';
  addPinBtn.style.display   = isLoggedIn ? '' : 'none';
  if (!isLoggedIn) sidebar.classList.remove('open');
}

// ── Add Pins mode ──
function toggleAddPin() {
  addPinEnabled = !addPinEnabled;
  addPinBtn.classList.toggle('active', addPinEnabled);
}

// ── Map click ──
map.on('click', e => {
  if (addPinEnabled && isLoggedIn) openModal(e.latlng.lat, e.latlng.lng);
});

// ── Modal ──
function openModal(lat, lng) {
  pending = { lat, lng };
  coordsDisplay.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  nameInput.value = '';
  pinTypeSelect.value = 'rooms';
  document.getElementById('backdrop').classList.add('open');
  if (ghostMarker) map.removeLayer(ghostMarker);
  ghostMarker = createGhostMarker(lat, lng, getTypeConfig('rooms').color);
  pinTypeSelect.addEventListener('change', updateGhostMarkerColor);
  setTimeout(() => nameInput.focus(), 260);
}

function updateGhostMarkerColor() {
  if (!pending) return;
  if (ghostMarker) map.removeLayer(ghostMarker);
  ghostMarker = createGhostMarker(pending.lat, pending.lng, getTypeConfig(pinTypeSelect.value).color);
}

function closeModal() {
  document.getElementById('backdrop').classList.remove('open');
  if (ghostMarker) { map.removeLayer(ghostMarker); ghostMarker = null; }
  pending = null;
  pinTypeSelect.removeEventListener('change', updateGhostMarkerColor);
}

function submitPin() {
  if (!isLoggedIn) { toast('Please log in to add pins'); return; }
  const name = nameInput.value.trim() || `Pin ${pins.length + 1}`;
  const { lat, lng } = pending;
  const typeConfig = getTypeConfig(pinTypeSelect.value);
  const marker = createMarker(lat, lng, typeConfig, name);
  pins.push({ name, lat, lng, type: typeConfig.value, marker });
  closeModal();
  updatePinPills();
  updateExportBtn();
  savePins();
  toast(`${name} added`);
}

// ── Pins ──
function updatePinPills() {
  if (!sidebarContent) return;
  if (!pins.length) {
    sidebarContent.innerHTML = '<span class="empty">No pins yet</span>';
    return;
  }
  sidebarContent.innerHTML = pins.map((p, i) => {
    const color = getTypeConfig(p.type).color;
    return `<div class="chip" data-index="${i}" style="border-color:${color}">
      <span class="chip-label" style="color:${color}">${p.name}</span>
      <span class="chip-x" data-del="${i}">✕</span>
    </div>`;
  }).join('');

  sidebarContent.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', e => {
      if (!e.target.closest('.chip-x')) flyTo(+chip.dataset.index);
    });
  });
  sidebarContent.querySelectorAll('.chip-x').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); del(+btn.dataset.del); });
  });
}

function flyTo(i) {
  map.flyTo([pins[i].lat, pins[i].lng], 20, { duration: 0.7 });
  pins[i].marker.openPopup();
}

function highlightChip(i) {
  const chip = sidebarContent.querySelector(`.chip[data-index="${i}"]`);
  if (!chip) return;
  chip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  chip.classList.add('highlight');
  setTimeout(() => chip.classList.remove('highlight'), 800);
}

function del(i) {
  if (!isLoggedIn) { toast('Please log in to delete pins'); return; }
  map.removeLayer(pins[i].marker);
  pins.splice(i, 1);
  updatePinPills();
  updateExportBtn();
  savePins();
  toast('Pin removed');
}

function updateExportBtn() {
  exportBtn.disabled = pins.length === 0;
}

// ── Import ──
function handleImport(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const gj = JSON.parse(e.target.result);
      const features = (gj.features || []).filter(f =>
        f.geometry && f.geometry.type === 'Point' && f.geometry.coordinates?.length >= 2
      );
      if (!features.length) { toast('No point features found'); return; }
      features.forEach(f => {
        const [lng, lat] = f.geometry.coordinates;
        const name = f.properties?.name || `Pin ${pins.length + 1}`;
        const typeConfig = getTypeConfig(f.properties?.type);
        const marker = createMarker(lat, lng, typeConfig, name);
        pins.push({ name, lat, lng, type: typeConfig.value, marker });
      });
      updatePinPills();
      updateExportBtn();
      savePins();
      toast(`${features.length} pin${features.length > 1 ? 's' : ''} imported`);
    } catch {
      toast('Invalid GeoJSON file');
    }
    importInput.value = '';
  };
  reader.readAsText(file);
}

// ── Export ──
function doExport() {
  if (!isLoggedIn) { toast('Please log in to export'); return; }
  const gj = {
    type: 'FeatureCollection',
    features: pins.map(p => ({
      type: 'Feature',
      properties: { name: p.name, type: p.type },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
    }))
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(gj, null, 2)], { type: 'application/json' }));
  a.download = 'hotel_map.geojson';
  a.click();
  toast('hotel_map.geojson downloaded');
}

// ── Search (Enter key only) ──
function handleSearch() {
  const term = searchInput.value.toLowerCase().trim();
  if (!term) { toast('Enter a search term'); return; }
  const i = pins.findIndex(p =>
    p.name.toLowerCase().includes(term) || p.type.toLowerCase().includes(term)
  );
  if (i === -1) { toast('No pins found'); return; }
  map.flyTo([pins[i].lat, pins[i].lng], 20, { duration: 0.7 });
  pins[i].marker.openPopup();
  searchInput.value = '';
}

// ── Sidebar ──
function toggleSidebar() {
  sidebar.classList.toggle('open');
}

// ── Persistence ──
function savePins() {
  localStorage.setItem('hotelMapPins', JSON.stringify(
    pins.map(({ name, lat, lng, type }) => ({ name, lat, lng, type }))
  ));
}

function loadPins() {
  try {
    const saved = JSON.parse(localStorage.getItem('hotelMapPins') || '[]');
    pins = saved.map(s => {
      const typeConfig = getTypeConfig(s.type);
      return { name: s.name, lat: s.lat, lng: s.lng, type: s.type, marker: createMarker(s.lat, s.lng, typeConfig, s.name) };
    });
  } catch (e) {
    console.error('loadPins:', e);
    pins = [];
  }
}

// ── Init ──
function initElements() {
  pinTypeSelect  = document.getElementById('pinTypeSelect');
  nameInput      = document.getElementById('nameInput');
  coordsDisplay  = document.getElementById('coords');
  searchInput    = document.getElementById('searchInput');
  exportBtn      = document.getElementById('exportBtn');
  importBtn      = document.getElementById('importBtn');
  importInput    = document.getElementById('importInput');
  authToggle     = document.getElementById('auth-toggle');
  showPinsBtn    = document.getElementById('show-pins-btn');
  addPinBtn      = document.getElementById('addPinBtn');
  sidebar        = document.getElementById('sidebar');
  sidebarContent = document.getElementById('sidebarContent');
  sidebarToggle  = document.getElementById('sidebarToggle');
  submitBtn      = document.getElementById('submitBtn');
  cancelBtn      = document.getElementById('cancelBtn');

  // Layer buttons
  ['satellite', 'hybrid', 'street'].forEach(name =>
    document.getElementById('btn-' + name).addEventListener('click', () => setLayer(name))
  );

  // Top controls
  addPinBtn.addEventListener('click', toggleAddPin);
  authToggle.addEventListener('click', toggleAuth);
  showPinsBtn.addEventListener('click', toggleSidebar);
  exportBtn.addEventListener('click', doExport);
  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', e => handleImport(e.target.files[0]));
  sidebarToggle.addEventListener('click', toggleSidebar);

  // Modal
  submitBtn.addEventListener('click', submitPin);
  cancelBtn.addEventListener('click', closeModal);
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitPin();
    if (e.key === 'Escape') closeModal();
  });
  document.getElementById('backdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('backdrop')) closeModal();
  });

  // Search — Enter key only, no action while typing
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initElements();
  isLoggedIn = localStorage.getItem('hotelMapIsLoggedIn') === 'true';
  loadPins();
  updatePinPills();
  updateAuthUI();
});
