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

const map = L.map('map', { zoomControl: true, layers: [tileLayers.satellite] })
        .setView([35.5138, 24.0180], 18);

let currentLayer = 'satellite';
function setLayer(name) {
    map.removeLayer(tileLayers[currentLayer]);
    map.addLayer(tileLayers[name]);
    currentLayer = name;
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + name).classList.add('active');
}

navigator.geolocation && navigator.geolocation.getCurrentPosition(
        p => map.setView([p.coords.latitude, p.coords.longitude], 19),
        () => {}, { enableHighAccuracy: true, timeout: 8000 }
);

// Enhanced pin structure with type support
let pins = []; // Changed from 'rooms' to 'pins' for generality
let pending = null;
let ghostMarker = null;
let isLoggedIn = false; // Auth state
let pinTypeSelect = null; // Will be initialized in DOMContentLoaded

// Pin type configuration
const pinTypes = [
    { value: 'rooms', label: 'Rooms', color: '#01696f' },
    { value: 'pool', label: 'Pool', color: '#3b82f6' },
    { value: 'bar', label: 'Bar', color: '#8b4513' },
    { value: 'reception', label: 'Reception', color: '#10b981' },
    { value: 'restaurant', label: 'Restaurant', color: '#f97316' },
    { value: 'gym', label: 'Gym', color: '#8b5cf6' }
];

let addPinEnabled = false; // Toggle state for pin adding

document.addEventListener('DOMContentLoaded', () => {
    // Initialize pin type dropdown
    pinTypeSelect = document.createElement('select');
    pinTypeSelect.className = 'modal-input';
    pinTypeSelect.innerHTML = pinTypes.map(type => 
        `<option value="${type.value}">${type.label}</option>`
    ).join('');
    
    // Insert the dropdown after the name input
    const nameInput = document.getElementById('nameInput');
    nameInput.parentNode.insertBefore(pinTypeSelect, nameInput.nextSibling);
    
    // Load pins from localStorage
    loadPins();
    
    // Update UI based on loaded pins
    renderChips();
    if (pins.length > 0) {
        document.getElementById('exportBtn').disabled = false;
    }
});

map.on('click', e => {
    if (addPinEnabled) {
        openModal(e.latlng.lat, e.latlng.lng);
    }
    // If addPinEnabled is false, clicks are ignored (view-only mode)
});

function openModal(lat, lng) {
    pending = { lat, lng };
    document.getElementById('coords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('nameInput').value = '';
    pinTypeSelect.value = 'rooms'; // Reset to default
    document.getElementById('backdrop').classList.add('open');
    if (ghostMarker) map.removeLayer(ghostMarker);
    ghostMarker = L.circleMarker([lat, lng], {
        radius: 6, 
        color: pinTypes.find(t => t.value === 'rooms').color, 
        fillColor: pinTypes.find(t => t.value === 'rooms').color, 
        fillOpacity: 0.45, 
        weight: 2
    }).addTo(map);
    // Update ghost marker color when type changes
    pinTypeSelect.addEventListener('change', updateGhostMarkerColor);
    setTimeout(() => document.getElementById('nameInput').focus(), 260);
}

function updateGhostMarkerColor() {
    if (!pending) return;
    const selectedType = pinTypes.find(t => t.value === pinTypeSelect.value);
    if (ghostMarker) {
        map.removeLayer(ghostMarker);
    }
    ghostMarker = L.circleMarker([pending.lat, pending.lng], {
        radius: 6, 
        color: selectedType.color, 
        fillColor: selectedType.color, 
        fillOpacity: 0.45, 
        weight: 2
    }).addTo(map);
}

function cancel() {
    document.getElementById('backdrop').classList.remove('open');
    if (ghostMarker) { 
        map.removeLayer(ghostMarker); 
        ghostMarker = null; 
    }
    pending = null;
    // Remove event listener to prevent memory leaks
    pinTypeSelect.removeEventListener('change', updateGhostMarkerColor);
}

function confirm() {
    // Check authentication
    if (!isLoggedIn) {
        toast('Please log in to add pins');
        return;
    }
    
    const raw = document.getElementById('nameInput').value.trim();
    const name = raw || `Room ${pins.length + 1}`;
    const { lat, lng } = pending;
    const selectedType = pinTypes.find(t => t.value === pinTypeSelect.value);
    
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;background:${selectedType.color};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:700;font-family:Satoshi,sans-serif">${pins.length + 1}</span></div>`,
            iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-32]
        })
    }).addTo(map);
    
    marker.bindPopup(`<div class="pi"><div class="pi-name">${name}</div><div class="pi-coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</div></div>`);
    
    const pin = { 
        name, 
        lat, 
        lng, 
        type: selectedType.value,
        marker 
    };
    
    pins.push(pin);
    if (ghostMarker) { 
        map.removeLayer(ghostMarker); 
        ghostMarker = null; 
    }
    document.getElementById('backdrop').classList.remove('open');
    pending = null;
    renderChips();
    document.getElementById('exportBtn').disabled = false;
    savePins(); // Persist to localStorage
    toast(`${name} pinned`);
    
    // Remove event listener
    pinTypeSelect.removeEventListener('change', updateGhostMarkerColor);
}

document.getElementById('nameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') cancel();
});
document.getElementById('backdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('backdrop')) cancel();
});

function renderChips() {
    const el = document.getElementById('chips');
    if (!pins.length) { 
        el.innerHTML = '<span class="empty">Click the map to place a room pin</span>'; 
        return; 
    }
    el.innerHTML = pins.map((p,i) => {
        const typeConfig = pinTypes.find(t => t.value === p.type);
        return `
        <div class="chip" onclick="flyTo(${i})" style="border-color: ${typeConfig.color}; color: ${typeConfig.color};">
          ${p.name}
          <span class="chip-x" onclick="event.stopPropagation();del(${i})">✕</span>
        </div>`;
    }).join('');
}

function flyTo(i) {
    map.flyTo([pins[i].lat, pins[i].lng], 20, { duration: 0.7 });
    pins[i].marker.openPopup();
}

function del(i) {
    // Check authentication
    if (!isLoggedIn) {
        toast('Please log in to delete pins');
        return;
    }
    
    map.removeLayer(pins[i].marker);
    pins.splice(i, 1);
    renderChips();
    if (!pins.length) document.getElementById('exportBtn').disabled = true;
    savePins(); // Persist to localStorage
    toast('Pin removed');
}

function doExport() {
    // Check authentication
    if (!isLoggedIn) {
        toast('Please log in to export pins');
        return;
    }
    
    const gj = {
        type: 'FeatureCollection',
        features: pins.map(p => ({
            type: 'Feature',
            properties: { 
                name: p.name,
                type: p.type
            },
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
        }))
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(gj, null, 2)], { type: 'application/json' }));
    a.download = 'hotel_map.geojson';
    a.click();
    toast('hotel_map.geojson downloaded');
}

// Search bar implementation
let searchInput = null;

document.addEventListener('DOMContentLoaded', () => {
    // Create search input
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search pins...';
    searchInput.className = 'modal-input';
    searchInput.style.margin = '0.5rem 1rem';
    searchInput.style.width = 'calc(100% - 2rem)';
    
    // Insert search input after the handle in the panel
    const panel = document.querySelector('.panel');
    const handle = panel.querySelector('.handle');
    panel.insertBefore(searchInput, handle.nextSibling);
    
    // Add event listener for search
    searchInput.addEventListener('input', handleSearch);
});

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Update chip display to highlight matching pins
    const chipsContainer = document.getElementById('chips');
    if (!pins.length) {
        chipsContainer.innerHTML = '<span class="empty">Click the map to place a room pin</span>';
        return;
    }
    
    if (searchTerm === '') {
        // Show all chips if search is empty
        renderChips();
        return;
    }
    
    // Filter pins and create chips
    const filteredPins = pins.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.type.toLowerCase().includes(searchTerm)
    );
    
    if (filteredPins.length === 0) {
        chipsContainer.innerHTML = '<span class="empty">No pins match your search</span>';
        return;
    }
    
    chipsContainer.innerHTML = filteredPins.map((p, originalIndex) => {
        const typeConfig = pinTypes.find(t => t.value === p.type);
        return `
        <div class="chip" onclick="flyTo(${originalIndex})" style="border-color: ${typeConfig.color}; color: ${typeConfig.color};">
          ${p.name}
          <span class="chip-x" onclick="event.stopPropagation();del(${originalIndex})">✕</span>
        </div>`;
    }).join('');
}

// Pin addition toggle
let toggleButton = null;

document.addEventListener('DOMContentLoaded', () => {
    // Create toggle button
    toggleButton = document.createElement('button');
    toggleButton.className = 'layer-btn';
    toggleButton.id = 'toggle-add-pins';
    toggleButton.textContent = 'Add Pins';
    toggleButton.style.marginLeft = '0.5rem';
    
    // Insert toggle button after the layer buttons
    const layersContainer = document.querySelector('.layers');
    layersContainer.appendChild(toggleButton);
    
    // Add event listener
    toggleButton.addEventListener('click', toggleAddPinMode);
});

function toggleAddPinMode() {
    addPinEnabled = !addPinEnabled;
    if (addPinEnabled) {
        toggleButton.textContent = 'View Only';
        toggleButton.classList.add('active');
        toast('Pin adding enabled - click on map to add pins');
    } else {
        toggleButton.textContent = 'Add Pins';
        toggleButton.classList.remove('active');
        toast('Pin adding disabled - view only mode');
    }
}

// Login/logout button
let authButton = null;

document.addEventListener('DOMContentLoaded', () => {
    // Create auth button
    authButton = document.createElement('button');
    authButton.className = 'layer-btn';
    authButton.id = 'auth-toggle';
    authButton.textContent = 'Login';
    authButton.style.marginLeft = '0.5rem';
    
    // Insert auth button after the toggle button
    const layersContainer = document.querySelector('.layers');
    layersContainer.appendChild(authButton);
    
    // Add event listener
    authButton.addEventListener('click', toggleAuth);
});

function toggleAuth() {
    isLoggedIn = !isLoggedIn;
    if (isLoggedIn) {
        authButton.textContent = 'Logout';
        toast('Logged in successfully');
        // Enable export button if there are pins
        if (pins.length > 0) {
            document.getElementById('exportBtn').disabled = false;
        }
    } else {
        authButton.textContent = 'Login';
        toast('Logged out');
        // Disable export button when logged out
        document.getElementById('exportBtn').disabled = true;
    }
}

// LocalStorage persistence
function loadPins() {
    const savedPins = localStorage.getItem('hotelMapPins');
    if (savedPins) {
        try {
            const parsed = JSON.parse(savedPins);
            // Reconstruct pins with markers
            pins = parsed.map(savedPin => {
                // Create marker for each pin
                const typeConfig = pinTypes.find(t => t.value === savedPin.type) || pinTypes[0]; // Default to rooms
                const marker = L.marker([savedPin.lat, savedPin.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div style="width:28px;height:28px;background:${typeConfig.color};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:700;font-family:Satoshi,sans-serif">${pins.indexOf(savedPin) + 1}</span></div>`,
                        iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-32]
                    })
                }).addTo(map);
                
                marker.bindPopup(`<div class="pi"><div class="pi-name">${savedPin.name}</div><div class="pi-coords">${savedPin.lat.toFixed(6)}, ${savedPin.lng.toFixed(6)}</div></div>`);
                
                return {
                    name: savedPin.name,
                    lat: savedPin.lat,
                    lng: savedPin.lng,
                    type: savedPin.type,
                    marker: marker
                };
            });
        } catch (e) {
            console.error('Error loading pins from localStorage:', e);
            pins = [];
        }
    } else {
        pins = [];
    }
}

function savePins() {
    // Save only the data, not the marker objects (which aren't serializable)
    const pinsData = pins.map(p => ({
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        type: p.type
    }));
    localStorage.setItem('hotelMapPins', JSON.stringify(pinsData));
}

let tt;
function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2000);
}