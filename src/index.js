const express = require('express');
const cors = require('cors');
const winston = require('winston');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
require('dotenv').config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Import routes
const authRoutes = require('./routes/auth');
const patientRouter = require('./routes/patient');
const centersRoutes = require('./routes/centers');
const vaccinesRoutes = require('./routes/vaccines');
const campaignsRoutes = require('./routes/campaigns');
const campaignAssignmentsRoutes = require('./routes/campaignAssignments');
const healthStaffRoutes = require('./routes/healthStaff');
const usersRoutes = require('./routes/users');
const adverseEventsRoutes = require('./routes/adverseEvents');
const alertsRoutes = require('./routes/alerts');
const appointmentsRoutes = require('./routes/appointments');
const auditsRoutes = require('./routes/audits');
const suppliesRoutes = require('./routes/supplies');
const vaccinationSchedulesRoutes = require('./routes/vaccinationSchedules');
const nationalCalendarsRoutes = require('./routes/nationalCalendars');
const vaccineLotsRoutes = require('./routes/vaccineLots');
const vaccinationHistoryRoutes = require('./routes/vaccinationHistory');
const countriesRoutes = require('./routes/countries');
const supplyUsageRoutes = require('./routes/supplyUsage');
const reportsRoutes = require('./routes/reports');
const tutorsRoutes = require('./routes/tutors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip
  });
  next();
});

// Configure Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use('/', authRoutes); // Mounts /login at /login
app.use('/api', authRoutes); // Also available at /api/login for consistency
app.use('/api/centers', centersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/patients', patientRouter);
app.use('/api/tutors', tutorsRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/vaccines', vaccinesRoutes);
app.use('/api/vaccine-lots', vaccineLotsRoutes);
app.use('/api/vaccination-history', vaccinationHistoryRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/adverse-events', adverseEventsRoutes);
app.use('/api/health-staff', healthStaffRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/campaign-assignments', campaignAssignmentsRoutes);
app.use('/api/supplies', suppliesRoutes);
app.use('/api/supply-usage', supplyUsageRoutes);
app.use('/api/vaccination-schedules', vaccinationSchedulesRoutes);
app.use('/api/national-calendars', nationalCalendarsRoutes);
app.use('/api/audits', auditsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, ip: req.ip });
  res.status(err.statusCode || 500).json({
    error: err.message,
    ...(err.details && { details: err.details })
  });
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

module.exports = app;