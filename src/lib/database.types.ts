export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type FactoryRole = 'admin' | 'cutting_head' | 'stitching_head' | 'quality_head' | 'store_manager'

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _diag_probe: {
        Row: {
          id: number | null
        }
        Insert: {
          id?: number | null
        }
        Update: {
          id?: number | null
        }
        Relationships: []
      }
      advance_deductions: {
        Row: {
          advance_id: number | null
          amount: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          date: string
          department: string
          employee_name: string
          id: number
          salary_payment_id: number | null
          unit_payment_id: number | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          advance_id?: number | null
          amount: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          department?: string
          employee_name: string
          id?: number
          salary_payment_id?: number | null
          unit_payment_id?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          advance_id?: number | null
          amount?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          department?: string
          employee_name?: string
          id?: number
          salary_payment_id?: number | null
          unit_payment_id?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_deductions_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_deductions_salary_payment_id_fkey"
            columns: ["salary_payment_id"]
            isOneToOne: false
            referencedRelation: "salary_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_deductions_unit_payment_id_fkey"
            columns: ["unit_payment_id"]
            isOneToOne: false
            referencedRelation: "unit_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      advances: {
        Row: {
          amount: number | null
          bank_account_id: number | null
          created_at: string | null
          created_by_user_id: string | null
          created_by_username: string | null
          department: string
          employee_name: string | null
          id: number
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          paid_date: string | null
        }
        Insert: {
          amount?: number | null
          bank_account_id?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_username?: string | null
          department?: string
          employee_name?: string | null
          id?: never
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          paid_date?: string | null
        }
        Update: {
          amount?: number | null
          bank_account_id?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_username?: string | null
          department?: string
          employee_name?: string | null
          id?: never
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          paid_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advances_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          device_employee_id: string | null
          display_name: string
          email: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          device_employee_id?: string | null
          display_name: string
          email: string
          id: string
          username: string
        }
        Update: {
          created_at?: string
          device_employee_id?: string | null
          display_name?: string
          email?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          created_by_user_id: string | null
          created_by_username: string | null
          date: string
          device_employee_id: string | null
          device_id: string | null
          device_name: string | null
          device_source: string | null
          device_sync_time: string | null
          early_leave_minutes: number | null
          employee_id: number
          id: number
          late_minutes: number | null
          leave_type: string | null
          machine_log_id: string | null
          notes: string | null
          overtime_hours: number | null
          shortage_hours: number | null
          source: string
          status: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          working_hours: number | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_username?: string | null
          date: string
          device_employee_id?: string | null
          device_id?: string | null
          device_name?: string | null
          device_source?: string | null
          device_sync_time?: string | null
          early_leave_minutes?: number | null
          employee_id: number
          id?: never
          late_minutes?: number | null
          leave_type?: string | null
          machine_log_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          shortage_hours?: number | null
          source?: string
          status?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          working_hours?: number | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          device_employee_id?: string | null
          device_id?: string | null
          device_name?: string | null
          device_source?: string | null
          device_sync_time?: string | null
          early_leave_minutes?: number | null
          employee_id?: number
          id?: never
          late_minutes?: number | null
          leave_type?: string | null
          machine_log_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          shortage_hours?: number | null
          source?: string
          status?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          working_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          id: number
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          performed_by_username: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          performed_by_username?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          performed_by_username?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          date: string
          id: number
          notes: string | null
          reference_id: number | null
          reference_type: string | null
          type: string
        }
        Insert: {
          amount: number
          bank_account_id: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          reference_id?: number | null
          reference_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          bank_account_id?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          reference_id?: number | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_settings: {
        Row: {
          id: number
          opening_balance: number
          opening_date: string
          updated_at: string
        }
        Insert: {
          id?: number
          opening_balance?: number
          opening_date?: string
          updated_at?: string
        }
        Update: {
          id?: number
          opening_balance?: number
          opening_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          bank_account_id: number | null
          category: string
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          date: string
          id: number
          notes: string | null
          reference_id: number | null
          reference_type: string | null
          type: string
        }
        Insert: {
          amount: number
          bank_account_id?: number | null
          category: string
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          reference_id?: number | null
          reference_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          bank_account_id?: number | null
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          reference_id?: number | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount: number
          bank_account_id: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          date: string
          id: number
          notes: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount: number
          bank_account_id: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          created_at: string
          hex: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          hex?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          hex?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      courier_collections: {
        Row: {
          amount: number
          courier_id: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount: number
          courier_id: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number
          courier_id?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_collections_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_expected_collections: {
        Row: {
          amount: number
          courier_id: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          date: string
          id: number
          notes: string | null
          order_reference: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount: number
          courier_id: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          order_reference?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number
          courier_id?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          order_reference?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_expected_collections_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_payments: {
        Row: {
          amount: number
          bank_account_id: number | null
          courier_id: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          notes: string | null
          payment_date: string
          payment_type: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: number | null
          courier_id: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          notes?: string | null
          payment_date?: string
          payment_type: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: number | null
          courier_id?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          notes?: string | null
          payment_date?: string
          payment_type?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_payments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          bank_account_id: number | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          is_active: boolean
          name: string
          payment_method: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          bank_account_id?: number | null
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          is_active?: boolean
          name: string
          payment_method?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          bank_account_id?: number | null
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          is_active?: boolean
          name?: string
          payment_method?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couriers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      creditor_bills: {
        Row: {
          amount: number
          bill_date: string
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          creditor_id: number
          description: string | null
          id: number
          invoice_path: string | null
          notes: string | null
          reference_number: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount: number
          bill_date?: string
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          creditor_id: number
          description?: string | null
          id?: number
          invoice_path?: string | null
          notes?: string | null
          reference_number?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number
          bill_date?: string
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          creditor_id?: number
          description?: string | null
          id?: number
          invoice_path?: string | null
          notes?: string | null
          reference_number?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creditor_bills_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      creditor_payments: {
        Row: {
          amount: number
          bank_account_id: number | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          creditor_id: number
          id: number
          notes: string | null
          payment_date: string
          payment_type: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: number | null
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          creditor_id: number
          id?: number
          notes?: string | null
          payment_date?: string
          payment_type: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: number | null
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          creditor_id?: number
          id?: number
          notes?: string | null
          payment_date?: string
          payment_type?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creditor_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creditor_payments_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      creditors: {
        Row: {
          address: string | null
          category: string | null
          contact_person: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          contact_person?: string | null
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          contact_person?: string | null
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      dashboard_layouts: {
        Row: {
          updated_at: string
          user_id: string
          widget_order: string[]
        }
        Insert: {
          updated_at?: string
          user_id: string
          widget_order: string[]
        }
        Update: {
          updated_at?: string
          user_id?: string
          widget_order?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          created_by_username: string | null
          department: string | null
          device_employee_id: string | null
          employee_code: string | null
          employee_group: string
          employee_type: string
          id: number
          is_active: boolean
          join_date: string | null
          machine_user_id: string | null
          name: string
          rate_per_piece: number | null
          salary: number | null
          salary_date: number | null
          starting_salary: number
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          security_deducted_date: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_username?: string | null
          department?: string | null
          device_employee_id?: string | null
          employee_code?: string | null
          employee_group?: string
          employee_type?: string
          id?: never
          is_active?: boolean
          join_date?: string | null
          machine_user_id?: string | null
          name: string
          rate_per_piece?: number | null
          salary?: number | null
          salary_date?: number | null
          starting_salary?: number
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          security_deducted_date?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_username?: string | null
          department?: string | null
          device_employee_id?: string | null
          employee_code?: string | null
          employee_group?: string
          employee_type?: string
          id?: never
          is_active?: boolean
          join_date?: string | null
          machine_user_id?: string | null
          name?: string
          rate_per_piece?: number | null
          salary?: number | null
          salary_date?: number | null
          starting_salary?: number
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          security_deducted_date?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          name: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          name: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          name?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number | null
          category: string
          created_at: string | null
          created_by_user_id: string | null
          created_by_username: string | null
          date: string | null
          expense_scope: string
          id: number
          notes: string | null
          payment_source: string
          title: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount?: number | null
          category?: string
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string | null
          expense_scope?: string
          id?: never
          notes?: string | null
          payment_source?: string
          title: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number | null
          category?: string
          created_at?: string | null
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string | null
          expense_scope?: string
          id?: never
          notes?: string | null
          payment_source?: string
          title?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      grand_advance_recoveries: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          grand_advance_id: number
          id: number
          recovery_amount: number
          recovery_date: string
          salary_payment_id: number | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          grand_advance_id: number
          id?: number
          recovery_amount: number
          recovery_date: string
          salary_payment_id?: number | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          grand_advance_id?: number
          id?: number
          recovery_amount?: number
          recovery_date?: string
          salary_payment_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grand_advance_recoveries_grand_advance_id_fkey"
            columns: ["grand_advance_id"]
            isOneToOne: false
            referencedRelation: "grand_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grand_advance_recoveries_salary_payment_id_fkey"
            columns: ["salary_payment_id"]
            isOneToOne: false
            referencedRelation: "salary_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      grand_advances: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          employee_id: number
          id: number
          issue_date: string
          monthly_recovery_amount: number | null
          notes: string | null
          original_amount: number
          outstanding_balance: number
          status: string
          total_recovered: number
          updated_at: string
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          employee_id: number
          id?: number
          issue_date: string
          monthly_recovery_amount?: number | null
          notes?: string | null
          original_amount: number
          outstanding_balance: number
          status?: string
          total_recovered?: number
          updated_at?: string
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          employee_id?: number
          id?: number
          issue_date?: string
          monthly_recovery_amount?: number | null
          notes?: string | null
          original_amount?: number
          outstanding_balance?: number
          status?: string
          total_recovered?: number
          updated_at?: string
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grand_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      khadim_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          date: string
          description: string | null
          id: number
          notes: string | null
          type: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          description?: string | null
          id?: number
          notes?: string | null
          type: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          description?: string | null
          id?: number
          notes?: string | null
          type?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      master_data_items: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          is_active: boolean
          name: string
          sort_order: number
          type_key: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          is_active?: boolean
          name: string
          sort_order?: number
          type_key: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          is_active?: boolean
          name?: string
          sort_order?: number
          type_key?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_data_items_type_key_fkey"
            columns: ["type_key"]
            isOneToOne: false
            referencedRelation: "master_data_types"
            referencedColumns: ["key"]
          },
        ]
      }
      master_data_types: {
        Row: {
          created_at: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_colors: {
        Row: {
          color_id: number
          product_id: number
        }
        Insert: {
          color_id: number
          product_id: number
        }
        Update: {
          color_id?: number
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_operation_rates: {
        Row: {
          created_at: string
          effective_from: string
          id: number
          product_operation_id: number
          rate: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: number
          product_operation_id: number
          rate: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: number
          product_operation_id?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_operation_rates_product_operation_id_fkey"
            columns: ["product_operation_id"]
            isOneToOne: false
            referencedRelation: "product_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_operations: {
        Row: {
          created_at: string
          department_label: string
          id: number
          is_active: boolean
          operation_name: string
          product_id: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          department_label: string
          id?: number
          is_active?: boolean
          operation_name: string
          product_id: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          department_label?: string
          id?: number
          is_active?: boolean
          operation_name?: string
          product_id?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_operations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          created_at: string
          id: number
          product_id: number
          size_label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: number
          product_id: number
          size_label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: number
          product_id?: number
          size_label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_plan_sizes: {
        Row: {
          id: number
          planned_qty: number
          production_plan_id: number
          size_label: string
        }
        Insert: {
          id?: number
          planned_qty: number
          production_plan_id: number
          size_label: string
        }
        Update: {
          id?: number
          planned_qty?: number
          production_plan_id?: number
          size_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_plan_sizes_production_plan_id_fkey"
            columns: ["production_plan_id"]
            isOneToOne: false
            referencedRelation: "production_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      production_plans: {
        Row: {
          color_id: number | null
          created_at: string
          created_by: string | null
          expected_completion_date: string | null
          id: number
          plan_date: string
          product_id: number
          production_type: string
          remarks: string | null
          status: string
        }
        Insert: {
          color_id?: number | null
          created_at?: string
          created_by?: string | null
          expected_completion_date?: string | null
          id?: number
          plan_date?: string
          product_id: number
          production_type?: string
          remarks?: string | null
          status?: string
        }
        Update: {
          color_id?: number | null
          created_at?: string
          created_by?: string | null
          expected_completion_date?: string | null
          id?: number
          plan_date?: string
          product_id?: number
          production_type?: string
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_plans_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          picture_url: string | null
          production_type: string
          size_group: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          picture_url?: string | null
          production_type?: string
          size_group?: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          picture_url?: string | null
          production_type?: string
          size_group?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          role: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: string | null
        }
        Relationships: []
      }
      salary_increments: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          employee_id: number
          id: number
          increment_amount: number
          increment_date: string
          increment_percentage: number | null
          increment_type: string
          increment_value: number
          new_salary: number
          notes: string | null
          previous_salary: number
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          employee_id: number
          id?: number
          increment_amount: number
          increment_date?: string
          increment_percentage?: number | null
          increment_type: string
          increment_value: number
          new_salary: number
          notes?: string | null
          previous_salary: number
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          employee_id?: number
          id?: number
          increment_amount?: number
          increment_date?: string
          increment_percentage?: number | null
          increment_type?: string
          increment_value?: number
          new_salary?: number
          notes?: string | null
          previous_salary?: number
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_increments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_item_purchases: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          employee_name: string
          id: number
          item_name: string
          item_type: string
          notes: string | null
          price: number
          purchase_date: string
          salary_payment_id: number | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          employee_name: string
          id?: number
          item_name: string
          item_type: string
          notes?: string | null
          price: number
          purchase_date?: string
          salary_payment_id?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          employee_name?: string
          id?: number
          item_name?: string
          item_type?: string
          notes?: string | null
          price?: number
          purchase_date?: string
          salary_payment_id?: number | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_item_purchases_salary_payment_id_fkey"
            columns: ["salary_payment_id"]
            isOneToOne: false
            referencedRelation: "salary_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          absent_deduction: number
          bank_account_id: number | null
          base_amount: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          deduction_amount: number
          item_deduction: number
          other_deduction: number
          other_deduction_reason: string | null
          security_deduction: number
          employee_name: string
          id: number
          late_deduction: number
          leave_deduction: number
          month: number
          net_amount: number
          notes: string | null
          overtime_amount: number
          overtime_hours: number | null
          overtime_included: boolean
          payment_date: string
          payment_method: string | null
          pieces_completed: number | null
          rate_per_piece: number | null
          reference_number: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          year: number
        }
        Insert: {
          absent_deduction?: number
          bank_account_id?: number | null
          base_amount: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          deduction_amount?: number
          item_deduction?: number
          other_deduction?: number
          other_deduction_reason?: string | null
          security_deduction?: number
          employee_name: string
          id?: number
          late_deduction?: number
          leave_deduction?: number
          month: number
          net_amount: number
          notes?: string | null
          overtime_amount?: number
          overtime_hours?: number | null
          overtime_included?: boolean
          payment_date?: string
          payment_method?: string | null
          pieces_completed?: number | null
          rate_per_piece?: number | null
          reference_number?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          year: number
        }
        Update: {
          absent_deduction?: number
          bank_account_id?: number | null
          base_amount?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          deduction_amount?: number
          item_deduction?: number
          other_deduction?: number
          other_deduction_reason?: string | null
          security_deduction?: number
          employee_name?: string
          id?: number
          late_deduction?: number
          leave_deduction?: number
          month?: number
          net_amount?: number
          notes?: string | null
          overtime_amount?: number
          overtime_hours?: number | null
          overtime_included?: boolean
          payment_date?: string
          payment_method?: string | null
          pieces_completed?: number | null
          rate_per_piece?: number | null
          reference_number?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_orders: {
        Row: {
          customer_city: string | null
          customer_name: string | null
          customer_phone: string | null
          financial_status: string
          id: number
          imported_at: string
          order_date: string
          order_number: string
          payment_method: string | null
          shopify_order_id: string
          shopify_transaction_id: string | null
          store_key: string | null
          total_amount: number
        }
        Insert: {
          customer_city?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          financial_status: string
          id?: number
          imported_at?: string
          order_date: string
          order_number: string
          payment_method?: string | null
          shopify_order_id: string
          shopify_transaction_id?: string | null
          store_key?: string | null
          total_amount: number
        }
        Update: {
          customer_city?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          financial_status?: string
          id?: number
          imported_at?: string
          order_date?: string
          order_number?: string
          payment_method?: string | null
          shopify_order_id?: string
          shopify_transaction_id?: string | null
          store_key?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "shopify_orders_store_key_fkey"
            columns: ["store_key"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["store_key"]
          },
        ]
      }
      shopify_settings: {
        Row: {
          id: number
          last_synced_at: string | null
          store_domain: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          last_synced_at?: string | null
          store_domain?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          last_synced_at?: string | null
          store_domain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shopify_stores: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          display_name: string
          id: number
          is_connected: boolean
          last_sync_error: string | null
          last_synced_at: string | null
          store_domain: string | null
          store_key: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          display_name: string
          id?: number
          is_connected?: boolean
          last_sync_error?: string | null
          last_synced_at?: string | null
          store_domain?: string | null
          store_key: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          display_name?: string
          id?: number
          is_connected?: boolean
          last_sync_error?: string | null
          last_synced_at?: string | null
          store_domain?: string | null
          store_key?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      supervisors: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          name: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          name: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          name?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      unit_payments: {
        Row: {
          advance_given: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          month: number
          net_amount: number
          notes: string | null
          overtime_amount: number
          payment_date: string
          period_end: string
          period_start: string
          supervisor_name: string
          total_amount: number
          unit_expenses_during_period: number
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          year: number
        }
        Insert: {
          advance_given?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          month: number
          net_amount?: number
          notes?: string | null
          overtime_amount?: number
          payment_date?: string
          period_end: string
          period_start: string
          supervisor_name: string
          total_amount?: number
          unit_expenses_during_period?: number
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          year: number
        }
        Update: {
          advance_given?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          month?: number
          net_amount?: number
          notes?: string | null
          overtime_amount?: number
          payment_date?: string
          period_end?: string
          period_start?: string
          supervisor_name?: string
          total_amount?: number
          unit_expenses_during_period?: number
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
          year?: number
        }
        Relationships: []
      }
      units: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          id: number
          location: string | null
          name: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          location?: string | null
          name: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          id?: number
          location?: string | null
          name?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      unmapped_attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          device_employee_id: string
          device_id: string | null
          device_name: string | null
          id: number
          raw_payload: Json | null
          source_ip: string | null
          status: string | null
          sync_time: string
          updated_at: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          device_employee_id: string
          device_id?: string | null
          device_name?: string | null
          id?: never
          raw_payload?: Json | null
          source_ip?: string | null
          status?: string | null
          sync_time: string
          updated_at?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          device_employee_id?: string
          device_id?: string | null
          device_name?: string | null
          id?: never
          raw_payload?: Json | null
          source_ip?: string | null
          status?: string | null
          sync_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      zakat_settings: {
        Row: {
          id: number
          monthly_budget: number
          opening_balance: number
          opening_month: string
          updated_at: string
        }
        Insert: {
          id?: number
          monthly_budget?: number
          opening_balance?: number
          opening_month?: string
          updated_at?: string
        }
        Update: {
          id?: number
          monthly_budget?: number
          opening_balance?: number
          opening_month?: string
          updated_at?: string
        }
        Relationships: []
      }
      zakat_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          date: string
          id: number
          notes: string | null
          recipient_name: string
          updated_at: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          recipient_name: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_user_id?: string | null
          created_by_username?: string | null
          date?: string
          id?: number
          notes?: string | null
          recipient_name?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          updated_by_username?: string | null
        }
        Relationships: []
      }
      zkteco_devices: {
        Row: {
          created_at: string | null
          device_id: string
          device_model: string | null
          device_name: string
          id: number
          ip_address: string | null
          is_online: boolean | null
          last_sync: string | null
          location: string | null
          port: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          device_model?: string | null
          device_name: string
          id?: never
          ip_address?: string | null
          is_online?: boolean | null
          last_sync?: string | null
          location?: string | null
          port?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          device_model?: string | null
          device_name?: string
          id?: never
          ip_address?: string | null
          is_online?: boolean | null
          last_sync?: string | null
          location?: string | null
          port?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      zkteco_request_logs: {
        Row: {
          body: string | null
          created_at: string | null
          headers: Json | null
          id: number
          method: string | null
          path: string | null
          query_params: Json | null
          source_ip: string | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          headers?: Json | null
          id?: never
          method?: string | null
          path?: string | null
          query_params?: Json | null
          source_ip?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          headers?: Json | null
          id?: never
          method?: string | null
          path?: string | null
          query_params?: Json | null
          source_ip?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      zkteco_sync_log: {
        Row: {
          action: string
          created_at: string | null
          device_id: string
          employee_id: string
          error_message: string | null
          id: number
          status: string | null
          timestamp: string
        }
        Insert: {
          action: string
          created_at?: string | null
          device_id: string
          employee_id: string
          error_message?: string | null
          id?: never
          status?: string | null
          timestamp: string
        }
        Update: {
          action?: string
          created_at?: string | null
          device_id?: string
          employee_id?: string
          error_message?: string | null
          id?: never
          status?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_device"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "zkteco_devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      zkteco_user_mapping: {
        Row: {
          created_at: string | null
          employee_id: string
          enrollment_status: string | null
          id: number
          updated_at: string | null
          zkteco_card_id: string | null
          zkteco_user_id: string
          zkteco_username: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          enrollment_status?: string | null
          id?: never
          updated_at?: string | null
          zkteco_card_id?: string | null
          zkteco_user_id: string
          zkteco_username?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          enrollment_status?: string | null
          id?: never
          updated_at?: string | null
          zkteco_card_id?: string | null
          zkteco_user_id?: string
          zkteco_username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      advance_balance_by_name: {
        Row: {
          balance: number | null
          department: string | null
          name: string | null
          total_advanced: number | null
          total_deducted: number | null
        }
        Relationships: []
      }
      employee_advance_balance: {
        Row: {
          balance: number | null
          employee_name: string | null
          total_advanced: number | null
          total_deducted: number | null
        }
        Relationships: []
      }
      product_operation_current_rates: {
        Row: {
          effective_from: string | null
          product_operation_id: number | null
          rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_operation_rates_product_operation_id_fkey"
            columns: ["product_operation_id"]
            isOneToOne: false
            referencedRelation: "product_operations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_app_username: { Args: never; Returns: string }
      factory_role: { Args: never; Returns: string }
      is_app_user: { Args: never; Returns: boolean }
      resolve_login_email: { Args: { p_username: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
