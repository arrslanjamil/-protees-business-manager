import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Copy, Link, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/context/ToastContext'
import type { Database } from '@/lib/database.types'

type ZKTecoDevice = Database['public']['Tables']['zkteco_devices']['Row'] & {
  device_name?: string
  is_online?: boolean
  device_id?: string
  last_sync?: string
}

const ADMS_CONFIG = {
  domain: 'yswxoikimguvcssgdurr.supabase.co',
  port: 443,
  protocol: 'HTTPS',
  baseUrl: 'https://yswxoikimguvcssgdurr.supabase.co',
  attendanceEndpoint: '/functions/v1/zkteco-attendance',
  statusEndpoint: '/functions/v1/zkteco-device-status',
}

export function DeviceIntegrationPage() {
  const [devices, setDevices] = useState<ZKTecoDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [showMapping, setShowMapping] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadDevices()
    const interval = setInterval(loadDevices, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  async function loadDevices() {
    try {
      const { data, error } = await supabase
        .from('zkteco_devices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
    } catch (err: any) {
      console.error('Failed to load devices:', err)
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    showToast('success', `Copied ${label}!`)
    setTimeout(() => setCopied(null), 2000)
  }

  const fullAttendanceUrl = `${ADMS_CONFIG.baseUrl}${ADMS_CONFIG.attendanceEndpoint}`
  const fullStatusUrl = `${ADMS_CONFIG.baseUrl}${ADMS_CONFIG.statusEndpoint}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">ZKTeco Device Integration</h1>
        <p className="mt-1 text-sm text-slate-400">Configure and monitor ZKTeco SenseFace attendance devices</p>
      </div>

      {/* Configuration Card */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">ADMS Configuration</h2>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs font-medium text-neon-cyan hover:text-neon-cyan/80"
          >
            {showConfig ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {showConfig && (
          <div className="space-y-4">
            {/* Attendance Endpoint */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Attendance Endpoint URL</p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 p-3">
                <code className="flex-1 text-sm text-slate-300">{fullAttendanceUrl}</code>
                <button
                  onClick={() => copyToClipboard(fullAttendanceUrl, 'Attendance URL')}
                  className="p-1.5 hover:bg-slate-800 rounded"
                >
                  {copied === 'Attendance URL' ? (
                    <CheckCircle2 size={16} className="text-neon-green" />
                  ) : (
                    <Copy size={16} className="text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Status Endpoint */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Device Status Endpoint URL</p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 p-3">
                <code className="flex-1 text-sm text-slate-300">{fullStatusUrl}</code>
                <button
                  onClick={() => copyToClipboard(fullStatusUrl, 'Status URL')}
                  className="p-1.5 hover:bg-slate-800 rounded"
                >
                  {copied === 'Status URL' ? (
                    <CheckCircle2 size={16} className="text-neon-green" />
                  ) : (
                    <Copy size={16} className="text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Configuration Details */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-900 p-4">
              <div>
                <p className="text-xs text-slate-400">Domain</p>
                <p className="font-mono text-sm font-medium text-white">{ADMS_CONFIG.domain}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Port</p>
                <p className="font-mono text-sm font-medium text-white">{ADMS_CONFIG.port}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Protocol</p>
                <p className="font-mono text-sm font-medium text-white">{ADMS_CONFIG.protocol}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Attendance Path</p>
                <p className="font-mono text-sm font-medium text-white">{ADMS_CONFIG.attendanceEndpoint}</p>
              </div>
            </div>

            <div className="rounded-lg border border-neon-blue/30 bg-neon-blue/5 p-4">
              <div className="flex gap-3">
                <AlertCircle size={20} className="shrink-0 text-neon-blue" />
                <div className="text-sm text-slate-300">
                  <p className="font-medium text-white mb-1">Setup Instructions for ZKTeco Device:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Go to Device Settings → Cloud Server</li>
                    <li>Server Type: HTTPS</li>
                    <li>Server Address: {ADMS_CONFIG.domain}</li>
                    <li>Port: {ADMS_CONFIG.port}</li>
                    <li>Attendance URL: {ADMS_CONFIG.attendanceEndpoint}</li>
                    <li>Device Status URL: {ADMS_CONFIG.statusEndpoint}</li>
                    <li>Enable "Push Attendance" and "Device Status"</li>
                    <li>Sync Interval: Every 5 minutes</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connected Devices */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Connected Devices</h2>
          <button
            onClick={() => setShowMapping(true)}
            className="btn-secondary text-xs"
          >
            <Link size={14} /> Map Users
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading devices...</p>
        ) : devices.length === 0 ? (
          <p className="text-sm text-slate-400">No devices configured yet. Configure your ZKTeco device using the settings above.</p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="rounded-lg border border-slate-700 p-4 hover:border-slate-600">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="font-medium text-white">{device.device_name}</h3>
                      <Badge color={device.is_online ? 'green' : 'red'}>
                        {device.is_online ? (
                          <>
                            <Wifi size={12} /> Online
                          </>
                        ) : (
                          <>
                            <WifiOff size={12} /> Offline
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">Device ID: {device.device_id}</p>
                    {device.ip_address && (
                      <p className="text-xs text-slate-400">IP: {device.ip_address}</p>
                    )}
                    {device.last_sync && (
                      <p className="mt-2 text-xs text-slate-500">
                        Last Sync: {new Date(device.last_sync).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {device.is_online ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-green/10">
                        <Wifi size={20} className="text-neon-green" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                        <WifiOff size={20} className="text-red-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Mapping Modal */}
      {showMapping && (
        <UserMappingModal
          open={showMapping}
          onClose={() => setShowMapping(false)}
        />
      )}
    </div>
  )
}

function UserMappingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mappings, setMappings] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [zkteco_user_id, setZktecoUserId] = useState('')
  const [employee_id, setEmployeeId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const employeesRes = await supabase.from('app_users').select('id, name')
      if (employeesRes.data) setEmployees(employeesRes.data)
      setMappings([])
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  async function handleSaveMapping() {
    if (!zkteco_user_id || !employee_id) {
      showToast('error', 'Please fill all fields')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('zkteco_user_mapping' as any)
        .upsert({
          zkteco_user_id,
          employee_id: Number(employee_id),
        })

      if (error) throw error
      showToast('success', 'Mapping saved!')
      setZktecoUserId('')
      setEmployeeId('')
      loadData()
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Map ZKTeco Users to Employees">
      <div className="space-y-4">
        <div>
          <label className="label-field">ZKTeco User ID</label>
          <input
            type="text"
            className="input-field"
            value={zkteco_user_id}
            onChange={(e) => setZktecoUserId(e.target.value)}
            placeholder="e.g., 1, 2, 3..."
          />
          <p className="mt-1 text-xs text-slate-500">Found on device enrollment screen</p>
        </div>

        <div>
          <label className="label-field">Employee</label>
          <select
            className="input-field"
            value={employee_id}
            onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select employee...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {mappings.length > 0 && (
          <div className="rounded-lg bg-slate-900 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-400">Existing Mappings</p>
            <div className="space-y-1">
              {mappings.map((m) => (
                <div key={m.id} className="text-xs text-slate-300">
                  ZKTeco User {m.zkteco_user_id} → Employee {m.employee_id}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={handleSaveMapping} disabled={saving}>
            {saving ? 'Saving...' : 'Save Mapping'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
