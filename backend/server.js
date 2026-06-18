require('dotenv').config();

const express = require('express');
const app = express();
const authRouter = require('./route/auth');
const path = require('path');
const locationRouter = require('./route/location');
const friendRouter = require('./route/friend');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const frontendDir = path.join(__dirname, '../frontend');
const distDir = path.join(__dirname, '../dist');

app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', frontendDir);

async function startServer() {
  if (isProduction) {
    app.use(express.static(distDir));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        host: true,
        allowedHosts: true,
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  }

  app.get('/', (req, res) => {
    res.render('index');
  });
  app.get('/drops', (req, res) => {
    res.render('drops');
  });
  app.get('/account', (req, res) => {
    res.render('account');
  });
  app.use('/auth', authRouter);
  app.use('/location', locationRouter);
  app.use('/friend', friendRouter);

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
