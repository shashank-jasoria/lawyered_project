import { Test, TestingModule } from '@nestjs/testing';
import { WillsController } from './wills.controller';

describe('WillsController', () => {
  let controller: WillsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WillsController],
    }).compile();

    controller = module.get<WillsController>(WillsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
