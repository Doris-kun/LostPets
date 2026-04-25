const express = require('express');
const cors = require('cors');
const petRoutes = require('./api/routes/petRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/pets', petRoutes);

module.exports = app;
