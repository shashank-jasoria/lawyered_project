import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WillsService } from './wills.service';
import { WillsController } from './wills.controller';
import { Will } from './entities/will.entity';
import { AuthModule } from '../auth/auth.module';
import { WillValidatorService } from './will-validator.service';
import { WillDocumentService } from './will-document.service';

@Module({
  imports: [TypeOrmModule.forFeature([Will]) , AuthModule, ],
  providers: [WillsService , WillValidatorService , WillDocumentService],
  controllers: [WillsController],
  exports: [WillsService], 
})
export class WillsModule {}