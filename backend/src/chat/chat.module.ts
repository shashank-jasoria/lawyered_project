import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Will } from '../wills/entities/will.entity';
import { Beneficiary } from '../wills/entities/beneficiary.entity';
import { Asset } from '../wills/entities/asset.entity';
import { AssetShare } from '../wills/entities/asset-share.entity';
import { ConversationMessage } from '../wills/entities/conversation-message.entity';
import { AuthModule } from '../auth/auth.module';
import { MockAiService } from './mock-ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Will,
      Beneficiary,
      Asset,
      AssetShare,
      ConversationMessage,
    ]), AuthModule,
  ],
  providers: [ChatService , MockAiService],
  controllers: [ChatController],
})
export class ChatModule {}