export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: number
          name: string
          salary: number
          join_date: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          salary: number
          join_date?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
        Relationships: []
      }
      supervisors: {
        Row: {
          id: number
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['supervisors']['Insert']>
        Relationships: []
      }
      advances: {
        Row: {
          id: number
          employee_name: string
          department: 'cutting_department' | 'protees_unit'
          amount: number
          payment_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: number
          employee_name: string
          department: 'cutting_department' | 'protees_unit'
          amount: number
          payment_date?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['advances']['Insert']>
        Relationships: []
      }
      expenses: {
        Row: {
          id: number
          title: string
          category: string
          amount: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          category: string
          amount: number
          date?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
        Relationships: []
      }
      expense_categories: {
        Row: {
          id: number
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['expense_categories']['Insert']>
        Relationships: []
      }
      salary_payments: {
        Row: {
          id: number
          employee_name: string
          base_amount: number
          overtime_amount: number
          deduction_amount: number
          net_amount: number
          month: number
          year: number
          payment_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: number
          employee_name: string
          base_amount: number
          overtime_amount?: number
          deduction_amount?: number
          net_amount: number
          month: number
          year: number
          payment_date?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['salary_payments']['Insert']>
        Relationships: []
      }
      unit_payments: {
        Row: {
          id: number
          supervisor_name: string
          payment_date: string
          period_start: string
          period_end: string
          total_amount: number
          overtime_amount: number
          advance_given: number
          net_amount: number
          unit_expenses_during_period: number
          notes: string | null
          month: number
          year: number
          created_at: string
        }
        Insert: {
          id?: number
          supervisor_name: string
          payment_date?: string
          period_start: string
          period_end: string
          total_amount: number
          overtime_amount?: number
          advance_given?: number
          net_amount: number
          unit_expenses_during_period?: number
          notes?: string | null
          month: number
          year: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['unit_payments']['Insert']>
        Relationships: []
      }
      advance_deductions: {
        Row: {
          id: number
          advance_id: number | null
          employee_name: string
          department: 'cutting_department' | 'protees_unit'
          salary_payment_id: number | null
          unit_payment_id: number | null
          amount: number
          date: string
          created_at: string
        }
        Insert: {
          id?: number
          advance_id?: number | null
          employee_name: string
          department: 'cutting_department' | 'protees_unit'
          salary_payment_id?: number | null
          unit_payment_id?: number | null
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
            foreignKeyName: 'advance_deductions_salary_payment_id_fkey'
            columns: ['salary_payment_id']
            referencedRelation: 'salary_payments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'advance_deductions_unit_payment_id_fkey'
            columns: ['unit_payment_id']
            referencedRelation: 'unit_payments'
            referencedColumns: ['id']
          },
        ]
      }
      units: {
        Row: {
          id: number
          name: string
          location: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          location?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['units']['Insert']>
        Relationships: []
      }
      khadim_transactions: {
        Row: {
          id: number
          type: 'payment_given' | 'bill_submitted'
          date: string
          amount: number
          notes: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          type: 'payment_given' | 'bill_submitted'
          date?: string
          amount: number
          notes?: string | null
          description?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['khadim_transactions']['Insert']>
        Relationships: []
      }
    }
    Views: {
      advance_balance_by_name: {
        Row: {
          name: string
          department: 'cutting_department' | 'protees_unit'
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
