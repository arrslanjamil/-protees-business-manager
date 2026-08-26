export interface Database {
  public: {
    Tables: {
      units: {
        Row: {
          id: string
          name: string
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['units']['Insert']>
      }
      employees: {
        Row: {
          id: string
          name: string
          phone: string | null
          role: string | null
          unit_id: string | null
          monthly_salary: number
          joined_date: string | null
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          unit_id?: string | null
          monthly_salary?: number
          joined_date?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
      }
      advances: {
        Row: {
          id: string
          employee_id: string
          amount: number
          reason: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          amount: number
          reason?: string | null
          date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['advances']['Insert']>
      }
      salary_payments: {
        Row: {
          id: string
          employee_id: string
          base_amount: number
          deduction_amount: number
          net_amount: number
          month: number
          year: number
          payment_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          base_amount: number
          deduction_amount?: number
          net_amount: number
          month: number
          year: number
          payment_date?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['salary_payments']['Insert']>
      }
      advance_deductions: {
        Row: {
          id: string
          advance_id: string | null
          employee_id: string
          salary_payment_id: string | null
          amount: number
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          advance_id?: string | null
          employee_id: string
          salary_payment_id?: string | null
          amount: number
          date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['advance_deductions']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          unit_id: string | null
          category: string
          amount: number
          description: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          unit_id?: string | null
          category: string
          amount: number
          description?: string | null
          date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
    }
    Views: {
      employee_advance_balance: {
        Row: {
          employee_id: string
          total_advanced: number
          total_deducted: number
          balance: number
        }
      }
    }
  }
}
