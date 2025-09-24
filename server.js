const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Endpoint to provide the API key to the frontend
// This script will be loaded by index.html to make the key available in the browser
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.process = {
      env: {
        API_KEY: '${process.env.API_KEY}'
      }
    };
  `);
});

// Serve static files from the root directory (e.g., index.html, components, etc.)
app.use(express.static(path.join(__dirname, '')));

// For any other route that is not a static file, serve the index.html.
// This is crucial for client-side routing to work correctly.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Access the application at http://localhost:${port}`);
});
