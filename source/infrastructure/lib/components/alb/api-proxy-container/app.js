const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const https = require('https');
const app = express();
const port = 8080;

// Disable SSL certificate validation globally for Node.js
// This is not recommended for production, but helps with development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Create a custom HTTPS agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Get API Gateway endpoint from environment variable
const apiEndpoint = process.env.API_ENDPOINT || '';

// Add startup validation
if (!apiEndpoint) {
  console.error('ERROR: API_ENDPOINT environment variable is not set');
  console.error('The container will start anyway to allow health checks to pass');
  console.error('But API proxying will not work until API_ENDPOINT is set');
}

console.log('Starting API Gateway proxy with endpoint:', apiEndpoint || 'NOT SET');

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Add security headers and CORS middleware
app.use((req, res, next) => {
  // Set Content-Security-Policy to allow necessary resources
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https://*.amazonaws.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://*.amazonaws.com;"
  );
  // Set other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  lastModified: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  // Always return OK for health checks, even if API_ENDPOINT is not set
  res.status(200).send('OK');
});

// Debug endpoint to check environment
app.get('/debug', (req, res) => {
  res.json({
    apiEndpoint,
    environment: process.env,
    headers: req.headers,
  });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Test API endpoint that doesn't go through the proxy
app.get('/test', (req, res) => {
  res.json({
    message: 'Direct test endpoint is working',
    timestamp: new Date().toISOString(),
    apiEndpoint: apiEndpoint
  });
});

// Authentication helper endpoint
app.get('/api/auth-helper', (req, res) => {
  res.json({
    message: 'Authentication Helper',
    instructions: 'To authenticate, use the /api/auth/dev-login endpoint with username "devuser" and password "devpassword"',
    endpoints: {
      login: '/api/auth/dev-login',
      test: '/test',
      debug: '/debug'
    },
    note: 'After login, store the token and include it in the Authorization header for API requests'
  });
});

// Handle source map requests (return 404 instead of proxying to API Gateway)
app.get(/.*\.js\.map$/, (req, res) => {
  console.log('Source map requested, returning 404:', req.path);
  res.status(404).send('Source map not available');
});

// Special handler for portalLoad.js
app.get('/api/auth/portalLoad.js', (req, res) => {
  console.log('Serving portalLoad.js');
  
  // Serve a minimal implementation of portalLoad.js
  const portalLoadJs = `
    // Authentication portal loader for AWS IAM Identity Center
    console.log('AWS IAM Identity Center authentication portal loader initialized');

    // Function to handle portal loading
    function loadAuthPortal(config) {
      console.log('Loading IAM Identity Center authentication portal with config:', config);
      
      return {
        init: function() {
          console.log('Authentication portal initialized');
          return Promise.resolve();
        },
        login: function(credentials) {
          console.log('Initiating IAM Identity Center login flow');
          
          // For development, use the dev login endpoint
          if (config && config.useDev) {
            return fetch('/api/auth/dev-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(credentials)
            }).then(response => response.json());
          }
          
          // For production, redirect to the actual login endpoint
          const redirectUrl = encodeURIComponent(window.location.origin + '/api/auth/callback');
          window.location.href = \`/api/auth/login?redirect_url=\${redirectUrl}\`;
          
          // This promise will not resolve as the page will redirect
          return new Promise(() => {});
        },
        logout: function() {
          console.log('Logging out from IAM Identity Center');
          
          // For development
          if (config && config.useDev) {
            localStorage.removeItem('token');
            return Promise.resolve({ success: true });
          }
          
          // For production
          window.location.href = '/api/auth/logout';
          return new Promise(() => {});
        }
      };
    }

    // Export the function
    window.loadAuthPortal = loadAuthPortal;
  `;
  
  // Set the content type to JavaScript
  res.setHeader('Content-Type', 'application/javascript');
  res.send(portalLoadJs);
});

// Special handler for searchParam.js
app.get('/api/auth/searchParam.js', (req, res) => {
  console.log('Serving searchParam.js');
  
  // Serve a minimal implementation of searchParam.js
  const searchParamJs = `
    // Search parameter utilities for AWS IAM Identity Center authentication
    console.log('AWS IAM Identity Center authentication search parameter utilities initialized');

    // Function to parse search parameters
    function parseSearchParams() {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      
      // Combine search and hash parameters
      const params = {};
      
      // Add search parameters
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
      
      // Add hash parameters
      for (const [key, value] of hashParams.entries()) {
        params[key] = value;
      }
      
      console.log('Parsed search parameters:', params);
      return params;
    }

    // Function to get a specific parameter
    function getSearchParam(name) {
      const params = parseSearchParams();
      return params[name];
    }

    // Function to set a search parameter
    function setSearchParam(name, value) {
      const url = new URL(window.location.href);
      url.searchParams.set(name, value);
      window.history.replaceState({}, '', url);
    }

    // Function to handle SAML response
    function handleSamlResponse() {
      const params = parseSearchParams();
      
      // Check if we have a SAML response or OAuth code
      if (params.SAMLResponse || params.code) {
        console.log('Authentication response detected');
        
        // Store the token if present
        if (params.access_token) {
          localStorage.setItem('token', params.access_token);
          console.log('Access token stored');
        }
        
        // Remove authentication parameters from URL
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        window.history.replaceState({}, '', url);
        
        return true;
      }
      
      return false;
    }

    // Export the functions
    window.parseSearchParams = parseSearchParams;
    window.getSearchParam = getSearchParam;
    window.setSearchParam = setSearchParam;
    window.handleSamlResponse = handleSamlResponse;
  `;
  
  // Set the content type to JavaScript
  res.setHeader('Content-Type', 'application/javascript');
  res.send(searchParamJs);
});

// Development authentication endpoint (FOR DEVELOPMENT ONLY)
app.post('/api/auth/dev-login', (req, res) => {
  console.log('Development login endpoint called');
  
  // Check for username and password in request body
  const { username, password } = req.body;
  
  // Very simple validation - DO NOT USE IN PRODUCTION
  if (username === 'devuser' && password === 'devpassword') {
    // Return a mock authentication response
    res.json({
      authenticated: true,
      user: {
        id: 'dev-user-id',
        username: username,
        email: 'dev@example.com',
        roles: ['Developer']
      },
      token: 'dev-jwt-token-' + Date.now(),
      expiresIn: 3600
    });
  } else {
    // Return authentication failure
    res.status(401).json({
      authenticated: false,
      message: 'Invalid credentials'
    });
  }
});

// Proxy API requests
app.use('/api', async (req, res) => {
  // If API_ENDPOINT is not set, return an error
  if (!apiEndpoint) {
    return res.status(500).json({
      message: 'API_ENDPOINT environment variable is not set',
    });
  }

  try {
    // Get the path without the /api prefix
    const apiPath = req.url || '';
    
    // Parse the API endpoint to separate domain and stage
    let domain = apiEndpoint;
    let stage = '';
    
    // Check if the endpoint contains a stage path (like 'prod', 'dev', etc.)
    if (apiEndpoint.includes('/')) {
      // Remove trailing slash if present
      const cleanEndpoint = apiEndpoint.endsWith('/') ? apiEndpoint.slice(0, -1) : apiEndpoint;
      const parts = cleanEndpoint.split('/');
      domain = parts[0];
      if (parts.length > 1) {
        stage = '/' + parts.slice(1).join('/');
      }
    }
    
    // Construct the full URL
    const apiUrl = `https://${domain}${stage}${apiPath}`;
    
    console.log(`API endpoint: ${apiEndpoint}`);
    console.log(`Parsed domain: ${domain}`);
    console.log(`Parsed stage: ${stage}`);
    
    console.log(`Proxying request to: ${apiUrl}`);
    console.log(`Method: ${req.method}`);
    console.log(`Headers:`, req.headers);
    
    // Forward the request to API Gateway
    console.log(`Full API URL: ${apiUrl}`);
    console.log(`Request data:`, req.body);
    
    // Create a clean set of headers for the API request
    const apiHeaders = { ...req.headers };
    
    // Set the host header to the API domain
    apiHeaders.host = domain;
    
    // Special handling for authentication endpoints
    if (apiPath.includes('/auth/') || apiPath.includes('/token/')) {
      console.log('Authentication endpoint detected, using special handling');
      
      // For auth endpoints, keep the original origin (ALB domain) since IdC is now configured
      apiHeaders.origin = req.headers.origin || `https://${req.headers.host}`;
      
      // Add referer header to match the ALB origin
      apiHeaders.referer = req.headers.origin || `https://${req.headers.host}`;
      
      // Add other headers that might be expected by AWS SSO
      apiHeaders['sec-fetch-site'] = 'cross-site';
      apiHeaders['sec-fetch-mode'] = 'cors';
      apiHeaders['sec-fetch-dest'] = 'empty';
      
      // Special handling for JavaScript files
      if (apiPath.endsWith('.js')) {
        console.log('JavaScript file requested, setting appropriate headers');
        apiHeaders['Accept'] = 'application/javascript';
      }
    } else {
      // For non-auth endpoints, use the original headers
      apiHeaders.origin = req.headers.origin || `https://${req.headers.host}`;
    }
    
    // Remove headers that might cause issues
    delete apiHeaders['content-length'];
    
    console.log(`API request headers:`, apiHeaders);
    
    const response = await axios({
      method: req.method,
      url: apiUrl,
      headers: apiHeaders,
      data: req.body,
      validateStatus: () => true, // Don't throw on error status codes
      timeout: 30000, // 30 second timeout
      httpsAgent: httpsAgent, // Use the global httpsAgent
      maxRedirects: 0 // Don't follow redirects - let the browser handle them
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`Response data:`, typeof response.data === 'string' ? response.data.substring(0, 500) + '...' : JSON.stringify(response.data, null, 2));
    
    // Forward the response back to the client
    res.status(response.status);
    
    // Set response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      try {
        res.setHeader(key, value);
      } catch (err) {
        console.warn(`Could not set header ${key}:`, err.message);
      }
    });
    
    // Send response body
    res.send(response.data);
  } catch (error) {
    console.error('Error proxying request:', error);
    
    // Add more detailed error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
      
      // Forward the actual error response from the API
      res.status(error.response.status).json({
        message: 'API Error',
        error: error.message,
        apiResponse: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from API');
      console.error('Request details:', error.request);
      
      res.status(502).json({
        message: 'Bad Gateway',
        error: 'No response received from API',
        details: error.message
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
      
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message,
        stack: error.stack,
      });
    }
  }
});

// For client-side routing, serve index.html for all non-file requests
app.use((req, res, next) => {
  // Skip if the request is for a file with an extension
  if (req.path.includes('.')) {
    return next();
  }
  
  // Serve index.html for client-side routing
  const indexPath = path.join(__dirname, 'public', 'index.html');
  
  // Check if index.html exists
  if (fs.existsSync(indexPath)) {
    console.log(`Serving index.html for client-side routing: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    console.error(`index.html not found at ${indexPath}`);
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message,
    stack: err.stack,
  });
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Web application and API proxy listening at http://localhost:${port}`);
  console.log(`Proxying API requests to: ${apiEndpoint || 'NOT SET'}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Keep the process running for health checks
  // but log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Keep the process running for health checks
  // but log the error
});