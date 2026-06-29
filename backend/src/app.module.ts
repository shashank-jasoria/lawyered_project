import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { AuthModule } from './auth/auth.module'; // we'll create this next
import { UsersController } from './users/users.controller';
import { Will } from './wills/entities/will.entity';
import { Beneficiary } from './wills/entities/beneficiary.entity';
import { Asset } from './wills/entities/asset.entity';
import { AssetShare } from './wills/entities/asset-share.entity';
import { ConversationMessage } from './wills/entities/conversation-message.entity';
import { ChatModule } from './chat/chat.module';
import { WillsModule } from './wills/wills.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'config.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin',
      database: process.env.DB_NAME || 'willmaker',
      entities: [User, Will, Beneficiary, Asset, AssetShare, ConversationMessage],
      synchronize: false, // auto-creates tables (dev only, don't use in production)
    }),
    AuthModule,
    ChatModule,
    WillsModule,
  ],
  controllers: [UsersController],
  
})
export class AppModule {}