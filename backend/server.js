require('dotenv').config();

const express = require('express');
const app = express();
const authRouter = require('./route/auth');
const path = require('path');
const bodyParser = require('body-parser');
const locationRouter = require('./route/location');
const friendRouter = require('./route/friend')

app.use(bodyParser.json());

app.use(express.json());
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.use('/auth', authRouter);
app.use('/location', locationRouter);
app.use('/friend', friendRouter);
app.use(express.static(path.join(__dirname, '../frontend')));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});