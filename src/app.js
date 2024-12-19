const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');
const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');

// create our Express app
const app = express();

// Use CORS and other middlewares
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:8888', 'https://thembi.onrender.com', 'https://thembi.kizuri.co.za'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes
app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// Redirect all other routes to the index.html (for React Router handling)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use(errorHandlers.notFound);
app.use(errorHandlers.productionErrors);

// Start the server
const server = app.listen(process.env.PORT || 8888, () => {
  console.log(`Express server running on port ${server.address().port}`);
});

module.exports = app;
