import { Test, TestingModule } from '@nestjs/testing';
import { WillsService } from './wills.service';

describe('WillsService', () => {
  let service: WillsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WillsService],
    }).compile();

    service = module.get<WillsService>(WillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
