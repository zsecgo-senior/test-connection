# Protocol Performance Testing Suite

A comprehensive Node.js benchmarking tool that tests and compares the performance of TCP, UDP, and QUIC protocols.

## Features

- **Multiple Protocol Support**: Tests TCP, UDP, and QUIC (simulated) protocols
- **Comprehensive Metrics**: Measures latency, throughput, jitter, packet loss, out-of-order packets, CPU usage, and RAM usage
- **Color-Coded Logging**: Beautiful console output with color-coded status messages
- **Automated Testing**: Sequential test execution with automatic server startup/shutdown
- **Comparison Tables**: Side-by-side performance comparison of all protocols

## Project Structure

```
project/
├── index.js                 # Main orchestrator - starts servers and runs tests
├── package.json             # Dependencies and scripts
├── server/
│   ├── tcp-server.js       # TCP echo server
│   ├── udp-server.js       # UDP echo server
│   └── quic-server.js      # QUIC echo server (UDP-based)
├── client/
│   ├── tcp-client.js       # TCP performance test client
│   ├── udp-client.js       # UDP performance test client
│   └── quic-client.js      # QUIC performance test client
└── utils/
    ├── logger.js           # Color-coded console logger
    └── metrics.js          # Performance metrics calculator
```

## Requirements

- Node.js v22 or higher
- npm (Node Package Manager)

## Installation

```bash
npm install
```

## Usage

Run all protocol tests:

```bash
npm start
```

Or directly:

```bash
node index.js
```

## Configuration

You can modify test parameters in `index.js`:

```javascript
const NUM_PACKETS = 100;    // Number of packets to send per test
const PACKET_SIZE = 512;    // Size of each packet in bytes
const WARMUP_DELAY = 500;   // Delay between tests in milliseconds
```

## Metrics Collected

- **Average Latency**: Mean round-trip time for packets
- **Min/Max Latency**: Lowest and highest latency observed
- **Jitter**: Average variation in latency between consecutive packets
- **Throughput**: Data transfer rate in Mbps
- **Packet Loss**: Percentage of packets that didn't reach destination
- **Out of Order Packets**: Number of packets received out of sequence
- **CPU Usage**: CPU time consumed during the test
- **Memory Usage**: Heap memory allocated during the test

## Port Configuration

- TCP Server: Port 3000
- UDP Server: Port 3001
- QUIC Server: Port 3002 (simulated via UDP)

## Technical Details

### TCP Implementation
- Uses Node.js `net` module
- Newline-delimited JSON messages for proper stream parsing
- Reliable, ordered delivery with connection management

### UDP Implementation
- Uses Node.js `dgram` module
- Best-effort delivery with no connection overhead
- May experience packet loss and out-of-order delivery

### QUIC Implementation
- Simulated using UDP transport
- Demonstrates QUIC-like characteristics
- Note: Real QUIC requires WebTransport API (browser-based)

## Output Example

The tool provides three levels of output:

1. **Individual Protocol Results**: Detailed metrics for each protocol test
2. **Comparison Table**: Side-by-side comparison of all protocols
3. **Color-Coded Status**: Visual feedback with success (green), info (blue), warnings (yellow), and errors (red)

## Dependencies

- **chalk** (^5.3.0): Terminal string styling with colors

## Notes

- Tests run sequentially to avoid interference
- Servers start automatically before tests begin
- All servers shut down gracefully after tests complete
- QUIC implementation is simulated via UDP for demonstration purposes
- Results may vary based on system load and network conditions

## License

MIT
"# test-connection" 
