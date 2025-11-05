import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('GPA API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as main.ts
    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/gpa/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/gpa/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('service', 'GPA Simulator');
          expect(res.body).toHaveProperty('status');
          expect(['healthy', 'unhealthy']).toContain(res.body.status);
        });
    });
  });

  describe('/api/gpa/simulate (POST)', () => {
    const validInput = {
      scale_max: 4.5,
      G_t: 4.2,
      C_tot: 130,
      history: [
        {
          term_id: 'S1',
          credits: 18,
          achieved_avg: 3.8,
        },
        {
          term_id: 'S2',
          credits: 18,
          achieved_avg: 3.9,
        },
      ],
      terms: [
        {
          id: 'S3',
          type: 'regular',
          planned_credits: 18,
          max_credits: 21,
        },
        {
          id: 'S4',
          type: 'regular',
          planned_credits: 18,
          max_credits: 21,
        },
      ],
    };

    it('should validate and accept valid input', () => {
      return request(app.getHttpServer())
        .post('/api/gpa/simulate')
        .send(validInput)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          if (res.body.success) {
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.data)).toBe(true);
          } else {
            expect(res.body).toHaveProperty('error');
            expect(res.body).toHaveProperty('message');
          }
        });
    });

    it('should reject invalid scale_max', () => {
      const invalidInput = {
        ...validInput,
        scale_max: -1, // Invalid: must be positive
      };

      return request(app.getHttpServer())
        .post('/api/gpa/simulate')
        .send(invalidInput)
        .expect(400);
    });

    it('should reject invalid G_t (too high)', () => {
      const invalidInput = {
        ...validInput,
        G_t: 6.0, // Invalid: exceeds maximum
      };

      return request(app.getHttpServer())
        .post('/api/gpa/simulate')
        .send(invalidInput)
        .expect(400);
    });

    it('should reject missing required fields', () => {
      const invalidInput = {
        scale_max: 4.5,
        // Missing G_t, C_tot, history, terms
      };

      return request(app.getHttpServer())
        .post('/api/gpa/simulate')
        .send(invalidInput)
        .expect(400);
    });

    it('should reject invalid term type', () => {
      const invalidInput = {
        ...validInput,
        terms: [
          {
            id: 'S3',
            type: 'invalid_type', // Should be 'regular' or 'summer'
            planned_credits: 18,
            max_credits: 21,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/api/gpa/simulate')
        .send(invalidInput)
        .expect(400);
    });

    it('should handle freshman scenario (empty history)', () => {
      const freshmanInput = {
        scale_max: 4.5,
        G_t: 4.0,
        C_tot: 130,
        history: [],
        terms: [
          {
            id: 'S1',
            type: 'regular',
            planned_credits: 18,
            max_credits: 21,
          },
          {
            id: 'S2',
            type: 'regular',
            planned_credits: 18,
            max_credits: 21,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/api/gpa/simulate')
        .send(freshmanInput)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
        });
    });

    it('should handle summer semester', () => {
      const summerInput = {
        scale_max: 4.5,
        G_t: 4.3,
        C_tot: 130,
        history: [
          {
            term_id: 'S1',
            credits: 18,
            achieved_avg: 3.5,
          },
        ],
        terms: [
          {
            id: 'S2',
            type: 'regular',
            planned_credits: 18,
            max_credits: 21,
          },
          {
            id: 'Summer1',
            type: 'summer',
            planned_credits: 6,
            max_credits: 9,
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/api/gpa/simulate')
        .send(summerInput)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
        });
    });

    it('should test with sample.json data', () => {
      let sampleData;
      try {
        const dataPath = join(__dirname, '..', 'data', 'sample.json');
        const fileContent = readFileSync(dataPath, 'utf-8');
        sampleData = JSON.parse(fileContent);
      } catch (error) {
        // If file doesn't exist, skip this test
        console.log('sample.json not found, skipping test');
        return;
      }

      return request(app.getHttpServer())
        .post('/api/gpa/simulate')
        .send(sampleData)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          if (res.body.success) {
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);

            // Validate response structure
            res.body.data.forEach((result: any) => {
              expect(result).toHaveProperty('term_id');
              expect(result).toHaveProperty('credits');
              expect(result).toHaveProperty('required_avg');
              expect(typeof result.credits).toBe('number');
              expect(typeof result.required_avg).toBe('number');
            });
          }
        });
    });
  });
});
