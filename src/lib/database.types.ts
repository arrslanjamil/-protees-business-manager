export type FactoryRole = 'admin' | 'cutting_head' | 'stitching_head' | 'quality_head' | 'store_manager'

/** Trigger-managed attribution columns present on every audited business
 * table. Never set by the client — always stamped server-side. */
export interface AuditColumns {
  created_by_user_id: string | null
  created_by_username: string | null
  updated_by_user_id: string | null
  updated_by_username: string | null
  updated_at: string | null
}

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: number
          name: string
          salary: number
          join_date: string | null
          employee_type: 'monthly' | 'contract'
          rate_per_piece: number | null
          employee_group: 'regular' | 'unit'
          is_active: boolean
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          salary: number
          join_date?: string | null
          employee_type?: 'monthly' | 'contract'
          rate_per_piece?: number | null
          employee_group?: 'regular' | 'unit'
          is_active?: boolean
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
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
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
          payment_method: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          employee_name: string
          department: 'cutting_department' | 'protees_unit'
          amount: number
          payment_date?: string
          notes?: string | null
          payment_method?: string | null
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
          expense_scope: 'business' | 'unit'
          payment_source: 'cash' | 'online'
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          title: string
          category: string
          amount: number
          date?: string
          notes?: string | null
          expense_scope?: 'business' | 'unit'
          payment_source?: 'cash' | 'online'
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
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
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
          pieces_completed: number | null
          rate_per_piece: number | null
          payment_method: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
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
          pieces_completed?: number | null
          rate_per_piece?: number | null
          payment_method?: string | null
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
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
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
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
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
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
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
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
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
      app_users: {
        Row: {
          id: string
          username: string
          display_name: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          email: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['app_users']['Insert']>
        Relationships: []
      }
      audit_log: {
        Row: {
          id: number
          table_name: string
          record_id: string
          action: 'create' | 'update' | 'delete'
          performed_by: string | null
          performed_by_username: string | null
          performed_at: string
          old_data: Record<string, unknown> | null
          new_data: Record<string, unknown> | null
        }
        // Written only by the stamp_and_log_audit() trigger (security
        // definer) — the app never calls .insert()/.update() on this table,
        // but Insert/Update still need real object shapes: a literal
        // `never` here collapses every OTHER table's insert/update types to
        // `never[]` too, since supabase-js infers them from the whole
        // Database['public']['Tables'] union.
        Insert: {
          id?: number
          table_name: string
          record_id: string
          action: 'create' | 'update' | 'delete'
          performed_by?: string | null
          performed_by_username?: string | null
          performed_at?: string
          old_data?: Record<string, unknown> | null
          new_data?: Record<string, unknown> | null
        }
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>
        Relationships: []
      }
      dashboard_layouts: {
        Row: {
          user_id: string
          widget_order: string[]
          updated_at: string
        }
        Insert: {
          user_id: string
          widget_order: string[]
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['dashboard_layouts']['Insert']>
        Relationships: []
      }
      zakat_transactions: {
        Row: {
          id: number
          recipient_name: string
          amount: number
          date: string
          notes: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          recipient_name: string
          amount: number
          date?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['zakat_transactions']['Insert']>
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
        Update: Partial<Database['public']['Tables']['zakat_settings']['Insert']>
        Relationships: []
      }
      couriers: {
        Row: {
          id: number
          name: string
          is_active: boolean
          payment_method: 'cash' | 'bank_transfer'
          bank_account_id: number | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          is_active?: boolean
          payment_method?: 'cash' | 'bank_transfer'
          bank_account_id?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['couriers']['Insert']>
        Relationships: []
      }
      courier_collections: {
        Row: {
          id: number
          courier_id: number
          invoice_number: string | null
          invoice_date: string
          amount: number
          notes: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          courier_id: number
          invoice_number?: string | null
          invoice_date?: string
          amount: number
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['courier_collections']['Insert']>
        Relationships: []
      }
      cash_transfers: {
        Row: {
          id: number
          bank_account_id: number
          amount: number
          date: string
          notes: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          bank_account_id: number
          amount: number
          date?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cash_transfers']['Insert']>
        Relationships: []
      }
      bank_accounts: {
        Row: {
          id: number
          name: string
          is_active: boolean
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['bank_accounts']['Insert']>
        Relationships: []
      }
      bank_transactions: {
        Row: {
          id: number
          bank_account_id: number
          type: 'credit' | 'debit'
          amount: number
          date: string
          reference_type: 'courier_payment' | 'cash_withdrawal' | 'manual' | 'courier_collection' | 'cash_transfer' | 'creditor_payment' | null
          reference_id: number | null
          notes: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
        }
        Insert: {
          id?: number
          bank_account_id: number
          type: 'credit' | 'debit'
          amount: number
          date?: string
          reference_type?: 'courier_payment' | 'cash_withdrawal' | 'manual' | 'courier_collection' | 'cash_transfer' | 'creditor_payment' | null
          reference_id?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['bank_transactions']['Insert']>
        Relationships: []
      }
      cash_transactions: {
        Row: {
          id: number
          type: 'cash_in' | 'cash_out'
          category: string
          amount: number
          date: string
          reference_type: 'courier_payment' | 'bank_withdrawal' | 'expense' | 'other' | 'courier_collection' | 'cash_transfer' | 'creditor_payment' | null
          reference_id: number | null
          bank_account_id: number | null
          notes: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
        }
        Insert: {
          id?: number
          type: 'cash_in' | 'cash_out'
          category: string
          amount: number
          date?: string
          reference_type?: 'courier_payment' | 'bank_withdrawal' | 'expense' | 'other' | 'courier_collection' | 'cash_transfer' | 'creditor_payment' | null
          reference_id?: number | null
          bank_account_id?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cash_transactions']['Insert']>
        Relationships: []
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
        Update: Partial<Database['public']['Tables']['cash_settings']['Insert']>
        Relationships: []
      }
      shopify_orders: {
        Row: {
          id: number
          shopify_order_id: string
          shopify_transaction_id: string | null
          order_number: string
          order_date: string
          customer_name: string | null
          customer_phone: string | null
          customer_city: string | null
          total_amount: number
          payment_method: string | null
          financial_status: string
          store_key: string | null
          imported_at: string
        }
        Insert: {
          id?: number
          shopify_order_id: string
          shopify_transaction_id?: string | null
          order_number: string
          order_date: string
          customer_name?: string | null
          customer_phone?: string | null
          customer_city?: string | null
          total_amount: number
          payment_method?: string | null
          financial_status: string
          store_key?: string | null
          imported_at?: string
        }
        Update: Partial<Database['public']['Tables']['shopify_orders']['Insert']>
        Relationships: []
      }
      shopify_settings: {
        Row: {
          id: number
          store_domain: string | null
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          store_domain?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shopify_settings']['Insert']>
        Relationships: []
      }
      shopify_stores: {
        Row: {
          id: number
          store_key: string
          display_name: string
          store_domain: string | null
          is_connected: boolean
          last_synced_at: string | null
          last_sync_error: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          store_key: string
          display_name: string
          store_domain?: string | null
          is_connected?: boolean
          last_synced_at?: string | null
          last_sync_error?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['shopify_stores']['Insert']>
        Relationships: []
      }
      master_data_types: {
        Row: {
          key: string
          label: string
          sort_order: number
          created_at: string
        }
        Insert: {
          key: string
          label: string
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['master_data_types']['Insert']>
        Relationships: []
      }
      master_data_items: {
        Row: {
          id: number
          type_key: string
          name: string
          is_active: boolean
          sort_order: number
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          type_key: string
          name: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['master_data_items']['Insert']>
        Relationships: []
      }
      creditors: {
        Row: {
          id: number
          name: string
          category: string | null
          contact_person: string | null
          phone: string | null
          address: string | null
          notes: string | null
          opening_balance: number
          is_active: boolean
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          category?: string | null
          contact_person?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          opening_balance?: number
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['creditors']['Insert']>
        Relationships: []
      }
      creditor_bills: {
        Row: {
          id: number
          creditor_id: number
          bill_date: string
          amount: number
          description: string | null
          reference_number: string | null
          notes: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          creditor_id: number
          bill_date?: string
          amount: number
          description?: string | null
          reference_number?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['creditor_bills']['Insert']>
        Relationships: []
      }
      creditor_payments: {
        Row: {
          id: number
          creditor_id: number
          amount: number
          payment_date: string
          payment_type: 'cash' | 'bank_transfer'
          bank_account_id: number | null
          notes: string | null
          created_at: string
          created_by_user_id: string | null
          created_by_username: string | null
          updated_by_user_id: string | null
          updated_by_username: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          creditor_id: number
          amount: number
          payment_date?: string
          payment_type: 'cash' | 'bank_transfer'
          bank_account_id?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['creditor_payments']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          name: string
          role: FactoryRole | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          role?: FactoryRole | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      colors: {
        Row: {
          id: number
          name: string
          hex: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          hex?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['colors']['Insert']>
        Relationships: []
      }
      products: {
        Row: {
          id: number
          name: string
          picture_url: string | null
          production_type: 'normal' | 'digital_print'
          size_group: 'adult' | 'kids'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          picture_url?: string | null
          production_type?: 'normal' | 'digital_print'
          size_group?: 'adult' | 'kids'
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
        Relationships: []
      }
      product_sizes: {
        Row: {
          id: number
          product_id: number
          size_label: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: number
          product_id: number
          size_label: string
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['product_sizes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'product_sizes_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_colors: {
        Row: {
          product_id: number
          color_id: number
        }
        Insert: {
          product_id: number
          color_id: number
        }
        Update: Partial<Database['public']['Tables']['product_colors']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'product_colors_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_colors_color_id_fkey'
            columns: ['color_id']
            referencedRelation: 'colors'
            referencedColumns: ['id']
          },
        ]
      }
      product_operations: {
        Row: {
          id: number
          product_id: number
          department_label: string
          operation_name: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          product_id: number
          department_label: string
          operation_name: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['product_operations']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'product_operations_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_operation_rates: {
        Row: {
          id: number
          product_operation_id: number
          rate: number
          effective_from: string
          created_at: string
        }
        Insert: {
          id?: number
          product_operation_id: number
          rate: number
          effective_from?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['product_operation_rates']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'product_operation_rates_product_operation_id_fkey'
            columns: ['product_operation_id']
            referencedRelation: 'product_operations'
            referencedColumns: ['id']
          },
        ]
      }
      production_plans: {
        Row: {
          id: number
          product_id: number
          color_id: number | null
          production_type: 'normal' | 'digital_print'
          plan_date: string
          expected_completion_date: string | null
          remarks: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          product_id: number
          color_id?: number | null
          production_type?: 'normal' | 'digital_print'
          plan_date?: string
          expected_completion_date?: string | null
          remarks?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['production_plans']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'production_plans_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'production_plans_color_id_fkey'
            columns: ['color_id']
            referencedRelation: 'colors'
            referencedColumns: ['id']
          },
        ]
      }
      production_plan_sizes: {
        Row: {
          id: number
          production_plan_id: number
          size_label: string
          planned_qty: number
        }
        Insert: {
          id?: number
          production_plan_id: number
          size_label: string
          planned_qty: number
        }
        Update: Partial<Database['public']['Tables']['production_plan_sizes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'production_plan_sizes_production_plan_id_fkey'
            columns: ['production_plan_id']
            referencedRelation: 'production_plans'
            referencedColumns: ['id']
          },
        ]
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
      product_operation_current_rates: {
        Row: {
          product_operation_id: number
          rate: number
          effective_from: string
        }
        Relationships: []
      }
    }
    Functions: {
      resolve_login_email: {
        Args: { p_username: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
