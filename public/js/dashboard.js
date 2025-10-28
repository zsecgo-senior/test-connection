let latencyChart
let throughputChart

function updateProtocolCard(protocol, data) {
	try {
		const container = document.getElementById(
			`${protocol.toLowerCase()}-metrics`
		)
		if (!container) {
			console.error(
				`Element with id "${protocol.toLowerCase()}-metrics" not found`
			)
			return
		}
		// Convert string values to numbers
		const avgLatency = parseFloat(data.avgLatency)
		const throughput = parseFloat(data.throughput)
		const packetLoss = parseFloat(data.packetLoss)

		container.innerHTML = `
        <div class="mb-3">
            <small class="text-muted">Average Latency</small>
            <div class="metric-value">${avgLatency.toFixed(2)} ms</div>
        </div>
        <div class="mb-3">
            <small class="text-muted">Throughput</small>
            <div class="metric-value">${throughput.toFixed(2)} Mbps</div>
        </div>
        <div class="mb-3">
            <small class="text-muted">Packet Loss</small>
            <div class="metric-value">${packetLoss.toFixed(2)}%</div>
        </div>
    `
	} catch (error) {
		console.error(`Error updating ${protocol} card:`, error)
	}
}

function updateComparisonTable(tcpData, udpData, quicData) {
	const metrics = [
		{ name: 'Average Latency', key: 'avgLatency', unit: 'ms' },
		{ name: 'Min Latency', key: 'minLatency', unit: 'ms' },
		{ name: 'Max Latency', key: 'maxLatency', unit: 'ms' },
		{ name: 'Jitter', key: 'jitter', unit: 'ms' },
		{ name: 'Throughput', key: 'throughput', unit: 'Mbps' },
		{ name: 'Packet Loss', key: 'packetLoss', unit: '%' },
		{ name: 'Packets Sent', key: 'packetsSent', unit: '' },
		{ name: 'Packets Received', key: 'packetsReceived', unit: '' },
	]

	const tbody = document.getElementById('comparison-body')
	tbody.innerHTML = metrics
		.map(metric => {
			// Convert string values to numbers for each protocol
			const tcpValue = parseFloat(tcpData[metric.key])
			const udpValue = parseFloat(udpData[metric.key])
			const quicValue = parseFloat(quicData[metric.key])

			return `
                <tr>
                    <td>${metric.name}</td>
                    <td>${tcpValue.toFixed(2)}</td>
                    <td>${udpValue.toFixed(2)}</td>
                    <td>${quicValue.toFixed(2)}</td>
                    <td>${metric.unit}</td>
                </tr>
            `
		})
		.join('')
}

function updateCharts(tcpData, udpData, quicData) {
	// Convert string values to numbers for each protocol
	const tcp = {
		avgLatency: parseFloat(tcpData.avgLatency),
		minLatency: parseFloat(tcpData.minLatency),
		maxLatency: parseFloat(tcpData.maxLatency),
		throughput: parseFloat(tcpData.throughput),
	}
	const udp = {
		avgLatency: parseFloat(udpData.avgLatency),
		minLatency: parseFloat(udpData.minLatency),
		maxLatency: parseFloat(udpData.maxLatency),
		throughput: parseFloat(udpData.throughput),
	}
	const quic = {
		avgLatency: parseFloat(quicData.avgLatency),
		minLatency: parseFloat(quicData.minLatency),
		maxLatency: parseFloat(quicData.maxLatency),
		throughput: parseFloat(quicData.throughput),
	}

	// Update Latency Chart
	if (latencyChart) {
		latencyChart.destroy()
	}
	const latencyCtx = document.getElementById('latencyChart').getContext('2d')
	latencyChart = new Chart(latencyCtx, {
		type: 'bar',
		data: {
			labels: ['Average', 'Minimum', 'Maximum'],
			datasets: [
				{
					label: 'TCP',
					data: [tcp.avgLatency, tcp.minLatency, tcp.maxLatency],
					backgroundColor: 'rgba(13, 110, 253, 0.5)',
					borderColor: 'rgb(13, 110, 253)',
					borderWidth: 1,
				},
				{
					label: 'UDP',
					data: [udp.avgLatency, udp.minLatency, udp.maxLatency],
					backgroundColor: 'rgba(25, 135, 84, 0.5)',
					borderColor: 'rgb(25, 135, 84)',
					borderWidth: 1,
				},
				{
					label: 'QUIC',
					data: [quic.avgLatency, quic.minLatency, quic.maxLatency],
					backgroundColor: 'rgba(13, 202, 240, 0.5)',
					borderColor: 'rgb(13, 202, 240)',
					borderWidth: 1,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'Latency Comparison (ms)',
				},
			},
		},
	})

	// Update Throughput Chart
	if (throughputChart) {
		throughputChart.destroy()
	}
	const throughputCtx = document
		.getElementById('throughputChart')
		.getContext('2d')
	throughputChart = new Chart(throughputCtx, {
		type: 'bar',
		data: {
			labels: ['Throughput'],
			datasets: [
				{
					label: 'TCP',
					data: [tcp.throughput],
					backgroundColor: 'rgba(13, 110, 253, 0.5)',
					borderColor: 'rgb(13, 110, 253)',
					borderWidth: 1,
				},
				{
					label: 'UDP',
					data: [udp.throughput],
					backgroundColor: 'rgba(25, 135, 84, 0.5)',
					borderColor: 'rgb(25, 135, 84)',
					borderWidth: 1,
				},
				{
					label: 'QUIC',
					data: [quic.throughput],
					backgroundColor: 'rgba(13, 202, 240, 0.5)',
					borderColor: 'rgb(13, 202, 240)',
					borderWidth: 1,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: 'Throughput Comparison (Mbps)',
				},
			},
		},
	})
}

// WebSocket ulanishini boshqarish
function connectWebSocket() {
	const ws = new WebSocket('ws://localhost:3003')

	ws.onmessage = event => {
		console.log('Data received:', event.data)
		try {
			const data = JSON.parse(event.data)
			// status messages
			if (data.status) {
				const statusEl = document.getElementById('run-status')
				const btn = document.getElementById('relaunch-btn')
				if (data.status === 'running') {
					if (statusEl) statusEl.textContent = 'running'
					if (btn) btn.disabled = true
				} else if (data.status === 'completed') {
					if (statusEl) statusEl.textContent = 'completed'
					if (btn) btn.disabled = false
					// results may be included
					if (data.results) {
						updateProtocolCard('TCP', data.results.tcp)
						updateProtocolCard('UDP', data.results.udp)
						updateProtocolCard('QUIC', data.results.quic)
						updateComparisonTable(
							data.results.tcp,
							data.results.udp,
							data.results.quic
						)
						updateCharts(data.results.tcp, data.results.udp, data.results.quic)
					}
				} else if (data.status === 'error') {
					if (statusEl) statusEl.textContent = 'error'
					if (btn) btn.disabled = false
					console.error('Server reported error:', data.error)
				}
			}
			// direct results payload
			if (data.tcp && data.udp && data.quic) {
				const statusEl = document.getElementById('run-status')
				const btn = document.getElementById('relaunch-btn')
				if (statusEl) statusEl.textContent = 'completed'
				if (btn) btn.disabled = false
				updateProtocolCard('TCP', data.tcp)
				updateProtocolCard('UDP', data.udp)
				updateProtocolCard('QUIC', data.quic)
				updateComparisonTable(data.tcp, data.udp, data.quic)
				updateCharts(data.tcp, data.udp, data.quic)
			}
		} catch (error) {
			console.error('Error processing received data:', error)
		}
	}

	ws.onerror = error => {
		console.error('WebSocket error:', error)
	}

	ws.onopen = () => {
		console.log('WebSocket connected')
	}

	ws.onclose = () => {
		console.log('WebSocket disconnected')
		// Try to reconnect after 3 seconds and update global ws
		setTimeout(() => {
			ws = connectWebSocket()
		}, 3000)
	}

	return ws
}

// Start WebSocket connection
let ws = connectWebSocket()

// Wire relaunch button
const relaunchBtn = document.getElementById('relaunch-btn')
const runStatus = document.getElementById('run-status')
if (relaunchBtn) {
	relaunchBtn.addEventListener('click', () => {
		try {
			relaunchBtn.disabled = true
			if (runStatus) runStatus.textContent = 'starting'
			if (ws && ws.readyState === 1) {
				ws.send(JSON.stringify({ action: 'relaunch' }))
			} else {
				// try to reconnect immediately
				ws = connectWebSocket()
				setTimeout(() => {
					if (ws && ws.readyState === 1)
						ws.send(JSON.stringify({ action: 'relaunch' }))
				}, 500)
			}
		} catch (err) {
			console.error('Failed to send relaunch request:', err)
			relaunchBtn.disabled = false
			if (runStatus) runStatus.textContent = 'error'
		}
	})
}
