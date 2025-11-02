const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the root directory, but do not serve index.html by default.
// This allows our catch-all to handle serving index.html with the injected API key.
app.use(express.static(path.join(__dirname, ''), { index: false }));

// For any GET request that is not a static file, serve the index.html
// with the API key injected.
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');

  fs.readFile(indexPath, 'utf8', (err, htmlData) => {
    if (err) {
      console.error('Error reading index.html file:', err);
      return res.status(500).send('Error loading page');
    }
    
    // Inject the API key into a script tag right before the closing </head> tag
    const withApiKey = htmlData.replace(
      '</head>',
      `<script>
        window.process = {
          env: {
            API_KEY: '${process.env.API_KEY}'
          }
        };
      </script></head>`
    );
    res.send(withApiKey);
  });
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Access the application at http://localhost:${port}`);
});