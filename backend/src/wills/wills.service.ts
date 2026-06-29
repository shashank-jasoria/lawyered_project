import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Will } from './entities/will.entity';

@Injectable()
export class WillsService {
  constructor(
    @InjectRepository(Will)
    private willRepo: Repository<Will>,
  ) {}

  async createWill(userId: string): Promise<Will> {
    const will = this.willRepo.create({
      user_id: userId,
      status: 'draft',
      revocation_line: 'I hereby revoke all previous wills and codicils.',
    });
    return this.willRepo.save(will);
  }

  async getWill(willId: string, userId: string): Promise<Will> {
    return this.willRepo.findOne({
      where: { id: willId, user_id: userId },
      relations: [
        'beneficiaries',
        'assets',
        'assets.asset_shares',
        'assets.asset_shares.beneficiary',
      ],
    });
  }

  // You might later add update/delete, but not needed now.
}