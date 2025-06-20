const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const { authenticate, checkRole } = require('./middleware/auth');
const { logger } = require('./config/db');
require('dotenv').config();

const childrenRoutes = require('./routes/children');
const guardiansRoutes = require('./routes/guardians');
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

// Configurar Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Ruta de prueba para Swagger
app.get('/test-swagger', (req, res) => {
  res.json(swaggerSpecs);
});

// Ruta pública específica para login
app.use('/api/users/login', usersRoutes);

// Rutas protegidas con autenticación y acceso basado en roles
// Gestión de usuarios (solo administrador)
app.use('/api/users', [authenticate, checkRole(['administrador'])], usersRoutes);

app.use('/api/children', [authenticate, checkRole(['doctor', 'administrador'])], childrenRoutes);
app.use('/api/guardians', [authenticate, checkRole(['doctor', 'administrador'])], guardiansRoutes);
app.use('/api/centers', [authenticate, checkRole(['director', 'administrador'])], centersRoutes);
app.use('/api/countries', [authenticate, checkRole(['director', 'administrador'])], countriesRoutes);

app.use('/api/vaccines', [authenticate, checkRole(['director', 'administrador'])], vaccinesRoutes);
app.use('/api/vaccine-lots', [authenticate, checkRole(['director', 'administrador'])], vaccineLotsRoutes);

app.use('/api/vaccination-history', [authenticate, checkRole(['doctor', 'administrador'])], vaccinationHistoryRoutes);
app.use('/api/appointments', [authenticate, checkRole(['doctor', 'administrador'])], appointmentsRoutes);

app.use('/api/adverse-events', [authenticate, checkRole(['doctor', 'administrador'])], adverseEventsRoutes);

app.use('/api/health-staff', [authenticate, checkRole(['director', 'administrador'])], healthStaffRoutes);

app.use('/api/campaigns', [authenticate, checkRole(['director', 'administrador'])], campaignsRoutes);
app.use('/api/campaign-assignments', [authenticate, checkRole(['director', 'administrador'])], campaignAssignmentsRoutes);

app.use('/api/supplies', [authenticate, checkRole(['director', 'administrador'])], suppliesRoutes);
app.use('/api/supply-usage', [authenticate, checkRole(['doctor', 'administrador'])], supplyUsageRoutes);

app.use('/api/vaccination-schedules', [authenticate, checkRole(['director', 'administrador'])], vaccinationSchedulesRoutes);
app.use('/api/national-calendars', [authenticate, checkRole(['director', 'administrador'])], nationalCalendarsRoutes);

app.use('/api/audits', [authenticate, checkRole(['director', 'administrador'])], auditsRoutes);
app.use('/api/alerts', [authenticate, checkRole(['doctor', 'director', 'administrador'])], alertsRoutes);

app.use('/api/reports', [authenticate, checkRole(['director', 'administrador'])], reportsRoutes);

app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

module.exports = app; // Exportar app para pruebas si es necesario