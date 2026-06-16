const express = require('express');
const router = express.Router();
const supabase = require('../supabase/db');
const path = require('path');

async function getUserId() {
  const {
    data :  {user},
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Error get user ID: ', error);
    throw error
  }

  if (!user) {
    throw new Error("No user is logged in")
  }

  return user.id;
}

router.get('/share', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/shared_locations.html'));
})

router.put('/:id', async (req,res) => {
  const {id} = req.params;
  const {is_public, category, shared_with} = req.body;
  
  const {data, error} = await supabase
  .from('locations')
  .update({is_public,category,shared_with})
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
    res.status(201).json(data)
  } catch (err) {
    console.error('Error saving location:', err)
    res.status(500).json({ error: err.message })
  }
})

// Get all locations for the logged-in user
router.get('/', async (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) throw error
    if (!user) return res.status(401).json({ error: "Not logged in" })

    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('*')
      .eq('profile_id', user.id)

    if (fetchError) throw fetchError
    res.status(201).json(data)
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



router.get('/:id', async (req, res) => {
  const locId = req.params.id;
  const {data: location, error} = await supabase
    .from('locations')
    .select('name, lat, lng')
    .eq('id', locId)
    .single();
  if (error || !location) return res.status(400).json({ error: "Location not found" });
  return res.json({name: location.name, lat: location.lat, lng: location.lng});
})

router.get('/share/:id', async(req,res) => {
  const userId = req.params.id;
  try {
    const { data, error: fetchError } = await supabase
      .from('location_shares')
      .select('location_id, locations(id, name, lat, lng, profile_id, created_at, category, is_public)')
      .eq('shared_with', userId);
    
    if (fetchError) return res.status(400).json({ error: fetchError.message });
    
    // Format response to include location details
    const sharedLocations = data.map(share => ({
      ...share.locations,
      share_id: share.location_id
    }));
    
    return res.json(sharedLocations);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
})

module.exports = router
