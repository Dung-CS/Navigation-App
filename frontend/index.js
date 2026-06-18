import { supabase } from './supabaseClient.js';

const CATEGORY_LABELS = {
  hidden_gem: 'Hidden gem',
  local_secret: 'Only locals know',
  attraction: 'Attraction',
  food: 'Food',
  drink: 'Drink',
  entertain: 'Entertainment',
  nature: 'Nature',
  quiet: 'Quiet spot',
  other: 'Other'
};

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || 'Uncategorized';
}

function categoryOptions(selectedCategory) {
  return [
    ['', 'Set Category'],
    ['hidden_gem', 'Hidden gem'],
    ['local_secret', 'Only locals know'],
    ['attraction', 'Attraction'],
    ['food', 'Food'],
    ['drink', 'Drink'],
    ['entertain', 'Entertainment'],
    ['nature', 'Nature'],
    ['quiet', 'Quiet spot'],
    ['other', 'Other']
  ].map(([value, label]) => {
    const selected = value === (selectedCategory || '') ? 'selected' : '';
    return `<option value="${value}" ${selected}>${label}</option>`;
  }).join('');
}

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : 'Unknown';
}

function getLocationCoords(loc) {
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function closeOpenCardMenus(exceptMenu) {
  document.querySelectorAll('.card-menu.open').forEach((menu) => {
    if (menu !== exceptMenu) {
      menu.classList.remove('open');
      menu.closest('.spot-card')?.classList.remove('menu-open');
      menu.closest('.panel')?.classList.remove('menu-open');
      menu.querySelector('.card-menu-trigger')?.setAttribute('aria-expanded', 'false');
    }
  });
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 15000
    });
  });
}

async function loadLocations() {
  const container = document.querySelector('#locationPortal')
  const token = localStorage.getItem("access-token")
  if (!token) {
    if (container) {
      container.innerHTML = '<p style="color: var(--danger); font-size: 14px;">Sign in to view your saved locations.</p>'
    }
    alert('Sign in to create your own saved location list!')
    return console.log("No token found")
  }

  try {
    if (container) {
      container.innerHTML = '<p style="color: var(--ink-dim); font-size: 14px;">Loading saved locations...</p>'
    }

    const res = await fetch("/location", {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const locations = await res.json()
    if (!res.ok) {
      throw new Error(locations.error || "Failed to load saved locations");
    }
    if (!Array.isArray(locations)) {
      throw new Error("Saved locations response was not a list");
    }
    container.innerHTML = '' // clear old list

    if (!locations || locations.length === 0) {
      container.innerHTML = '<p style="color: var(--ink-dim); font-size: 14px;">No saved locations yet. Save your first spot!</p>'
      return
    }

    const cardsContainer = document.createElement('div')
    cardsContainer.className = 'spot-cards-container'

    locations.forEach(loc => {
      const card = document.createElement("div");
      card.className = "spot-card saved-location";

      const dateStr = new Date(loc.created_at).toLocaleString() || "Date unknown";
      const coords = getLocationCoords(loc);
      const categoryId = `category-${loc.id}`;
      const menuId = `menu-${loc.id}`;

      card.innerHTML = `
      <div class="spot-card-head">
        <div class="name">${loc.name}</div>
        <div class="card-menu" id="${menuId}">
          <button class="card-menu-trigger" type="button" aria-label="More actions" aria-expanded="false">
            <span>&#8942;</span>
          </button>
          <div class="card-menu-panel">
            <button class="menu-action toggle-privacy" type="button">
              ${loc.is_public ? "Make Private" : "Make Public"}
            </button>
            <button class="menu-action share" type="button">Share</button>
            <label class="menu-label" for="${categoryId}">Saved location category</label>
            <select class="location-category" id="${categoryId}" name="category-${loc.id}">
              ${categoryOptions(loc.category)}
            </select>
            <button class="menu-action danger delete-location" type="button">Delete</button>
          </div>
        </div>
      </div>
      <div class="meta">
        <div>Saved ${dateStr}</div>
        <div class="coordinates">${formatCoordinate(loc.lat)}, ${formatCoordinate(loc.lng)}</div>
        <div class="privacy">Privacy: ${loc.is_public ? "Public" : "Private"}</div>
        <div class="category">Category: ${categoryLabel(loc.category)}</div>
      </div>
      <div class="row">
        <button class="btn find" type="button" ${coords ? '' : 'disabled'}>Find</button>
      </div>
      `;

      const cardMenu = card.querySelector('.card-menu');
      const menuTrigger = card.querySelector('.card-menu-trigger');
      menuTrigger?.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = !cardMenu.classList.contains('open');
        closeOpenCardMenus(cardMenu);
        cardMenu.classList.toggle('open', willOpen);
        card.classList.toggle('menu-open', willOpen);
        card.closest('.panel')?.classList.toggle('menu-open', willOpen);
        menuTrigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });

      cardMenu?.querySelectorAll('.menu-action, .location-category').forEach((element) => {
        element.addEventListener('click', () => {
          if (element.classList.contains('location-category')) return;
          cardMenu.classList.remove('open');
          card.classList.remove('menu-open');
          card.closest('.panel')?.classList.remove('menu-open');
          menuTrigger?.setAttribute('aria-expanded', 'false');
        });
      });

      cardMenu?.querySelector('.location-category')?.addEventListener('change', () => {
        cardMenu.classList.remove('open');
        card.classList.remove('menu-open');
        card.closest('.panel')?.classList.remove('menu-open');
        menuTrigger?.setAttribute('aria-expanded', 'false');
      });

      card.querySelector('.find').addEventListener('click', () => {
        if (coords) findLocation(coords.lat, coords.lng, loc.name, loc.id, !!loc.is_public);
      });
      card.querySelector('.delete-location').addEventListener('click', () => deleteLocation(loc.id));
      card.querySelector('.toggle-privacy').addEventListener('click', () => togglePrivacy(loc.id, loc.is_public));
      card.querySelector('.location-category').addEventListener('change', (event) => {
        updateCategory(loc.id, event.target.value);
      });
      card.querySelector('.share').addEventListener('click', () => openShareMenu(loc.id));
      cardsContainer.appendChild(card);
    });


    container.appendChild(cardsContainer)
  } catch (err) {
    console.error("Error loading locations:", err)
    const container = document.querySelector('#locationPortal')
    container.innerHTML = `<p style="color: var(--danger); font-size: 14px;">${err.message || 'Failed to load saved locations'}</p>`
  }
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.card-menu')) {
    closeOpenCardMenus();
    document.querySelectorAll('.card-menu-trigger[aria-expanded="true"]').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
    });
  }
});

async function openShareMenu(locationId) {
  const token = localStorage.getItem("access-token");
  if (!token) {
    alert("Sign in to share locations!");
    return;
  }

  // Create a simple popup list
  const modal = document.createElement("div");
  modal.className = "share-modal";
  modal.innerHTML = `
    <h3>Share Location</h3>
    <ul class="friend-list"><li>Loading friends...</li></ul>
    <button class="btn ghost" onclick="closeShareMenu()">Cancel</button>
  `;
  document.body.appendChild(modal);

  const list = modal.querySelector(".friend-list");

  try {
    // Fetch accepted friends
    const meRes = await fetch("/auth/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const meData = await meRes.json();
    if (!meRes.ok) throw new Error(meData.error || "Unable to verify your session");

    const userId = meData.userId;

    const res = await fetch(`/friend/${userId}`, {
      headers: { "Content-Type": "application/json" }
    });
    const friends = await res.json();
    if (!res.ok) throw new Error(friends.error || "Unable to load friends");

    list.innerHTML = "";

    if (friends && friends.length > 0) {
      for (const friend of friends) {
        const li = document.createElement("li");
        const searchId = friend.user_id === userId ? friend.friend_id : friend.user_id;
        const nameRes = await fetch(`/auth/${searchId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const nameData = await nameRes.json();
        if (!nameRes.ok) throw new Error(nameData.error || "Unable to load a friend's username");

        li.innerHTML = `
          <span>${nameData.username}</span>
          <button class="btn" onclick="shareLocation('${locationId}', '${searchId}')">Share</button>
        `;
        list.appendChild(li);
      }
    } else {
      const li = document.createElement("li");
      li.textContent = "No accepted friends yet";
      list.appendChild(li);
    }

  } catch (err) {
    console.error("Error opening share menu:", err);
    list.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = err.message || "Failed to load friends";
    list.appendChild(li);
  }
}

function closeShareMenu() {
  document.querySelector(".share-modal")?.remove();
}

async function shareLocation(locationId, friendId) {
  const token = localStorage.getItem("access-token");
  const res = await fetch("/location/share", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ locationId, friendId })
  });

  const result = await res.json();
  if (res.ok) {
    alert("Location shared successfully!");
    closeShareMenu();
  } else {
    alert(result.error || "Failed to share location");
  }
}


async function togglePrivacy(locationId, currentStatus) {
  const token = localStorage.getItem("access-token");
  const res = await fetch(`/location/${locationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({is_public: !currentStatus})
  });
  const result = await res.json();
  if (res.ok) {
    alert(`Location is now ${!currentStatus ? "Public" : "Private"}`);
    loadLocations();
  } else {
    alert(result.error);
  }
}

async function updateCategory(locationId, newCategory) {
  const token = localStorage.getItem("access-token");
  const res = await fetch(`/location/${locationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ category: newCategory })
  });

  const result = await res.json();
  if (res.ok) {
    alert("Category updated");
    loadLocations();
  } else {
    alert(result.error);
  }
}

function setSuggestionStatus(message, isError = false) {
  const status = document.querySelector('#suggestionStatus');
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('error', isError);
}

function renderSuggestions(locations) {
  const container = document.querySelector('#suggestionResults');
  if (!container) return;

  container.innerHTML = '';

  if (!locations.length) {
    container.innerHTML = '<p style="color: var(--ink-dim); font-size: 14px;">No public destinations match this filter yet.</p>';
    return;
  }

  locations.forEach(loc => {
    const card = document.createElement('div');
    card.className = 'spot-card saved-location';
    card.dataset.locationId = loc.id;

    const dateStr = new Date(loc.created_at).toLocaleString() || 'Date unknown';
    card.innerHTML = `
      <div class="name">${loc.name}</div>
      <div class="meta">
        <div>${categoryLabel(loc.category)} · ${formatDistance(loc.distance_m)} away</div>
        <div>Saved ${dateStr}</div>
        <div class="coordinates">${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}</div>
      </div>
      <div class="suggestion-score">
        <span>▲ <b class="upvote-count">${loc.upvotes || 0}</b></span>
        <span>▼ <b class="downvote-count">${loc.downvotes || 0}</b></span>
        <span>Score <b class="score-count">${loc.score || 0}</b></span>
      </div>
      <div class="row">
        <button class="btn find" type="button">Find</button>
      </div>
    `;

    card.querySelector('button').addEventListener('click', () => {
      findLocation(loc.lat, loc.lng, loc.name, loc.id, true);
    });

    container.appendChild(card);
  });
}

async function suggestLocations() {
  const category = document.querySelector('#suggestCategory')?.value || 'all';
  const maxDistanceKm = Number(document.querySelector('#maxDistance')?.value || 5);
  const maxDistance = Math.round(maxDistanceKm * 1000);

  if (!Number.isFinite(maxDistanceKm) || maxDistanceKm < 0) {
    setSuggestionStatus('Enter a valid maximum distance.', true);
    return;
  }

  setSuggestionStatus('Getting your location...');

  try {
    const position = await getCurrentPosition();
    setSuggestionStatus('Looking for public destinations...');

    const params = new URLSearchParams({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      maxDistance,
      category
    });
    const token = localStorage.getItem('access-token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/location/suggestions?${params.toString()}`, { headers });
    const suggestions = await res.json();

    if (!res.ok) throw new Error(suggestions.error || 'Failed to load suggestions');

    renderSuggestions(suggestions);
    setSuggestionStatus(`Found ${suggestions.length} public destination${suggestions.length === 1 ? '' : 's'}.`);
  } catch (err) {
    console.error('Error suggesting locations:', err);
    setSuggestionStatus(err.message || 'Failed to suggest locations.', true);
  }
}

function updateVoteCounts(locationId, totals) {
  const card = document.querySelector(`[data-location-id="${locationId}"]`);
  if (!card) return;

  card.querySelector('.upvote-count').textContent = totals.upvotes || 0;
  card.querySelector('.downvote-count').textContent = totals.downvotes || 0;
  card.querySelector('.score-count').textContent = totals.score || 0;
}

async function voteDestination(locationId, vote) {
  const token = localStorage.getItem('access-token');
  if (!token) {
    alert('Sign in to vote on public destinations.');
    return null;
  }

  const res = await fetch(`/location/${locationId}/vote`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ vote })
  });
  const result = await res.json();

  if (!res.ok) {
    alert(result.error || 'Failed to save vote');
    return null;
  }

  updateVoteCounts(locationId, result);
  return result;
}

async function voteCurrentDestination(vote) {
  const votePanel = document.querySelector('#finderVotePanel');
  const locationId = votePanel?.dataset.locationId;
  if (!locationId) return;

  const result = await voteDestination(locationId, vote);
  if (result) {
    document.querySelector('#finderVoteText').textContent = 'Thanks, your vote was saved.';
  }
}

function findLocation(lat, lng, name, id = null, isPublic = false) {
  // Set the spot globally for the finder screen to use
  const targetSpot = {
    id,
    is_public: !!isPublic,
    name: name || 'Saved location',
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    accuracy: 0,
    ts: Date.now()
  }

  // Store temporarily to use with finder screen
  window.targetSpot = targetSpot

  // Check if we have the startFinderForLocation function available
  if (typeof startFinderForLocation === 'function') {
    // We're already on index.html, use it directly
    startFinderForLocation(targetSpot)
  } else {
    // We're on another page (like shared_locations.html), store and navigate
    sessionStorage.setItem('pendingTargetSpot', JSON.stringify(targetSpot))
    window.location.href = '/'
  }
}

async function deleteLocation(locationId) {
  const token = localStorage.getItem("access-token")
  if (!token) {
    console.log("No token found")
    return
  }

  if (!confirm("Are you sure you want to delete this saved location?")) {
    return
  }

  try {
    const res = await fetch(`/location/${locationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    console.log("Deleted location:", data)

    // Refresh the list after deletion
    loadLocations()
  } catch (err) {
    console.error("Error deleting location:", err)
    alert("Failed to delete location.")
  }
}



async function saveLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      const spotName = document.querySelector('#spotName').value || "Unnamed spot"

      const token = localStorage.getItem("access-token")
      if (!token) {
        console.log("No token found")
        return
      }

      try {
        const res = await fetch("/location", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`   // ✅ send token here
          },
          body: JSON.stringify({ name: spotName, lat: latitude, lng: longitude })
        })

        const data = await res.json()
        console.log("Saved location:", data)
        alert(`Saved: ${spotName}`)
        
        // Clear the input field
        document.querySelector('#spotName').value = ''
        
        // Reload the saved locations to show the new spot
        loadLocations()
      } catch (err) {
        console.error("Error saving location:", err)
        alert("Failed to save location. Sign in to save.")
      }
    }, (error) => {
      alert("Unable to retrieve location: " + error.message)
    })
  } else {
    alert("Geolocation is not supported by this browser.")
  }
}



async function logout() {
  try {
    const token = localStorage.getItem("access-token");
    if (!token) {
      console.log("No token found");
      return;
    }

    const response = await fetch("/auth/logout", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.ok) {
      // Clear token and update UI
      localStorage.removeItem("access-token");
      document.getElementById("auth").style.display = "block";
      document.getElementById("welcomeSection").style.display = "none";
      window.location.href = "/";
    } else {
      console.error("Logout failed");
    }
  } catch (err) {
    console.error("Unexpected error during logout:", err);
  }
}



// Login with JWT
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok && result.session && result.session.access_token) {
      localStorage.setItem("access-token", result.session.access_token);
      window.location.href = "/";
    } else {
      alert(result.error || result.message || "Login failed");
    }
  } catch (err) {
    console.error(err);
  }
}

// Register with JWT
async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    console.log(result);

    if (!response.ok) {
      alert(result.error || result.message || "Registration failed");
      return;
    }

    const accessToken = result.data?.session?.access_token;
    if (accessToken) {
      localStorage.setItem("access-token", accessToken);
      window.location.href = "/";
      return;
    }

    alert(result.message || "Registration successful. Check your email to confirm your account.");
    window.location.href = "/auth/login";
  } catch (err) {
    console.error(err);
    alert("Registration failed");
  }
}

async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('attraction_cards')
      .select('*');

    if (error) {
      console.error('Supabase connection failed:', error);
      return;
    }

    console.log('Supabase connected. Attractions loaded:', data);
  } catch (err) {
    console.error('Supabase connection failed:', err);
  }
}

testSupabaseConnection();

window.loadLocations = loadLocations;
window.togglePrivacy = togglePrivacy;
window.updateCategory = updateCategory;
window.findLocation = findLocation;
window.deleteLocation = deleteLocation;
window.openShareMenu = openShareMenu;
window.closeShareMenu = closeShareMenu;
window.shareLocation = shareLocation;
window.suggestLocations = suggestLocations;
window.voteDestination = voteDestination;
window.voteCurrentDestination = voteCurrentDestination;
window.saveLocation = saveLocation;
window.logout = logout;
window.login = login;
window.register = register;
