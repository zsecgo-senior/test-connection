import dgram from 'dgram';
import { Logger } from '../utils/logger.js';

export class UDPServer {
  constructor(port = 3001) {
    this.port = port;
    this.server = null;
  }

  start() {
    return new Promise((resolve) => {
      this.server = dgram.createSocket('udp4');

      this.server.on('message', (msg, rinfo) => {
        try {
          const message = JSON.parse(msg.toString());

          const response = JSON.stringify({
            sequence: message.sequence,
            timestamp: process.hrtime.bigint().toString(),
            echo: message.data
          });

          this.server.send(response, rinfo.port, rinfo.address, (err) => {
            if (err && err.code !== 'ECONNRESET') {
              Logger.error(`UDP send error: ${err.message}`);
            }
          });
        } catch (err) {
          Logger.error(`UDP message parse error: ${err.message}`);
        }
      });

      this.server.on('error', (err) => {
        Logger.error(`UDP server error: ${err.message}`);
      });

      this.server.bind(this.port, () => {
        Logger.success(`UDP server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          Logger.info('UDP server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
