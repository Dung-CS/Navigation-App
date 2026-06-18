const express = require('express');
const router = express.Router();
const supabase = require('../supabase/db');

const EARTH_RADIUS_M = 6371000;

function distanceM(a, b) {
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  return authHeader && authHeader.split(' ')[1];
}

async function getOptionalUser(req) {
  const token = getToken(req);
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getRequiredUser(req, res) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }

  return user;
}

async function getVoteTotals(locationIds) {
  if (!locationIds.length) return {};

  const { data, error } = await supabase
    .from('location_votes')
    .select('location_id, vote')
    .in('location_id', locationIds);

  if (error) {
    console.warn('Location votes unavailable:', error.message);
    return {};
  }

  return data.reduce((totals, row) => {
    const id = row.location_id;
    if (!totals[id]) totals[id] = { upvotes: 0, downvotes: 0, score: 0 };
    if (row.vote === 1) totals[id].upvotes += 1;
    if (row.vote === -1) totals[id].downvotes += 1;
    totals[id].score += row.vote;
    return totals;
  }, {});
}

router.get('/share', (req, res) => {
    res.redirect('/friend');
})

router.get('/share/:id', async(req,res) => {
  const userId = req.params.id;
  try {
    const { data, error: fetchError } = await supabase
      .from('location_shares')
      .select('id, location_id, shared_by, shared_with, created_at, locations(id, name, lat, lng, profile_id, created_at, category, is_public)')
      .eq('shared_with', userId);

    if (fetchError) return res.status(400).json({ error: fetchError.message });

    const sharedByIds = [...new Set((data || []).map((share) => share.shared_by).filter(Boolean))];
    let usernamesById = {};

    if (sharedByIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', sharedByIds);

      if (profileError) return res.status(400).json({ error: profileError.message });

      usernamesById = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile.username;
        return acc;
      }, {});
    }

    const sharedLocations = data.map(share => ({
      ...share.locations,
      share_id: share.id,
      shared_by: share.shared_by,
      shared_by_username: usernamesById[share.shared_by] || null,
      shared_at: share.created_at
    }));

    return res.json(sharedLocations);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
})

router.get('/suggestions', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const minDistance = Math.max(0, Number(req.query.minDistance || 0));
  const maxDistance = Math.max(minDistance, Number(req.query.maxDistance || 5000));
  const category = req.query.category;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "lat and lng query parameters are required" });
  }

  try {
    const user = await getOptionalUser(req);
    let query = supabase
      .from('locations')
      .select('id, profile_id, name, lat, lng, created_at, category, is_public')
      .eq('is_public', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (user) {
      query = query.neq('profile_id', user.id);
    }

    const { data: locations, error } = await query.limit(250);
    if (error) return res.status(400).json({ error: error.message });

    const withDistance = locations
      .map(location => ({
        ...location,
        distance_m: Math.round(distanceM({ lat, lng }, { lat: location.lat, lng: location.lng }))
      }))
      .filter(location => location.distance_m >= minDistance && location.distance_m <= maxDistance);

    const votesByLocation = await getVoteTotals(withDistance.map(location => location.id));

    const suggestions = withDistance
      .map(location => {
        const votes = votesByLocation[location.id] || { upvotes: 0, downvotes: 0, score: 0 };
        const distanceScore = Math.max(0, 1 - (location.distance_m - minDistance) / Math.max(1, maxDistance - minDistance));
        const suitability = votes.score * 10 + distanceScore;

        return {
          ...location,
          ...votes,
          suitability
        };
      })
      .sort((a, b) => b.suitability - a.suitability || a.distance_m - b.distance_m)
      .slice(0, 12);

    return res.json(suggestions);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/vote', async (req, res) => {
  const user = await getRequiredUser(req, res);
  if (!user) return;

  const locationId = req.params.id;
  const vote = Number(req.body.vote);

  if (![1, -1].includes(vote)) {
    return res.status(400).json({ error: "vote must be 1 or -1" });
  }

  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, is_public')
    .eq('id', locationId)
    .single();

  if (locationError || !location) return res.status(404).json({ error: "Location not found" });
  if (!location.is_public) return res.status(403).json({ error: "Only public locations can be voted on" });

  const { error: voteError } = await supabase
    .from('location_votes')
    .upsert(
      { location_id: locationId, profile_id: user.id, vote },
      { onConflict: 'location_id,profile_id' }
    );

  if (voteError) return res.status(400).json({ error: voteError.message });

  const totals = await getVoteTotals([locationId]);
  return res.json({
    message: "Vote saved",
    locationId,
    ...(totals[locationId] || { upvotes: 0, downvotes: 0, score: 0 })
  });
});

router.put('/:id', async (req,res) => {
  const {id} = req.params;
  const {name, is_public, category, shared_with} = req.body;
  const updates = {};

  if (typeof name !== 'undefined') updates.name = (name || '').trim();
  if (typeof is_public !== 'undefined') updates.is_public = is_public;
  if (typeof category !== 'undefined') updates.category = category || null;
  if (typeof shared_with !== 'undefined') updates.shared_with = shared_with;

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: "No location fields provided" });
  }

  if (typeof updates.name !== 'undefined' && !updates.name) {
    return res.status(400).json({ error: "Location name cannot be empty" });
  }
  
  const {data, error} = await supabase
  .from('locations')
  .update(updates)
  .eq("id", id)
  .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Location updated", data });
});

router.post('/', async (req, res) => {
  const { name, lat, lng } = req.body
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) throw error
    if (!user) return res.status(401).json({ error: "Not logged in" })

    const profile_id = user.id

    const { data, error: insertError } = await supabase
      .from('locations')
      .insert([{ profile_id, name, lat, lng }])

    if (insertError) throw insertError
    res.status(200).json(data)
  } catch (err) {
    console.error('Error saving location:', err)
    res.status(500).json({ error: err.message })
  }
})

// Get all locations for the logged-in user
router.get('/', async (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) return res.status(401).json({ error: error.message })
    if (!user) return res.status(401).json({ error: "Not logged in" })

    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('*')
      .eq('profile_id', user.id)

    if (fetchError) throw fetchError
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) throw error
    if (!user) return res.status(401).json({ error: "Not logged in" })

    const { data, error: deleteError } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (deleteError) throw deleteError

    res.json({ success: true, deleted: data })
  } catch (err) {
    console.error('Error deleting location:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post("/share", async (req, res) => {
  const { locationId, friendId } = req.body;
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  // Insert into a "location_shares" table
  const { data, error: shareError } = await supabase
    .from("location_shares")
    .insert({ location_id: locationId, shared_with: friendId, shared_by: user.id });

  if (shareError) return res.status(400).json({ error: shareError.message });
  res.json({ message: "Shared successfully", data });
});

router.delete("/share/:shareId", async (req, res) => {
  const { shareId } = req.params;
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  const { data, error: deleteError } = await supabase
    .from("location_shares")
    .delete()
    .eq("id", shareId)
    .eq("shared_with", user.id)
    .select();

  if (deleteError) return res.status(400).json({ error: deleteError.message });
  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Shared location not found" });
  }

  return res.json({ message: "Shared location removed", data });
});



router.get('/:id', async (req, res) => {
  const locId = req.params.id;
  const {data: location, error} = await supabase
    .from('locations')
    .select('id, name, lat, lng, category, is_public')
    .eq('id', locId)
    .single();
  if (error || !location) return res.status(400).json({ error: "Location not found" });
  return res.json(location);
})

module.exports = router
