import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/operators';


@Injectable({
  providedIn: 'root',
})

export class WebSocketService {
  constructor(private socket: Socket) {}

  connectToWebSocketServer() {
    console.log("Connecting to WebSocket server");
    
    this.socket.fromEvent('connect').subscribe(() => {
        console.log('Connected to WebSocket server');
      });
    
      this.socket.fromEvent('disconnect').subscribe(() => {
        console.log('Disconnected from WebSocket server');
      });
  
    // Now, connect to the WebSocket server
    if (!this.socket.ioSocket || !this.socket.ioSocket.connected) {
      this.socket.connect();
    }
    console.log("WebSocket connection attempted");
  }
  
  

  listenForUserIDs() {
  
        console.log('Connected to  server');
  
        //    this.socket.fromEvent('userIDs').pipe(map((data:any) => console.log('Received user IDs:', data)));
        //     return "fggh";
    return this.socket.fromEvent('userIDs'); // Listen for incoming user IDs from the server
  }

  consoleFunc(){

    console.log(this.socket.connect())
    console.log(this.socket)
  }
}
