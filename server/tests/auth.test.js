const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/User');

// Setup a minimal test app
const app = express();
app.use(express.json());

// Mock socket.io
app.set('io', { to: () => ({ emit: () => {} }) });

app.use('/api/auth', require('../routes/auth'));
app.use('/api/users', require('../routes/users'));
app.use(require('../middleware/errorHandler'));

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raktsetu_test';

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
});

afterAll(async () => {
  await User.deleteMany({ email: /test@raktsetu/ });
  await mongoose.connection.close();
});

describe('Auth API', () => {
  let token;

  test('POST /api/auth/register - should register a new donor', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Donor',
        email: 'test@raktsetu.donor.com',
        password: 'password123',
        role: 'donor',
        bloodGroup: 'O+',
        phone: '9876543210',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('donor');
    token = res.body.token;
  });

  test('POST /api/auth/register - should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Donor 2',
        email: 'test@raktsetu.donor.com',
        password: 'password123',
        role: 'donor',
      });

    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login - should login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@raktsetu.donor.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@raktsetu.donor.com');
  });

  test('POST /api/auth/login - should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@raktsetu.donor.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me - should get current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Test Donor');
  });

  test('GET /api/auth/me - should reject without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Validation', () => {
  test('POST /api/auth/register - should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test',
        email: 'notanemail',
        password: 'password123',
        role: 'donor',
      });

    expect(res.status).toBe(400);
  });

  test('POST /api/auth/register - should reject invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test',
        email: 'test@raktsetu.valid.com',
        password: 'password123',
        role: 'admin',
      });

    expect(res.status).toBe(400);
  });
});
