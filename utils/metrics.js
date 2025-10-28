export class MetricsCollector {
  constructor() {
    this.latencies = [];
    this.startTime = null;
    this.endTime = null;
    this.bytesReceived = 0;
    this.bytesSent = 0;
    this.packetsSent = 0;
    this.packetsReceived = 0;
    this.packetsLost = 0;
    this.outOfOrderPackets = 0;
    this.lastSequence = -1;
    this.cpuStart = null;
    this.cpuEnd = null;
    this.memStart = null;
    this.memEnd = null;
  }

  startTimer() {
    this.startTime = process.hrtime.bigint();
    this.cpuStart = process.cpuUsage();
    this.memStart = process.memoryUsage();
  }

  endTimer() {
    this.endTime = process.hrtime.bigint();
    this.cpuEnd = process.cpuUsage(this.cpuStart);
    this.memEnd = process.memoryUsage();
  }

  recordLatency(latencyNs) {
    this.latencies.push(Number(latencyNs) / 1_000_000);
  }

  recordPacketSent(bytes) {
    this.packetsSent++;
    this.bytesSent += bytes;
  }

  recordPacketReceived(bytes, sequence = null) {
    this.packetsReceived++;
    this.bytesReceived += bytes;

    if (sequence !== null) {
      if (this.lastSequence !== -1) {
        const expectedSeq = this.lastSequence + 1;
        if (sequence < expectedSeq) {
          this.outOfOrderPackets++;
        } else if (sequence > expectedSeq) {
          this.packetsLost += (sequence - expectedSeq);
        }
      }
      this.lastSequence = sequence;
    }
  }

  calculate() {
    const durationMs = Number(this.endTime - this.startTime) / 1_000_000;
    const durationSec = durationMs / 1000;

    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    const minLatency = this.latencies.length > 0
      ? Math.min(...this.latencies)
      : 0;

    const maxLatency = this.latencies.length > 0
      ? Math.max(...this.latencies)
      : 0;

    const jitter = this.latencies.length > 1
      ? this.calculateJitter()
      : 0;

    const throughputMbps = durationSec > 0
      ? ((this.bytesReceived * 8) / durationSec / 1_000_000)
      : 0;

    const packetLossPercent = this.packetsSent > 0
      ? (this.packetsLost / this.packetsSent * 100)
      : 0;

    const cpuUsageMs = this.cpuEnd
      ? (this.cpuEnd.user + this.cpuEnd.system) / 1000
      : 0;

    const memUsedMB = this.memEnd
      ? (this.memEnd.heapUsed - this.memStart.heapUsed) / 1024 / 1024
      : 0;

    return {
      avgLatency: avgLatency.toFixed(2),
      minLatency: minLatency.toFixed(2),
      maxLatency: maxLatency.toFixed(2),
      jitter: jitter.toFixed(2),
      throughput: throughputMbps.toFixed(2),
      packetLoss: packetLossPercent.toFixed(2),
      outOfOrder: this.outOfOrderPackets,
      packetsReceived: this.packetsReceived,
      packetsSent: this.packetsSent,
      bytesReceived: this.bytesReceived,
      bytesSent: this.bytesSent,
      duration: durationMs.toFixed(2),
      cpuUsage: cpuUsageMs.toFixed(2),
      memUsage: memUsedMB.toFixed(2)
    };
  }

  calculateJitter() {
    if (this.latencies.length < 2) return 0;

    let jitterSum = 0;
    for (let i = 1; i < this.latencies.length; i++) {
      jitterSum += Math.abs(this.latencies[i] - this.latencies[i - 1]);
    }
    return jitterSum / (this.latencies.length - 1);
  }
}
