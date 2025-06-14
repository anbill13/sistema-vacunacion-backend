const request = require('supertest');
const app = require('../index');
const { poolPromise } = require('../src/config/db');

describe('Vaccinations API', () => {
  let token;

  beforeAll(async () => {
    // Login to get token
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'jperez', password: 'securepassword123' });
    token = res.body.token;
  });

  afterAll(async () => {
    const pool = await poolPromise;
    await pool.close();
  });

  test('POST /vaccinations should register a vaccination', async () => {
    const res = await request(app)
      .post('/api/vaccinations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_niño: '123e4567-e89b-12d3-a456-426614174000',
        id_centro: '223e4567-e89b-12d3-a456-426614174001',
        id_vacuna: '323e4567-e89b-12d3-a456-426614174002',
        id_lote: '423e4567-e89b-12d3-a456-426614174003',
        fecha_aplicacion: '2025-06-10',
        tipo_dosis: 'Primera',
        edad_al_vacunarse: 5,
        id_personal_responsable: '523e4567-e89b-12d3-a456-426614174004',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Vaccination registered successfully');
  });

  test('GET /vaccinations/:id_niño should return history', async () => {
    const res = await request(app)
      .get('/api/vaccinations/123e4567-e89b-12d3-a456-426614174000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});