// Vercel Serverless Function entry point
// This file wraps the Express app from server/index.js for Vercel's serverless runtime
const app = require('../server/index');

module.exports = app;
