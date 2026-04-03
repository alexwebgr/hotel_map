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

const map = L.map('map', { zoomControl: true, layers: [tileLayers.hybrid] }) // Hybrid as default
        .setView([35.5138, 24.0180], 18);

let currentLayer = 'hybrid'; // Start with hybrid
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
let pinTypeSelect = null;
let nameInput = null;
let coordsDisplay = null;
let searchInput = null;
let searchBtn = null;
let exportBtn = null;
let authToggle = null;
let showPinsBtn = null;
let sidebar = null;
let sidebarContent = null;
let sidebarToggle = null;
let addPinEnabled = false; // Start in view mode (not adding pins)

// Pin type configuration
const pinTypes = [
    { value: 'rooms', label: 'Rooms', color: '#01696f' },
    { value: 'pool', label: 'Pool', color: '#3b82f6' },
    { value: 'bar', label: 'Bar', color: '#8b4513' },
    { value: 'reception', label: 'Reception', color: '#10b981' },
    { value: 'restaurant', label: 'Restaurant', color: '#f97316' },
    { value: 'gym', label: 'Gym', color: '#8b5cf6' }
];

// Function definitions FIRST
function updateAuthUI() {
    // Update auth button text
    if (authToggle) {
        authToggle.textContent = isLoggedIn ? 'Logout' : 'Login';
    }
    
    // Show/hide controls based on login state
    if (exportBtn) {
        exportBtn.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
    if (showPinsBtn) {
        showPinsBtn.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
    if (sidebar) {
        sidebar.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    // Save login state to localStorage
    localStorage.setItem('hotelMapIsLoggedIn', isLoggedIn);
}

function updateExportButtonState() {
    if (exportBtn) {
        // Only show export button if logged in AND there are pins
        if (isLoggedIn && pins.length > 0) {
            exportBtn.style.display = 'inline-block';
            exportBtn.disabled = false;
        } else {
            exportBtn.style.display = 'none';
        }
    }
}

function updateShowPinsButtonState() {
    if (showPinsBtn) {
        showPinsBtn.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
}

function openModal(lat, lng) {
    // Double-check login state (should already be handled by click listener)
    if (!isLoggedIn) {
        toast('Please log in to add pins');
        return;
    }
    
    pending = { lat, lng };
    coordsDisplay.textContent = lat.toFixed(6) + ', ' + lng.toFixed(6);
    nameInput.value = '';
    pinTypeSelect.value = 'rooms'; // Reset to default
    document.getElementById('backdrop').classList.add('open');
    if (ghostMarker) map.removeLayer(ghostMarker);
    ghostMarker = L.circleMarker([lat, lng], {
        radius: 6, 
        color: pinTypes.find(function(t) { return t.value === 'rooms'; }).color, 
        fillColor: pinTypes.find(function(t) { return t.value === 'rooms'; }).color, 
        fillOpacity: 0.45, 
        weight: 2
    }).addTo(map);
    // Update ghost marker color when type changes
    pinTypeSelect.addEventListener('change', updateGhostMarkerColor);
    setTimeout(function() { nameInput.focus(); }, 260);
}

function updateGhostMarkerColor() {
    if (!pending) return;
    const selectedType = pinTypes.find(function(t) { return t.value === pinTypeSelect.value; });
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
    
    const raw = nameInput.value.trim();
    const name = raw || 'Pin ' + (pins.length + 1);
    const { lat, lng } = pending;
    const selectedType = pinTypes.find(function(t) { return t.value === pinTypeSelect.value; });
    
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: '',
            html: '<div style="width:28px;height:28px;background:' + selectedType.color + ';border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:700;font-family:Satoshi,sans-serif">' + (pins.length + 1) + '</span></div>',
            iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-32]
        })
    }).addTo(map);
    
    marker.bindPopup('<div class="pi"><div class="pi-name">' + name + '</div><div class="pi-coords">' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</div></div>');
    
    const pin = { 
        name: name, 
        lat: lat, 
        lng: lng, 
        type: selectedType.value,
        marker: marker 
    };
    
    pins.push(pin);
    if (ghostMarker) { 
        map.removeLayer(ghostMarker); 
        ghostMarker = null; 
    }
    document.getElementById('backdrop').classList.remove('open');
    pending = null;
    updatePinPills();
    updateExportButtonState();
    savePins(); // Persist to localStorage
    toast(name + ' added');
    
    // Remove event listener
    pinTypeSelect.removeEventListener('change', updateGhostMarkerColor);
}

function updatePinPills() {
    const chipsContainer = document.getElementById('chips');
    if (!pins.length) { 
        chipsContainer.innerHTML = '<span class="empty">Click the map to place a pin</span>'; 
        return; 
    }
    chipsContainer.innerHTML = pins.map(function(p,i) {
        const typeConfig = pinTypes.find(function(t) { return t.value === p.type; });
        return '<div class="chip" onclick="flyTo(' + i + ')" style="border-color: ' + typeConfig.color + '; color: ' + typeConfig.color + ';">' +
               p.name +
               '<span class="chip-x" onclick="event.stopPropagation();del(' + i + ')">✕</span>' +
               '</div>';
    }).join('');
    
    // Also update sidebar content if it exists
    if (sidebarContent) {
        sidebarContent.innerHTML = chipsContainer.innerHTML;
    }
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
    updatePinPills();
    updateExportButtonState();
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
        features: pins.map(function(p) {
            return {
                type: 'Feature',
                properties: { 
                    name: p.name,
                    type: p.type
                },
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
            };
        })
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(gj, null, 2)], { type: 'application/json' }));
    a.download = 'hotel_map.geojson';
    a.click();
    toast('hotel_map.geojson downloaded');
}

// Search bar implementation
function handleSearchClick() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        toast('Please enter a search term');
        return;
    }
    
    // Find matching pin
    const matchedPinIndex = pins.findIndex(function(p) { 
        return p.name.toLowerCase().includes(searchTerm) || 
               p.type.toLowerCase().includes(searchTerm);
    });
    
    if (matchedPinIndex === -1) {
        toast('No pins match your search');
        return;
    }
    
    // Fly to the pin and open popup
    map.flyTo([pins[matchedPinIndex].lat, pins[matchedPinIndex].lng], 20, { duration: 0.7 });
    pins[matchedPinIndex].marker.openPopup();
    
    // Clear search input
    searchInput.value = '';
}

// Sidebar toggle
function toggleSidebar() {
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// LocalStorage persistence
function loadPins() {
    const savedPins = localStorage.getItem('hotelMapPins');
    if (savedPins) {
        try {
            const parsed = JSON.parse(savedPins);
            // Reconstruct pins with markers
            pins = parsed.map(function(savedPin) {
                // Create marker for each pin
                const typeConfig = pinTypes.find(function(t) { return t.value === savedPin.type; }) || pinTypes[0]; // Default to rooms
                const marker = L.marker([savedPin.lat, savedPin.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="width:28px;height:28px;background:' + typeConfig.color + ';border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:700;font-family:Satoshi,sans-serif">' + (pins.indexOf(savedPin) + 1) + '</span></div>',
                        iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-32]
                    })
                }).addTo(map);
                
                marker.bindPopup('<div class="pi"><div class="pi-name">' + savedPin.name + '</div><div class="pi-coords">' + savedPin.lat.toFixed(6) + ', ' + savedPin.lng.toFixed(6) + '</div></div>');
                
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
    const pinsData = pins.map(function(p) {
        return {
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            type: p.type
        };
    });
    localStorage.setItem('hotelMapPins', JSON.stringify(pinsData));
}

let tt;
function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; 
    el.classList.add('show');
    clearTimeout(tt); 
    tt = setTimeout(function() { el.classList.remove('show'); }, 2000);
}

// DOMContentLoaded listener - now functions are defined
document.addEventListener('DOMContentLoaded', () => {
    // Initialize elements
    initElements();
    
    // Load login state from localStorage
    const savedLoginState = localStorage.getItem('hotelMapIsLoggedIn');
    isLoggedIn = savedLoginState === 'true';
    updateAuthUI();
    
    // Load pins from localStorage
    loadPins();
    
    // Update UI based on loaded pins
    updatePinPills();
    updateExportButtonState();
    updateShowPinsButtonState();
});

function initElements() {
    // Get references to elements
    pinTypeSelect = document.getElementById('pinTypeSelect');
    nameInput = document.getElementById('nameInput');
    coordsDisplay = document.getElementById('coords');
    searchInput = document.getElementById('searchInput');
    searchBtn = document.getElementById('searchBtn');
    exportBtn = document.getElementById('exportBtn');
    authToggle = document.getElementById('auth-toggle');
    showPinsBtn = document.getElementById('show-pins-btn');
    sidebar = document.getElementById('sidebar');
    sidebarContent = document.getElementById('sidebarContent');
    sidebarToggle = document.getElementById('sidebarToggle');
    
    // Add event listeners - ONLY after we have the element references
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearchClick);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearchClick();
            }
        });
    }
    if (authToggle) {
        authToggle.addEventListener('click', toggleAuth);
    }
    if (showPinsBtn) {
        showPinsBtn.addEventListener('click', toggleSidebar);
    }
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    if (nameInput) {
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') cancel();
        });
    }
    if (document.getElementById('backdrop')) {
        document.getElementById('backdrop').addEventListener('click', function(e) {
            if (e.target === document.getElementById('backdrop')) cancel();
        });
    }
    
    // Initial UI updates based on login state
    updateAuthUI();
}

map.on('click', e => {
    if (addPinEnabled && isLoggedIn) {
        openModal(e.latlng.lat, e.latlng.lng);
    }
    // If addPinEnabled is false or not logged in, clicks are ignored (view-only mode)
});