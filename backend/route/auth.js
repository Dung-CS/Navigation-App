const express = require('express');
const supabase = require('../supabase/db');
const path = require('path');

const router = express.Router();

router.post("/logout", async (req, res) => {
  // Supabase doesn’t invalidate JWTs server-side, but you can clear refresh tokens
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ message: "Logged out successfully" });
});

router.get("/check-session", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  // Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  return res.json(user);
});

router.get('/register', async(req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/register.html'));
});
router.get('/login', async(req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/login.html'));
});

router.post('/register', async (req, res) => {
    const {email, password} = req.body;
    const {data,error} = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        return res.status(401).json(error);
    };
    
    const userId = data.user.id;

    await supabase
        .from('profiles')
        .insert([
            {
                id: userId,
                username: email.split('@')[0]
            }
        ]);

    res.status(201).json({
        message: 'User registered successfully',
        data
    });
});

router.post('/login', async (req, res) => {
    const {email,password} = req.body;

    const {data, error} = await supabase.auth.signInWithPassword({email, password});
    if(error) {
        return res.status(404).json(error);
    };

    res.json(data);
});

router.get("/username", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  // Verify token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Query profiles table for username
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return res.status(400).json({ error: profileError.message });
  }

  return res.json({ username: data.username });
});

module.exports = router;