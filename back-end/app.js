const express = require('express');
const cors = require('cors');
const petRoutes = require('./api/routes/petRoutes');
const aiRoutes = require('./api/routes/aiRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/pets', petRoutes);
app.use('/ai', aiRoutes);

module.exports = app;
