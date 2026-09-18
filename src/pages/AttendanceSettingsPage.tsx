import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Server, Trash2 } from 'lucide-react'
import { useAttendance } from '@/context/AttendanceContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { formatDate, todayISO } from '@/lib/utils'

export function AttendanceSettingsPage() {
  const { attendanceSettings, zktecoDevices, governmentHolidays, updateAttendanceSettings, addZktecoDevice, updateZktecoDevice, deleteZktecoDevice, addGovernmentHoliday, deleteGovernmentHoliday } =
    useAttendance()
  const { showToast } = useToast()

  // --- Working hours settings ---------------------------------------------
  const [standardHours, setStandardHours] = useState('8')
  const [breakMinutes, setBreakMinutes] = useState('60')
  const [startTime, setStartTime] = useState('09:00')
  const [graceMinutes, setGraceMinutes] = useState('15')
  const [latePenalty, setLatePenalty] = useState('0')
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (!attendanceSettings) return
    setStandardHours(String(attendanceSettings.standard_working_hours))
    setBreakMinutes(String(attendanceSettings.break_minutes))
    setStartTime(attendanceSettings.standard_start_time.slice(0, 5))
    setGraceMinutes(String(attendanceSettings.late_grace_minutes))
    setLatePenalty(String(attendanceSettings.late_penalty_per_instance))
  }, [attendanceSettings])

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      await updateAttendanceSettings({
        standardWorkingHours: Number(standardHours) || 8,
        breakMinutes: Number(breakMinutes) || 0,
        standardStartTime: startTime,
        lateGraceMinutes: Number(graceMinutes) || 0,
        latePenaltyPerInstance: Number(latePenalty) || 0,
      })
      showToast('success', 'Attendance settings saved.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  // --- ZKTeco device ---------------------------------------------------------
  const [deviceModalOpen, setDeviceModalOpen] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [deviceIp, setDeviceIp] = useState('')
  const [devicePort, setDevicePort] = useState('4370')
  const [savingDevice, setSavingDevice] = useState(false)

  function openDeviceModal() {
    setDeviceName('K40')
    setDeviceIp('')
    setDevicePort('4370')
    setDeviceModalOpen(true)
  }

  async function handleSaveDevice() {
    if (!deviceName.trim() || !deviceIp.trim()) {
      showToast('error', 'Enter a name and IP address.')
      return
    }
    setSavingDevice(true)
    try {
      await addZktecoDevice({ name: deviceName.trim(), ipAddress: deviceIp.trim(), port: Number(devicePort) || 4370 })
      showToast('success', 'Device saved.')
      setDeviceModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save device.')
    } finally {
      setSavingDevice(false)
    }
  }

  async function handleDeleteDevice(id: number) {
    if (!confirm('Remove this device configuration?')) return
    await deleteZktecoDevice(id)
  }

  // --- Government Holidays ----------------------------------------------------
  const [holidayModalOpen, setHolidayModalOpen] = useState(false)
  const [holidayDate, setHolidayDate] = useState(todayISO())
  const [holidayName, setHolidayName] = useState('')
  const [savingHoliday, setSavingHoliday] = useState(false)

  function openHolidayModal() {
    setHolidayDate(todayISO())
    setHolidayName('')
    setHolidayModalOpen(true)
  }

  async function handleSaveHoliday() {
    if (!holidayName.trim()) {
      showToast('error', 'Enter a holiday name.')
      return
    }
    setSavingHoliday(true)
    try {
      await addGovernmentHoliday({ date: holidayDate, name: holidayName.trim() })
      showToast('success', 'Holiday added.')
      setHolidayModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add holiday.')
    } finally {
      setSavingHoliday(false)
    }
  }

  async function handleDeleteHoliday(id: number) {
    if (!confirm('Remove this holiday?')) return
    await deleteGovernmentHoliday(id)
  }

  return (
    <div className="space-y-6">
      <Link to="/attendance" className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white">
        <ArrowLeft size={14} /> Back to Attendance
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-white">Attendance Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Working hours rules, ZKTeco device configuration, and government holidays.</p>
      </div>

      <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-4">
        <p className="text-sm font-semibold text-neon-amber">This app cannot connect to the K40 directly</p>
        <p className="mt-1 text-xs text-slate-300">
          Protees Business Manager runs in the cloud (Vercel) — it has no network path to a device on your office LAN. The IP address
          below is read by the separate <code className="rounded bg-white/10 px-1 py-0.5">zkteco-bridge</code> script (in the project
          repo), which you run on a PC physically on the same office network as the K40. That script talks to the machine and pushes
          attendance here. See <code className="rounded bg-white/10 px-1 py-0.5">zkteco-bridge/README.md</code> for setup.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Working Hours Rules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="label-field">Standard Working Hours</label>
            <input type="number" className="input-field" value={standardHours} onChange={(e) => setStandardHours(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Break (minutes)</label>
            <input type="number" className="input-field" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Standard Start Time</label>
            <input type="time" className="input-field" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Late Grace Period (minutes)</label>
            <input type="number" className="input-field" value={graceMinutes} onChange={(e) => setGraceMinutes(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Late Penalty Per Instance (Rs)</label>
            <input type="number" className="input-field" value={latePenalty} onChange={(e) => setLatePenalty(e.target.value)} />
            <p className="mt-1 text-[11px] text-slate-500">0 = being late alone never deducts pay.</p>
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={handleSaveSettings} disabled={savingSettings}>
          {savingSettings ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">ZKTeco Devices</h2>
          <button className="btn-secondary text-xs" onClick={openDeviceModal}>
            <Plus size={14} /> Add Device
          </button>
        </div>
        {zktecoDevices.length === 0 ? (
          <EmptyState icon={Server} title="No device configured" description="Add the K40's IP address so the bridge script knows where to connect." />
        ) : (
          <div className="divide-y divide-white/5">
            {zktecoDevices.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {d.name} <span className="text-slate-500">— {d.ip_address}:{d.port}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {d.last_synced_at ? `Last synced ${formatDate(d.last_synced_at)}` : 'Never synced yet'}
                    {d.last_sync_error && <span className="text-neon-red"> · {d.last_sync_error}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={d.is_active ? 'green' : 'slate'}>{d.is_active ? 'Active' : 'Inactive'}</Badge>
                  <button
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
                    onClick={() => updateZktecoDevice(d.id, { isActive: !d.is_active })}
                  >
                    {d.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red" onClick={() => handleDeleteDevice(d.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Government Holidays</h2>
          <button className="btn-secondary text-xs" onClick={openHolidayModal}>
            <Plus size={14} /> Add Holiday
          </button>
        </div>
        {governmentHolidays.length === 0 ? (
          <EmptyState icon={Plus} title="No holidays added" description="Government holidays are automatically paid — no deduction." />
        ) : (
          <div className="divide-y divide-white/5">
            {governmentHolidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{h.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(h.date)}</p>
                </div>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red" onClick={() => handleDeleteHoliday(h.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={deviceModalOpen} onClose={() => setDeviceModalOpen(false)} title="Add ZKTeco Device">
        <div className="space-y-4">
          <div>
            <label className="label-field">Device Name</label>
            <input className="input-field" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="e.g. K40 — Front Office" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">IP Address</label>
              <input className="input-field" value={deviceIp} onChange={(e) => setDeviceIp(e.target.value)} placeholder="192.168.1.201" />
            </div>
            <div>
              <label className="label-field">Port</label>
              <input type="number" className="input-field" value={devicePort} onChange={(e) => setDevicePort(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setDeviceModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveDevice} disabled={savingDevice}>
              {savingDevice ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={holidayModalOpen} onClose={() => setHolidayModalOpen(false)} title="Add Government Holiday">
        <div className="space-y-4">
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Name</label>
            <input className="input-field" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g. Independence Day" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setHolidayModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveHoliday} disabled={savingHoliday}>
              {savingHoliday ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
