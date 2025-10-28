import net from 'net';
import { Logger } from '../utils/logger.js';

export class TCPServer {
  constructor(port = 3000) {
    this.port = port;
    this.server = null;
  }

  start() {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        let buffer = '';

        socket.on('data', (data) => {
          buffer += data.toString();
          const messages = buffer.split('\n');
          buffer = messages.pop() || '';

          messages.forEach(msgStr => {
            if (!msgStr.trim()) return;

            try {
              const message = JSON.parse(msgStr);

              const response = JSON.stringify({
                sequence: message.sequence,
                timestamp: process.hrtime.bigint().toString(),
                echo: message.data
              });

              socket.write(response + '\n');
            } catch (err) {
              // Ignore invalid JSON
            }
          });
        });

        socket.on('error', (err) => {
          if (err.code !== 'ECONNRESET') {
            Logger.error(`TCP socket error: ${err.message}`);
          }
        });
      });

      this.server.listen(this.port, () => {
        Logger.success(`TCP server listening on port ${this.port}`);
        resolve();
      });

      this.server.on('error', (err) => {
        Logger.error(`TCP server error: ${err.message}`);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          Logger.info('TCP server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
