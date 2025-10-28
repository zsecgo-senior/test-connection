import { Logger } from './utils/logger.js'
import { TCPServer } from './server/tcp-server.js'
import { UDPServer } from './server/udp-server.js'
import { QUICServer } from './server/quic-server.js'
import { TCPClient } from './client/tcp-client.js'
import { UDPClient } from './client/udp-client.js'
import { QUICClient } from './client/quic-client.js'
import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// runtime state
let isRunning = false
let lastResults = null

// Global WebSocket connection handler: reply with last results and listen for relaunch requests
wss.on('connection', ws => {
	console.log('New WebSocket client connected')
	// send last results if available
	if (lastResults && ws.readyState === 1) {
		ws.send(JSON.stringify(lastResults))
		console.log('Sent cached results to new client')
	}

	ws.on('message', async message => {
		try {
			const msg = JSON.parse(message.toString())
			if (msg && msg.action === 'relaunch') {
				console.log(
					`Received relaunch request from client for protocol: ${
						msg.protocol || 'all'
					}`
				)
				if (isRunning) {
					// inform client that a run is already in progress
					if (ws.readyState === 1)
						ws.send(JSON.stringify({ status: 'running' }))
					return
				}
				// start tests in background (don't await here to keep WS responsive)
				runTests(msg.protocol).catch(err => {
					console.error('Relaunch failed:', err)
				})
			}
		} catch (err) {
			console.error('Error parsing WS message:', err)
		}
	})
})

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')))

const args = process.argv.slice(2)
const getArgValue = (flag, defaultValue) => {
	const index = args.indexOf(flag)
	if (index !== -1 && args[index + 1]) {
		const val = Number(args[index + 1])
		return isNaN(val) ? defaultValue : val
	}
	return defaultValue
}

const NUM_PACKETS = getArgValue('--packets', 100)
const PACKET_SIZE = getArgValue('--size', 512)
const WARMUP_DELAY = getArgValue('--delay', 500)

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function broadcastResults(results) {
	console.log(
		'Broadcasting results to clients. Connected clients:',
		wss.clients.size
	)
	console.log('Results data:', JSON.stringify(results, null, 2))
	wss.clients.forEach(client => {
		if (client.readyState === 1) {
			// WebSocket.OPEN
			client.send(JSON.stringify(results))
			console.log('Results sent to client')
		}
	})
}

function printResults(protocol, results) {
	Logger.subheader(`${protocol} Performance Results`)
	Logger.metric('Average Latency', results.avgLatency, 'ms')
	Logger.metric('Min Latency', results.minLatency, 'ms')
	Logger.metric('Max Latency', results.maxLatency, 'ms')
	Logger.metric('Jitter', results.jitter, 'ms')
	Logger.metric('Throughput', results.throughput, 'Mbps')
	Logger.metric('Packet Loss', results.packetLoss, '%')
	Logger.metric('Out of Order Packets', results.outOfOrder)
	Logger.metric('Packets Sent', results.packetsSent)
	Logger.metric('Packets Received', results.packetsReceived)
	Logger.metric('Bytes Sent', results.bytesSent, 'bytes')
	Logger.metric('Bytes Received', results.bytesReceived, 'bytes')
	Logger.metric('Test Duration', results.duration, 'ms')
	Logger.metric('CPU Usage', results.cpuUsage, 'ms')
	Logger.metric('Memory Usage', results.memUsage, 'MB')
	Logger.separator()
	return results
}

function printComparison(tcpResults, udpResults, quicResults) {
	Logger.header('Performance Comparison Summary')

	Logger.table(
		['Metric', 'TCP', 'UDP', 'QUIC', 'Unit'],
		[
			[
				'Avg Latency',
				tcpResults.avgLatency,
				udpResults.avgLatency,
				quicResults.avgLatency,
				'ms',
			],
			[
				'Throughput',
				tcpResults.throughput,
				udpResults.throughput,
				quicResults.throughput,
				'Mbps',
			],
			[
				'Jitter',
				tcpResults.jitter,
				udpResults.jitter,
				quicResults.jitter,
				'ms',
			],
			[
				'Packet Loss',
				tcpResults.packetLoss,
				udpResults.packetLoss,
				quicResults.packetLoss,
				'%',
			],
			[
				'Out of Order',
				tcpResults.outOfOrder,
				udpResults.outOfOrder,
				quicResults.outOfOrder,
				'pkts',
			],
			[
				'CPU Usage',
				tcpResults.cpuUsage,
				udpResults.cpuUsage,
				quicResults.cpuUsage,
				'ms',
			],
			[
				'Memory Usage',
				tcpResults.memUsage,
				udpResults.memUsage,
				quicResults.memUsage,
				'MB',
			],
		]
	)
}

async function runTests(protocol = null) {
	if (isRunning) {
		Logger.info('A test run is already in progress. Skipping new run request.')
		return
	}

	isRunning = true
	const runningProtocol = protocol || 'all'

	try {
		let tcpResults, udpResults, quicResults
		let tcpProcessedResults, udpProcessedResults, quicProcessedResults
		let tcpServer, udpServer, quicServer

		Logger.header('Protocol Performance Testing Suite')
		Logger.info(`Node.js version: ${process.versions.node}`)
		Logger.info(
			`Test configuration: ${NUM_PACKETS} packets of ${PACKET_SIZE} bytes each`
		)
		Logger.separator()

		// notify connected clients that tests are starting
		wss.clients.forEach(c => {
			if (c.readyState === 1) c.send(JSON.stringify({ status: 'running' }))
		})

		// Start only the requested protocol server or all servers
		if (!protocol || protocol === 'tcp') {
			tcpServer = new TCPServer(3004)
			Logger.info('Starting TCP server...')
			await tcpServer.start()
		}
		if (!protocol || protocol === 'udp') {
			udpServer = new UDPServer(3005)
			Logger.info('Starting UDP server...')
			await udpServer.start()
		}
		if (!protocol || protocol === 'quic') {
			quicServer = new QUICServer(3006)
			Logger.info('Starting QUIC server...')
			await quicServer.start()
		}
		Logger.separator()

		await sleep(WARMUP_DELAY)

		// Run TCP test if requested
		if (!protocol || protocol === 'tcp') {
			Logger.header('Running TCP Performance Test')
			const tcpClient = new TCPClient('localhost', 3004)
			tcpResults = await tcpClient.runTest(NUM_PACKETS, PACKET_SIZE)
			tcpProcessedResults = printResults('TCP', tcpResults)
		}

		await sleep(WARMUP_DELAY)

		// Run UDP test if requested
		if (!protocol || protocol === 'udp') {
			Logger.header('Running UDP Performance Test')
			const udpClient = new UDPClient('localhost', 3005)
			udpResults = await udpClient.runTest(NUM_PACKETS, PACKET_SIZE)
			udpProcessedResults = printResults('UDP', udpResults)
		}

		await sleep(WARMUP_DELAY)

		// Run QUIC test if requested
		if (!protocol || protocol === 'quic') {
			Logger.header('Running QUIC Performance Test')
			const quicClient = new QUICClient('localhost', 3006)
			quicResults = await quicClient.runTest(NUM_PACKETS, PACKET_SIZE)
			quicProcessedResults = printResults('QUIC', quicResults)
		}

		// If all protocols were tested, show comparison
		if (!protocol) {
			printComparison(
				tcpProcessedResults,
				udpProcessedResults,
				quicProcessedResults
			)
		}

		// Store and broadcast results
		const testResults = {
			tcp:
				protocol === 'tcp' || !protocol
					? tcpProcessedResults
					: lastResults?.tcp,
			udp:
				protocol === 'udp' || !protocol
					? udpProcessedResults
					: lastResults?.udp,
			quic:
				protocol === 'quic' || !protocol
					? quicProcessedResults
					: lastResults?.quic,
		}

		// Broadcast results to current WebSocket clients
		broadcastResults(testResults)

		// Stop servers
		Logger.info('Stopping protocol servers...')
		if (tcpServer) await tcpServer.stop()
		if (udpServer) await udpServer.stop()
		if (quicServer) await quicServer.stop()

		// Cache last results
		if (!protocol) {
			lastResults = testResults
		} else {
			lastResults = {
				...lastResults,
				[protocol]: testResults[protocol],
			}
		}

		// notify clients that tests completed and include results
		wss.clients.forEach(c => {
			if (c.readyState === 1)
				c.send(JSON.stringify({ status: 'completed', results: testResults }))
		})
	} catch (err) {
		Logger.error(`Test run failed: ${err.message}`)
		// notify clients about error
		wss.clients.forEach(c => {
			if (c.readyState === 1)
				c.send(JSON.stringify({ status: 'error', error: err.message }))
		})
		throw err
	} finally {
		isRunning = false
	}
}

// Start the HTTP server (allow overriding via PORT env var)
const PORT = Number(process.env.PORT) || 3003
server.listen(PORT, () => {
	console.log(`Web interface running at http://localhost:${PORT}`)
	console.log('Starting performance tests...')
	runTests().catch(err => {
		Logger.error(`Fatal error: ${err.message}`)
		process.exit(1)
	})
})
