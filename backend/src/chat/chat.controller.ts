import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('wills')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/chat')
  async sendMessage(
    @Param('id') willId: string,
    @Body() dto: SendMessageDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.chatService.handleMessage(willId, userId, dto.message);
  }
}