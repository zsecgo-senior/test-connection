import dgram from 'dgram';
import { MetricsCollector } from '../utils/metrics.js';

export class UDPClient {
  constructor(host = 'localhost', port = 3001) {
    this.host = host;
    this.port = port;
    this.metrics = new MetricsCollector();
  }

  async runTest(numPackets = 1000, packetSize = 1024) {
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      let packetsReceived = 0;
      const pendingResponses = new Map();
      let testComplete = false;

      this.metrics.startTimer();

      socket.on('message', (msg) => {
        if (testComplete) return;

        try {
          const response = JSON.parse(msg.toString());
          const receiveTime = process.hrtime.bigint();
          const sendTime = pendingResponses.get(response.sequence);

          if (sendTime) {
            const latency = receiveTime - sendTime;
            this.metrics.recordLatency(latency);
            this.metrics.recordPacketReceived(msg.length, response.sequence);
            pendingResponses.delete(response.sequence);
          }

          packetsReceived++;

          if (packetsReceived >= numPackets) {
            testComplete = true;
            this.metrics.endTimer();
            socket.close();
            resolve(this.metrics.calculate());
          }
        } catch (err) {
          // Ignore malformed packets
        }
      });

      socket.on('error', (err) => {
        if (!testComplete) {
          testComplete = true;
          this.metrics.endTimer();
          socket.close();
          resolve(this.metrics.calculate());
        }
      });

      const sendPackets = () => {
        for (let i = 0; i < numPackets; i++) {
          const sendTime = process.hrtime.bigint();
          const payload = 'x'.repeat(packetSize - 100);

          const message = JSON.stringify({
            sequence: i,
            timestamp: sendTime.toString(),
            data: payload
          });

          pendingResponses.set(i, sendTime);
          const buffer = Buffer.from(message);

          socket.send(buffer, this.port, this.host, (err) => {
            if (err && !testComplete) {
              this.metrics.recordPacketSent(0);
            } else {
              this.metrics.recordPacketSent(buffer.length);
            }
          });
        }
      };

      setTimeout(() => {
        sendPackets();
      }, 100);

      setTimeout(() => {
        if (!testComplete) {
          testComplete = true;
          this.metrics.endTimer();
          socket.close();
          resolve(this.metrics.calculate());
        }
      }, 10000);
    });
  }
}
