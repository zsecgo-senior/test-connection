import net from 'net';
import { MetricsCollector } from '../utils/metrics.js';

export class TCPClient {
  constructor(host = 'localhost', port = 3000) {
    this.host = host;
    this.port = port;
    this.metrics = new MetricsCollector();
  }

  async runTest(numPackets = 1000, packetSize = 1024) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let packetsReceived = 0;
      const pendingResponses = new Map();

      socket.connect(this.port, this.host, () => {
        this.metrics.startTimer();

        for (let i = 0; i < numPackets; i++) {
          const sendTime = process.hrtime.bigint();
          const payload = 'x'.repeat(Math.max(10, packetSize - 100));

          const message = JSON.stringify({
            sequence: i,
            timestamp: sendTime.toString(),
            data: payload
          }) + '\n';

          pendingResponses.set(i, sendTime);
          socket.write(message);
          this.metrics.recordPacketSent(Buffer.byteLength(message));
        }
      });

      let buffer = '';
      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        lines.forEach(line => {
          if (!line.trim()) return;

          try {
            const response = JSON.parse(line);
            const receiveTime = process.hrtime.bigint();
            const sendTime = pendingResponses.get(response.sequence);

            if (sendTime) {
              const latency = receiveTime - sendTime;
              this.metrics.recordLatency(latency);
              this.metrics.recordPacketReceived(Buffer.byteLength(line), response.sequence);
              pendingResponses.delete(response.sequence);
            }

            packetsReceived++;

            if (packetsReceived >= numPackets) {
              this.metrics.endTimer();
              socket.end();
              resolve(this.metrics.calculate());
            }
          } catch (err) {
            // Invalid JSON
          }
        });
      });

      socket.on('error', (err) => {
        reject(err);
      });

      socket.on('close', () => {
        if (packetsReceived < numPackets) {
          this.metrics.endTimer();
          resolve(this.metrics.calculate());
        }
      });

      setTimeout(() => {
        socket.end();
        this.metrics.endTimer();
        resolve(this.metrics.calculate());
      }, 30000);
    });
  }
}
