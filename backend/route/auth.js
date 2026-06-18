const express = require('express');
const supabase = require('../supabase/db');

const router = express.Router();

router.post("/logout", async (req, res) => {
  // Supabase doesn’t invalidate JWTs server-side, but you can clear refresh tokens
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ message: "Logged out successfully" });
});

router.get('/me', async(req,res) => {
    const auth_header = req.headers['authorization'];
    if (!auth_header) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = auth_header.split(" ")[1];
    
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.json({ userId: user.id });
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
  res.render('register');
});
router.get('/login', async(req, res) => {
  res.render('login');
});

router.post('/register', async (req, res) => {
    const {email, password} = req.body;
    const {data,error} = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    if (!data?.user?.id) {
        return res.status(400).json({ error: "Registration did not return a user." });
    }

    const userId = data.user.id;
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
            {
                id: userId,
                username: email.split('@')[0]
            }
        ], {
            onConflict: 'id'
        });

    if (profileError) {
        return res.status(400).json({ error: profileError.message });
    }

    const requiresConfirmation = !data.session;

    res.status(201).json({
        message: requiresConfirmation
          ? 'User registered. Check your email to confirm your account.'
          : 'User registered successfully',
        requiresConfirmation,
        data
    });
});

router.post('/login', async (req, res) => {
    const {email,password} = req.body;

    const {data, error} = await supabase.auth.signInWithPassword({email, password});
    if(error) {
        return res.status(400).json({ error: error.message });
    }

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

router.get('/:id', async (req,res) => {
  const id = req.params.id;
  const {data, error} = await supabase
    .from('profiles')
    .select('username')
    .eq('id', id)
    .single();
  if (error || !data){
    return res.status(400).json({error: 'Cannot found user'});
  }
  return res.json({username: data.username});
});

module.exports = router;
