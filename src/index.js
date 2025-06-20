const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const { authenticate, checkRole } = require('./middleware/auth'); // Ajustado a la estructura de middleware proporcionada
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

// Rutas públicas (sin autenticación requerida)
app.use('/api/users', usersRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/guardians', guardiansRoutes);
app.use('/api/centers', centersRoutes);
app.use('/api/countries', countriesRoutes); // Añadido

// Rutas protegidas con autenticación y acceso basado en roles
app.use(
  '/api/vaccines',
  [authenticate, checkRole(['director', 'administrador'])], // Gestionar vacunas
  vaccinesRoutes
);

app.use(
  '/api/vaccination-history',
  [authenticate, checkRole(['doctor', 'administrador'])], // Gestionar historial de vacunación
  vaccinationHistoryRoutes
);

app.use(
  '/api/appointments',
  [authenticate, checkRole(['doctor', 'administrador'])], // Gestionar citas
  appointmentsRoutes
);

app.use(
  '/api/adverse-events',
  [authenticate, checkRole(['doctor', 'administrador'])], // Reportar eventos adversos
  adverseEventsRoutes
);

app.use(
  '/api/vaccine-lots',
  [authenticate, checkRole(['director', 'administrador'])], // Gestionar lotes de vacunas
  vaccineLotsRoutes
);

app.use(
  '/api/health-staff',
  [authenticate, checkRole(['director', 'administrador'])], // Gestionar personal de salud
  healthStaffRoutes
);

app.use(
  '/api/campaigns',
  [authenticate, checkRole(['director', 'administrador'])], // Gestionar campañas
  campaignsRoutes
);

app.use(
  '/api/campaign-assignments',
  [authenticate, checkRole(['director', 'administrador'])], // Asignar campañas
  campaignAssignmentsRoutes
);

app.use(
  '/api/supplies',
  [authenticate, checkRole(['director', 'administrador'])], // Gestionar inventario
  suppliesRoutes
);

app.use(
  '/api/supply-usage',
  [authenticate, checkRole(['doctor', 'administrador'])], // Registrar uso de insumos
  supplyUsageRoutes
);

app.use(
  '/api/vaccination-schedules',
  [authenticate, checkRole(['director', 'administrador'])], // Gestionar calendarios
  vaccinationSchedulesRoutes
);

app.use(
  '/api/national-calendars',
  [authenticate, checkRole(['director', 'administrador'])], // Gestionar calendarios nacionales
  nationalCalendarsRoutes
);

app.use(
  '/api/audits',
  [authenticate, checkRole(['director', 'administrador'])], // Auditar
  auditsRoutes
);

app.use(
  '/api/alerts',
  [authenticate, checkRole(['doctor', 'director', 'administrador'])], // Gestionar alertas
  alertsRoutes
);

app.use(
  '/api/reports',
  [authenticate, checkRole(['director', 'administrador'])], // Generar reportes
  reportsRoutes
);

// Middleware de manejo de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});