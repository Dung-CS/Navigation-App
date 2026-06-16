import { supabase } from './supabaseClient.js';

async function loadLocations() {
  const token = localStorage.getItem("access-token")
  if (!token) {
    alert('Sign in to create your own saved location list!')
    return console.log("No token found")
  }

  try {
    const res = await fetch("http://127.0.0.1:3000/location", {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const locations = await res.json()

    const container = document.querySelector('#locationPortal')
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

      card.innerHTML = `
      <div class="name">${loc.name}</div>
      <div class="meta">
        <div>Saved ${dateStr}</div>
        <div class="coordinates">${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}</div>
        <div class="privacy">Privacy: ${loc.is_public ? "Public" : "Private"}</div>
        <div class="category">Category: ${loc.category || "Uncategorized"}</div>
      </div>
      <div class="row">
        <button class="btn find" onclick="findLocation(${loc.lat}, ${loc.lng}, '${loc.name}')">Find</button>
        <button class="btn ghost" onclick="deleteLocation('${loc.id}')">Delete</button>
        <button class="btn ghost" onclick="togglePrivacy('${loc.id}', ${loc.is_public})">
          ${loc.is_public ? "Make Private" : "Make Public"}
        </button>
        <select id ="category" onchange="updateCategory('${loc.id}', this.value)">
          <option value="">Set Category</option>
          <option value="food">Food</option>
          <option value="drink">Drink</option>
          <option value="entertain">Entertain</option>
          <option value="other">Other</option>
        </select>
      </div>
      `;

      cardsContainer.appendChild(card);
    });


    container.appendChild(cardsContainer)
  } catch (err) {
    console.error("Error loading locations:", err)
    const container = document.querySelector('#locationPortal')
    container.innerHTML = '<p style="color: var(--danger); font-size: 14px;">Failed to load saved locations</p>'
  }
}

async function togglePrivacy(locationId, currentStatus) {
  const token = localStorage.getItem("access-token");
  const res = await fetch(`http://127.0.0.1:3000/location/${locationId}`, {
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
  const res = await fetch(`http://127.0.0.1:3000/location/${locationId}`, {
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

function findLocation(lat, lng, name) {
  // Set the spot globally for the finder screen to use
  const targetSpot = {
    name: name || 'Saved location',
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    accuracy: 0,
    ts: Date.now()
  }

  // Store temporarily to use with finder screen
  window.targetSpot = targetSpot

  // Trigger the same logic as the find button in the finder screen
  if (typeof startFinderForLocation === 'function') {
    startFinderForLocation(targetSpot)
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
    const res = await fetch(`http://127.0.0.1:3000/location/${locationId}`, {
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
        const res = await fetch("http://127.0.0.1:3000/location", {
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

    const response = await fetch("http://127.0.0.1:3000/auth/logout", {
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
    const response = await fetch("http://127.0.0.1:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok && result.session && result.session.access_token) {
      localStorage.setItem("access-token", result.session.access_token);
      window.location.href = "/";
    } else {
      alert(result.error || "Login failed");
    }
  } catch (err) {
    console.error(err);
  }
}

// Register with JWT
async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const response = await fetch("http://127.0.0.1:3000/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  
  const result = await response.json();
  console.log(result);

  if (response.ok && result.data && result.data.session && result.data.session.access_token) {
    localStorage.setItem("access-token", result.data.session.access_token);
    window.location.href = "/";
  } else {
    alert("Registration failed or no session returned");
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
window.saveLocation = saveLocation;
window.logout = logout;
window.login = login;
window.register = register;
