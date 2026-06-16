const express = require('express');
const router = express.Router();
const supabase = require('../supabase/db');
const path= require('path');

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/friend.html'));
})

router.get('/pending/:id', async(req, res) => {
    const userId = req.params.id;
    const {data,error} = await supabase
        .from('friends')
        .select("id, user_id")
        .eq('friend_id', userId)
        .eq('status', 'pending');
    if (error){
        console.error(error);
    }
    return res.json(data);
})

router.get('/:id', async (req, res) => {
  const userId = req.params.id;

  // Friends where current user is the recipient
  const { data: incoming, error: error1 } = await supabase
    .from('friends')
    .select('id, user_id')
    .eq('friend_id', userId)
    .eq('status', 'accepted');

  if (error1) {
    console.error(error1);
    return res.status(400).json({ error: 'Error fetching incoming friends' });
  }

  // Friends where current user is the sender
  const { data: outgoing, error: error2 } = await supabase
    .from('friends')
    .select('id, friend_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error2) {
    console.error(error2);
    return res.status(400).json({ error: 'Error fetching outgoing friends' });
  }

  // Merge both arrays
  const allFriends = [...incoming, ...outgoing];

  return res.json(allFriends);
});


router.post("/request", async (req, res) => {
  const { username } = req.body;

  // 1. Get current user from token
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const currentUserId = user.id;

  // 2. Look up friend by username
  const { data: friendProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (profileError || !friendProfile) {
    return res.status(404).json({ error: "User not found" });
  }

  const friendId = friendProfile.id;

  // 3. Insert friend request
  const { data, error } = await supabase
    .from("friends")
    .insert({ user_id: currentUserId, friend_id: friendId, status: "pending" });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Friend request sent", data });
});

router.post("/accept", async (req, res) => {
  const { requestId } = req.body;
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  
  const token = authHeader.split(" ")[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data, error } = await supabase
    .from("friends")
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("friend_id", user.id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Friend request accepted", data });
});

router.post("/reject", async (req, res) => {
  const { requestId } = req.body;
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  
  const token = authHeader.split(" ")[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data, error } = await supabase
    .from("friends")
    .delete()
    .eq("id", requestId)
    .eq("friend_id", user.id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Friend request rejected", data });
});

router.delete("/remove", async (req, res) => {
  const { friendId } = req.body;
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  
  const token = authHeader.split(" ")[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data, error } = await supabase
    .from("friends")
    .delete()
    .eq("id", friendId)
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Friend removed", data });
});

module.exports = router;