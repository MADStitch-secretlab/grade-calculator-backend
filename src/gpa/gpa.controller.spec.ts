import { Test, TestingModule } from '@nestjs/testing';
import { GpaController } from './gpa.controller';
import { GpaService } from './gpa.service';
import { SimulationInputDto } from './dto/simulation-input.dto';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('GpaController', () => {
  let controller: GpaController;
  let service: GpaService;

  const mockGpaService = {
    healthCheck: jest.fn(),
    simulate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GpaController],
      providers: [
        {
          provide: GpaService,
          useValue: mockGpaService,
        },
      ],
    }).compile();

    controller = module.get<GpaController>(GpaController);
    service = module.get<GpaService>(GpaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is running', async () => {
      mockGpaService.healthCheck.mockResolvedValue(true);

      const result = await controller.healthCheck();

      expect(result).toEqual({
        service: 'GPA Simulator',
        status: 'healthy',
      });
      expect(mockGpaService.healthCheck).toHaveBeenCalled();
    });

    it('should return unhealthy status when service is down', async () => {
      mockGpaService.healthCheck.mockResolvedValue(false);

      const result = await controller.healthCheck();

      expect(result).toEqual({
        service: 'GPA Simulator',
        status: 'unhealthy',
      });
    });
  });

  describe('simulate', () => {
    const validInput: SimulationInputDto = {
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

    const mockResults = [
      {
        term_id: 'S3',
        credits: 18,
        required_avg: 4.33,
      },
      {
        term_id: 'S4',
        credits: 18,
        required_avg: 4.33,
      },
    ];

    it('should return successful simulation result', async () => {
      mockGpaService.simulate.mockResolvedValue(mockResults);

      const result = await controller.simulate(validInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(result.message).toBeDefined();
      expect(mockGpaService.simulate).toHaveBeenCalledWith(validInput);
    });

    it('should handle invalid input error (400)', async () => {
      const error = new BadRequestException('Target GPA exceeds scale limit');
      // @ts-ignore
      error['status'] = 400;
      mockGpaService.simulate.mockRejectedValue(error);

      const result = await controller.simulate(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_INPUT');
      expect(result.message).toBeDefined();
    });

    it('should handle target impossible error (422)', async () => {
      const error = new UnprocessableEntityException(
        'Target GPA impossible to achieve',
      );
      // @ts-ignore
      error['status'] = 422;
      mockGpaService.simulate.mockRejectedValue(error);

      const result = await controller.simulate(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('TARGET_IMPOSSIBLE');
      expect(result.message).toBeDefined();
      expect(result.detail).toBeDefined();
    });

    it('should handle server error (500)', async () => {
      const error = new Error('Internal server error');
      error['status'] = 500;
      mockGpaService.simulate.mockRejectedValue(error);

      const result = await controller.simulate(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SERVER_ERROR');
      expect(result.message).toBeDefined();
    });

    it('should handle freshman scenario (no history)', async () => {
      const freshmanInput: SimulationInputDto = {
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

      const freshmanResults = [
        {
          term_id: 'S1',
          credits: 18,
          required_avg: 4.0,
        },
        {
          term_id: 'S2',
          credits: 18,
          required_avg: 4.0,
        },
      ];

      mockGpaService.simulate.mockResolvedValue(freshmanResults);

      const result = await controller.simulate(freshmanInput);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(freshmanResults);
    });

    it('should handle summer semester scenario', async () => {
      const summerInput: SimulationInputDto = {
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

      const summerResults = [
        {
          term_id: 'S2',
          credits: 18,
          required_avg: 4.4,
        },
        {
          term_id: 'Summer1',
          credits: 6,
          required_avg: 4.4,
        },
      ];

      mockGpaService.simulate.mockResolvedValue(summerResults);

      const result = await controller.simulate(summerInput);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });
});
