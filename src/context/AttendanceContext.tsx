import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { todayISO } from '@/lib/utils'
import type { Attendance, AttendanceSettings, AttendanceStatus, GovernmentHoliday, LeaveType, ZktecoDevice } from '@/lib/types'

interface UpsertAttendanceInput {
  employeeId: number
  date: string
  checkIn?: string | null
  checkOut?: string | null
  status: AttendanceStatus
  leaveType?: LeaveType | null
  workingHours?: number | null
  shortageHours?: number | null
  lateMinutes?: number | null
  earlyLeaveMinutes?: number | null
  overtimeHours?: number | null
  notes?: string | null
}

interface AttendanceContextValue {
  loading: boolean
  error: string | null

  attendance: Attendance[]
  governmentHolidays: GovernmentHoliday[]
  attendanceSettings: AttendanceSettings | null
  zktecoDevices: ZktecoDevice[]

  refreshAll: () => Promise<void>

  /** Manual add/correct — same upsert-by-(employee,date) the bridge script
   * uses, so a manual edit and a later machine sync never fight. */
  upsertAttendance: (input: UpsertAttendanceInput) => Promise<void>
  deleteAttendance: (id: number) => Promise<void>

  addGovernmentHoliday: (input: { date: string; name: string }) => Promise<void>
  deleteGovernmentHoliday: (id: number) => Promise<void>

  updateAttendanceSettings: (input: Partial<{
    standardWorkingHours: number
    breakMinutes: number
    standardStartTime: string
    lateGraceMinutes: number
    latePenaltyPerInstance: number
  }>) => Promise<void>

  addZktecoDevice: (input: { name: string; ipAddress: string; port?: number }) => Promise<void>
  updateZktecoDevice: (id: number, input: Partial<{ name: string; ipAddress: string; port: number; isActive: boolean }>) => Promise<void>
  deleteZktecoDevice: (id: number) => Promise<void>
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null)

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [governmentHolidays, setGovernmentHolidays] = useState<GovernmentHoliday[]>([])
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings | null>(null)
  const [zktecoDevices, setZktecoDevices] = useState<ZktecoDevice[]>([])

  const hasLoadedOnceRef = useRef(false)

  const refreshAll = useCallback(async () => {
    if (!appUser) {
      setLoading(false)
      return
    }
    if (!hasLoadedOnceRef.current) setLoading(true)
    setError(null)
    try {
      // Attendance is capped to the trailing ~14 months — enough for any
      // payroll period lookback without pulling a permanently-growing
      // full-history table on every load.
      const sinceISO = new Date(Date.now() - 14 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const [att, gh, as_, zd] = await Promise.all([
        supabase.from('attendance').select('*').gte('date', sinceISO).order('date', { ascending: false }),
        supabase.from('government_holidays').select('*').order('date', { ascending: false }),
        supabase.from('attendance_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('zkteco_devices').select('*').order('created_at', { ascending: true }),
      ])
      const firstError = [att, gh, as_, zd].find((r) => r.error)?.error
      if (firstError) throw firstError

      setAttendance(att.data ?? [])
      setGovernmentHolidays(gh.data ?? [])
      setAttendanceSettings(as_.data ?? null)
      setZktecoDevices(zd.data ?? [])
      hasLoadedOnceRef.current = true
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load attendance data from Supabase.'
      setError(message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.id])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const upsertAttendance: AttendanceContextValue['upsertAttendance'] = async (input) => {
    const { error: err } = await supabase.from('attendance').upsert(
      {
        employee_id: input.employeeId,
        date: input.date,
        check_in: input.checkIn ?? null,
        check_out: input.checkOut ?? null,
        status: input.status,
        leave_type: input.leaveType ?? null,
        working_hours: input.workingHours ?? null,
        shortage_hours: input.shortageHours ?? null,
        late_minutes: input.lateMinutes ?? null,
        early_leave_minutes: input.earlyLeaveMinutes ?? null,
        overtime_hours: input.overtimeHours ?? null,
        source: 'manual',
        notes: input.notes ?? null,
      },
      { onConflict: 'employee_id,date' }
    )
    if (err) throw err
    await refreshAll()
  }

  const deleteAttendance: AttendanceContextValue['deleteAttendance'] = async (id) => {
    const { error: err } = await supabase.from('attendance').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const addGovernmentHoliday: AttendanceContextValue['addGovernmentHoliday'] = async ({ date, name }) => {
    const { error: err } = await supabase.from('government_holidays').insert({ date, name })
    if (err) throw err
    await refreshAll()
  }

  const deleteGovernmentHoliday: AttendanceContextValue['deleteGovernmentHoliday'] = async (id) => {
    const { error: err } = await supabase.from('government_holidays').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const updateAttendanceSettings: AttendanceContextValue['updateAttendanceSettings'] = async (input) => {
    const payload: {
      id: number
      updated_at: string
      standard_working_hours?: number
      break_minutes?: number
      standard_start_time?: string
      late_grace_minutes?: number
      late_penalty_per_instance?: number
    } = { id: 1, updated_at: new Date().toISOString() }
    if (input.standardWorkingHours !== undefined) payload.standard_working_hours = input.standardWorkingHours
    if (input.breakMinutes !== undefined) payload.break_minutes = input.breakMinutes
    if (input.standardStartTime !== undefined) payload.standard_start_time = input.standardStartTime
    if (input.lateGraceMinutes !== undefined) payload.late_grace_minutes = input.lateGraceMinutes
    if (input.latePenaltyPerInstance !== undefined) payload.late_penalty_per_instance = input.latePenaltyPerInstance
    const { error: err } = await supabase.from('attendance_settings').upsert(payload)
    if (err) throw err
    await refreshAll()
  }

  const addZktecoDevice: AttendanceContextValue['addZktecoDevice'] = async ({ name, ipAddress, port }) => {
    const { error: err } = await supabase.from('zkteco_devices').insert({ name, ip_address: ipAddress, port: port ?? 4370 })
    if (err) throw err
    await refreshAll()
  }

  const updateZktecoDevice: AttendanceContextValue['updateZktecoDevice'] = async (id, input) => {
    const payload: { name?: string; ip_address?: string; port?: number; is_active?: boolean } = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.ipAddress !== undefined) payload.ip_address = input.ipAddress
    if (input.port !== undefined) payload.port = input.port
    if (input.isActive !== undefined) payload.is_active = input.isActive
    const { error: err } = await supabase.from('zkteco_devices').update(payload).eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const deleteZktecoDevice: AttendanceContextValue['deleteZktecoDevice'] = async (id) => {
    const { error: err } = await supabase.from('zkteco_devices').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const value: AttendanceContextValue = {
    loading,
    error,
    attendance,
    governmentHolidays,
    attendanceSettings,
    zktecoDevices,
    refreshAll,
    upsertAttendance,
    deleteAttendance,
    addGovernmentHoliday,
    deleteGovernmentHoliday,
    updateAttendanceSettings,
    addZktecoDevice,
    updateZktecoDevice,
    deleteZktecoDevice,
  }

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>
}

export function useAttendance(): AttendanceContextValue {
  const ctx = useContext(AttendanceContext)
  if (!ctx) throw new Error('useAttendance must be used within an AttendanceProvider')
  return ctx
}

export function todayAttendanceDate(): string {
  return todayISO()
}
