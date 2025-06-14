const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/auth');
const checkRole = require('./middleware/role');
const { logger } = require('./config/db');
require('dotenv').config();

// Import all route files
const childrenRoutes = require('./routes/children');
const vaccinationsRoutes = require('./routes/vaccinations');
const appointmentsRoutes = require('./routes/appointments');
const adverseEventsRoutes = require('./routes/adverseEvents');
const centersRoutes = require('./routes/centers');
const guardiansRoutes = require('./routes/guardians');
const vaccineBatchesRoutes = require('./routes/vaccineBatches');
const healthStaffRoutes = require('./routes/healthStaff');
const usersRoutes = require('./routes/users');
const campaignsRoutes = require('./routes/campaigns');
const campaignAssignmentsRoutes = require('./routes/campaignAssignments');
const suppliesRoutes = require('./routes/supplies');
const supplyUsageRoutes = require('./routes/supplyUsage');
const vaccinationSchedulesRoutes = require('./routes/vaccinationSchedules');
const auditsRoutes = require('./routes/audits');
const alertsRoutes = require('./routes/alerts');
const reportsRoutes = require('./routes/reports');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

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
    ip: req.ip,
  });
  next();
});

// Configura Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Rutas y middleware aquí
app.listen(3000, () => console.log('Server running on port 3000'));

app.get('/test-swagger', (req, res) => {
  res.json(swaggerSpecs);
});

// Routes
// Public routes (no authentication required)
app.use('/api/users', usersRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/guardians', guardiansRoutes);
app.use('/api/centers',  centersRoutes);

// Protected routes with authentication and role-based access
app.use(
  '/api/vaccinations',
  [authenticate, checkRole(['Médico', 'Enfermera'])],
  vaccinationsRoutes
);

app.use(
  '/api/appointments',
  [authenticate, checkRole(['Médico', 'Enfermera', 'Digitador'])],
  appointmentsRoutes
);

app.use(
  '/api/adverse-events',
  [authenticate, checkRole(['Médico', 'Enfermera'])],
  adverseEventsRoutes
);

app.use(
  '/api/vaccine-batches',
  [authenticate, checkRole(['Administrador'])],
  vaccineBatchesRoutes
);

app.use(
  '/api/health-staff',
  [authenticate, checkRole(['Administrador'])],
  healthStaffRoutes
);

app.use('/api/campaigns', [authenticate, checkRole(['Administrador'])], campaignsRoutes);
app.use(
  '/api/campaign-assignments',
  [authenticate, checkRole(['Administrador'])],
  campaignAssignmentsRoutes
);

app.use('/api/supplies', [authenticate, checkRole(['Administrador'])], suppliesRoutes);
app.use(
  '/api/supply-usage',
  [authenticate, checkRole(['Médico', 'Enfermera'])],
  supplyUsageRoutes
);

app.use(
  '/api/vaccination-schedules',
  [authenticate, checkRole(['Administrador'])],
  vaccinationSchedulesRoutes
);

app.use('/api/audits', [authenticate, checkRole(['Supervisor', 'Administrador'])], auditsRoutes);
app.use(
  '/api/alerts',
  [authenticate, checkRole(['Médico', 'Enfermera', 'Supervisor'])],
  alertsRoutes
);

app.use(
  '/api/reports',
  [authenticate, checkRole(['Supervisor', 'Administrador'])],
  reportsRoutes
);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});