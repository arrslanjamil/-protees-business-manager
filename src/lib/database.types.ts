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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'employees_unit_id_fkey'
            columns: ['unit_id']
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'advances_employee_id_fkey'
            columns: ['employee_id']
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'salary_payments_employee_id_fkey'
            columns: ['employee_id']
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'advance_deductions_advance_id_fkey'
            columns: ['advance_id']
            referencedRelation: 'advances'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'advance_deductions_employee_id_fkey'
            columns: ['employee_id']
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'advance_deductions_salary_payment_id_fkey'
            columns: ['salary_payment_id']
            referencedRelation: 'salary_payments'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'expenses_unit_id_fkey'
            columns: ['unit_id']
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
