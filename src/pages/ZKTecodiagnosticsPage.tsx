import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import type { Database } from '@/lib/database.types'

type ZKTecoDevice = Database['public']['Tables']['zkteco_devices']['Row'] & {
  device_name?: string
  is_online?: boolean
  device_id?: string
  last_sync?: string
}
type SyncLog = any

const ADMS_CONFIG = {
  attendanceUrl: 'https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-attendance',
  statusUrl: 'https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-device-status',
  domain: 'yswxoikimguvcssgdurr.supabase.co',
  port: 443,
  protocol: 'HTTPS',
}

export function ZKTecodiagnosticsPage() {
  const [devices, setDevices] = useState<ZKTecoDevice[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking')
  const [endpointTests, setEndpointTests] = useState<{ attendance: boolean | null; status: boolean | null }>({ attendance: null, status: null })
  const [refreshing, setRefreshing] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [testPayload, setTestPayload] = useState<string>('{"device_id": "zkteco-001", "device_name": "SenseFace Test"}')
  const [testResult, setTestResult] = useState<any>(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadData()
    testConnectivity()
    const interval = setInterval(() => loadData(), 5000) // Auto-refresh every 5s
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const devicesRes = await supabase.from('zkteco_devices').select('*').order('updated_at', { ascending: false })

      if (devicesRes.data) setDevices(devicesRes.data)
      setSyncLogs([])
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  async function testConnectivity() {
    try {
      const [attendanceTest, statusTest] = await Promise.all([
        testEndpoint(ADMS_CONFIG.attendanceUrl, 'attendance'),
        testEndpoint(ADMS_CONFIG.statusUrl, 'status'),
      ])

      setEndpointTests({
        attendance: attendanceTest,
        status: statusTest,
      })

      setConnectionStatus(attendanceTest && statusTest ? 'connected' : 'failed')
    } catch (err) {
      setConnectionStatus('failed')
    }
  }

  async function testEndpoint(url: string, type: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' },
      })
      return response.ok || response.status === 200
    } catch (err) {
      console.error(`${type} endpoint test failed:`, err)
      return false
    }
  }

  async function handleTestAttendanceEndpoint() {
    try {
      const payload = JSON.parse(testPayload)
      const response = await fetch(ADMS_CONFIG.attendanceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '1',
          device_id: payload.device_id || 'test-device',
          timestamp: new Date().toISOString(),
          check_in: '09:00:00',
          ...payload,
        }),
      })

      const result = await response.json()
      setTestResult({ endpoint: 'attendance', status: response.status, data: result })
      showToast(response.ok ? 'success' : 'error', `Test sent: ${response.status}`)
    } catch (err: any) {
      showToast('error', `Test failed: ${err.message}`)
      setTestResult({ endpoint: 'attendance', error: err.message })
    }
  }

  async function handleTestStatusEndpoint() {
    try {
      const response = await fetch(ADMS_CONFIG.statusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'senseface-test-001',
          device_name: 'SenseFace Test Device',
          is_online: true,
          timestamp: new Date().toISOString(),
        }),
      })

      const result = await response.json()
      setTestResult({ endpoint: 'status', status: response.status, data: result })
      showToast(response.ok ? 'success' : 'error', `Test sent: ${response.status}`)
    } catch (err: any) {
      showToast('error', `Test failed: ${err.message}`)
      setTestResult({ endpoint: 'status', error: err.message })
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    await testConnectivity()
    setRefreshing(false)
    showToast('success', 'Diagnostics refreshed!')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">ZKTeco Device Diagnostics</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor device connectivity and endpoint status</p>
      </div>

      {/* Connection Status Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Connection Status</h2>
          <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 hover:bg-slate-800 rounded">
            <RefreshCw size={16} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Overall Status */}
          <div className="rounded-lg bg-slate-900 p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Overall Status</p>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <>
                  <CheckCircle2 size={20} className="text-neon-green" />
                  <span className="font-medium text-neon-green">Connected</span>
                </>
              ) : connectionStatus === 'checking' ? (
                <>
                  <Clock size={20} className="text-neon-yellow animate-spin" />
                  <span className="font-medium text-neon-yellow">Checking...</span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} className="text-red-400" />
                  <span className="font-medium text-red-400">Failed</span>
                </>
              )}
            </div>
          </div>

          {/* Attendance Endpoint */}
          <div className="rounded-lg bg-slate-900 p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Attendance Endpoint</p>
            <div className="flex items-center gap-2">
              {endpointTests.attendance === true ? (
                <>
                  <CheckCircle2 size={20} className="text-neon-green" />
                  <span className="font-medium text-neon-green">Ready</span>
                </>
              ) : endpointTests.attendance === null ? (
                <>
                  <Clock size={20} className="text-slate-400 animate-spin" />
                  <span className="text-slate-400">Testing...</span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} className="text-red-400" />
                  <span className="font-medium text-red-400">Failed</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-mono break-all">{ADMS_CONFIG.attendanceUrl}</p>
          </div>

          {/* Status Endpoint */}
          <div className="rounded-lg bg-slate-900 p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Device Status Endpoint</p>
            <div className="flex items-center gap-2">
              {endpointTests.status === true ? (
                <>
                  <CheckCircle2 size={20} className="text-neon-green" />
                  <span className="font-medium text-neon-green">Ready</span>
                </>
              ) : endpointTests.status === null ? (
                <>
                  <Clock size={20} className="text-slate-400 animate-spin" />
                  <span className="text-slate-400">Testing...</span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} className="text-red-400" />
                  <span className="font-medium text-red-400">Failed</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-mono break-all">{ADMS_CONFIG.statusUrl}</p>
          </div>
        </div>
      </div>

      {/* Device Configuration */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Exact Configuration for ZKTeco Device</h2>
        <div className="grid grid-cols-2 gap-4 bg-slate-900 p-4 rounded-lg">
          <div>
            <p className="text-xs text-slate-400 mb-1">Server Address</p>
            <code className="text-sm font-mono text-slate-200">{ADMS_CONFIG.domain}</code>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Port</p>
            <code className="text-sm font-mono text-slate-200">{ADMS_CONFIG.port}</code>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Protocol</p>
            <code className="text-sm font-mono text-slate-200">{ADMS_CONFIG.protocol}</code>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Attendance Path</p>
            <code className="text-sm font-mono text-slate-200">/functions/v1/zkteco-attendance</code>
          </div>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Connected Devices</h2>
        {devices.length === 0 ? (
          <div className="rounded-lg bg-slate-900 p-6 text-center border border-dashed border-slate-600">
            <WifiOff size={32} className="mx-auto text-slate-500 mb-2" />
            <p className="text-slate-400">No devices connected yet</p>
            <p className="text-xs text-slate-500 mt-1">Device will appear here once it sends data to the server</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="rounded-lg border border-slate-700 p-4 hover:bg-slate-900/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-white">{device.device_name}</h3>
                      <Badge color={device.is_online ? 'green' : 'red'}>
                        {device.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {device.is_online ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-slate-400">
                      <p>Device ID: <code className="text-slate-300">{device.device_id}</code></p>
                      {device.ip_address && <p>IP Address: <code className="text-slate-300">{device.ip_address}</code></p>}
                      {device.last_sync && (
                        <p>Last Sync: <code className="text-slate-300">{new Date(device.last_sync).toLocaleString()}</code></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Endpoints */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Test Endpoints</h2>
        <div className="space-y-4">
          <div>
            <label className="label-field mb-2">Test Payload (JSON)</label>
            <textarea
              className="input-field font-mono text-xs"
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleTestAttendanceEndpoint}
              className="btn-primary"
            >
              Test Attendance Endpoint
            </button>
            <button
              onClick={handleTestStatusEndpoint}
              className="btn-primary"
            >
              Test Status Endpoint
            </button>
          </div>

          {testResult && (
            <div className="rounded-lg bg-slate-900 p-4 border border-slate-700">
              <p className="text-xs font-semibold text-slate-400 mb-2">Test Result</p>
              <pre className="text-xs text-slate-300 overflow-auto max-h-48">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Sync Logs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Sync Activity</h2>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs font-medium text-neon-cyan hover:text-neon-cyan/80"
          >
            {showLogs ? 'Hide' : 'Show'} Logs
          </button>
        </div>

        <div className="text-xs text-slate-400 mb-3">
          Total Sync Events: <span className="text-white font-medium">{syncLogs.length}</span>
        </div>

        {showLogs && (
          <div className="max-h-96 overflow-auto">
            <div className="space-y-2">
              {syncLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No sync logs yet</p>
              ) : (
                syncLogs.map((log) => (
                  <div key={log.id} className="rounded bg-slate-900 p-3 border border-slate-700 text-xs">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-slate-300">
                          <span className="font-medium">{log.action.toUpperCase()}</span>
                          {' • Device: '}
                          <code className="text-slate-400">{log.device_id}</code>
                          {' • Employee: '}
                          <code className="text-slate-400">{log.employee_id}</code>
                        </p>
                      </div>
                      <Badge color={log.status === 'success' ? 'green' : 'red'}>
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    {log.error_message && (
                      <p className="text-red-400 mt-1">{log.error_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Troubleshooting Guide */}
      <div className="card border-l-4 border-l-neon-yellow bg-slate-900/50">
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-neon-yellow" />
          Troubleshooting Checklist
        </h2>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="text-neon-cyan">✓</span>
            Device WiFi is connected and stable
          </li>
          <li className="flex gap-2">
            <span className="text-neon-cyan">✓</span>
            Device can reach: <code className="text-slate-400">{ADMS_CONFIG.domain}</code>
          </li>
          <li className="flex gap-2">
            <span className="text-neon-cyan">✓</span>
            Port 443 (HTTPS) is open on device network
          </li>
          <li className="flex gap-2">
            <span className="text-neon-cyan">✓</span>
            Cloud Server settings use exact paths (check for spaces!)
          </li>
          <li className="flex gap-2">
            <span className="text-neon-cyan">✓</span>
            Employees are enrolled on device with User IDs
          </li>
          <li className="flex gap-2">
            <span className="text-neon-cyan">✓</span>
            User mappings created in "Map Users" modal
          </li>
          <li className="flex gap-2">
            <span className="text-neon-cyan">✓</span>
            Device time/date/timezone are correct
          </li>
        </ul>
      </div>
    </div>
  )
}
