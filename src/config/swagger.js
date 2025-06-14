const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Vacunación API',
      version: '1.0.0',
      description: 'API para gestionar el sistema de vacunación con roles y autenticación JWT.',
    },
    servers: [
      {
        url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api`
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Users', description: 'Operaciones relacionadas con usuarios' },
      { name: 'Adverse Events', description: 'Gestión de eventos adversos' },
      { name: 'Alerts', description: 'Gestión de alertas' },
      { name: 'Appointments', description: 'Gestión de citas' },
      { name: 'Audits', description: 'Registro de auditorías' },
      { name: 'Campaign Assignments', description: 'Asignación de campañas a centros' },
      { name: 'Campaigns', description: 'Gestión de campañas de vacunación' },
      { name: 'Centers', description: 'Gestión de centros de vacunación' },
      { name: 'Children', description: 'Gestión de niños' },
      { name: 'Guardians', description: 'Gestión de tutores' },
      { name: 'Health Staff', description: 'Gestión de personal de salud' },
      { name: 'Reports', description: 'Generación de informes' },
      { name: 'Supplies', description: 'Gestión de suministros' },
      { name: 'Supply Usage', description: 'Registro de uso de suministros' },
      { name: 'Vaccinations', description: 'Gestión de vacunaciones' },
      { name: 'Vaccination Schedules', description: 'Gestión de esquemas de vacunación' },
      { name: 'Vaccine Batches', description: 'Gestión de lotes de vacunas' },
    ],
  },
  apis: [path.join(__dirname, '../routes/*.js')]
};

const specs = swaggerJsDoc(options);
module.exports = specs;