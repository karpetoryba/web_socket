import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from '../auth/ws-auth.guard';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing')
  handleTyping(client: Socket, isTyping: boolean) {
    if (isTyping) {
      this.server.emit('userTyping', client.data.user.id);
    } else {
      this.server.emit('userStoppedTyping', client.data.user.id);
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('messageFromClient')
  handleMessage(client: Socket, message: string) {
    this.server.emit('messageFromBack', {
      text: message,
      userId: client.data.user.id,
      timestamp: new Date(),
    });
  }
}
