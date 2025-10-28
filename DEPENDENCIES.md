# Dependencies

## NPM Packages Required

### Production Dependencies

1. **chalk** (^5.3.0)
   - Purpose: Terminal string styling with colors
   - Used for: Color-coded console output in the logger utility
   - Installation: Included in package.json

## Node.js Built-in Modules

The following Node.js built-in modules are used (no installation required):

1. **net**
   - Used in: TCP server and client
   - Purpose: TCP networking

2. **dgram**
   - Used in: UDP and QUIC (simulated) server and client
   - Purpose: UDP datagram sockets

3. **process**
   - Used in: All files
   - Purpose: High-resolution timing (hrtime.bigint), CPU/memory metrics

## Installation

To install all dependencies:

```bash
npm install
```

This will install:
- chalk@5.3.0

## System Requirements

- Node.js v22.0.0 or higher
- npm (included with Node.js)
- Operating System: Linux, macOS, or Windows

## Why These Specific Versions?

- **chalk@5.3.0**: Latest stable version with ESM support
- **Node.js v22+**: Required for full ES module support and latest performance APIs
