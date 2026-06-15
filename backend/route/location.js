const express = require('express');
const router = express.Router();
const supabase = require('../supabase/db');

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

module.exports = router
