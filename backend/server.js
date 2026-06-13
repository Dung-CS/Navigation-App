require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './frontend/index.html'));
});

app.use(express.static(path.join(__dirname, 'frontend')));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
