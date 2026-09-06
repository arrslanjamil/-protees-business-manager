import type { Database, FactoryRole } from './database.types'

export type { FactoryRole }
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Color = Database['public']['Tables']['colors']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductSize = Database['public']['Tables']['product_sizes']['Row']
export type ProductOperation = Database['public']['Tables']['product_operations']['Row']
export type ProductOperationRate = Database['public']['Tables']['product_operation_rates']['Row']
export type ProductionPlan = Database['public']['Tables']['production_plans']['Row']
export type ProductionPlanSize = Database['public']['Tables']['production_plan_sizes']['Row']
export type CurrentOperationRate = Database['public']['Views']['product_operation_current_rates']['Row']

export const FACTORY_ROLE_LABELS: Record<FactoryRole, string> = {
  admin: 'Admin',
  cutting_head: 'Cutting Head',
  stitching_head: 'Stitching Head',
  quality_head: 'Quality Head',
  store_manager: 'Store Manager',
}

export const FACTORY_ROLES: FactoryRole[] = ['admin', 'cutting_head', 'stitching_head', 'quality_head', 'store_manager']

export const ADULT_SIZES = ['S', 'M', 'L', 'XL', '2XL'] as const
export const KIDS_SIZES = ['2-3', '4-5', '6-7', '7-8', '9-10', '11-12', '13', '14', '15-16'] as const

export type SizeGroup = 'adult' | 'kids'
export type ProductionType = 'normal' | 'digital_print'
export type ProductionPlanStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export const PRODUCTION_PLAN_STATUS_LABELS: Record<ProductionPlanStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** A product's operations grouped by department label, with each
 * operation's current (latest-effective) rate attached — the shape the
 * Admin config screen and every downstream read-only rate display use. */
export interface ProductOperationWithRate extends ProductOperation {
  currentRate: number
}

export interface OperationDepartmentGroup {
  departmentLabel: string
  operations: ProductOperationWithRate[]
}

export function groupOperationsByDepartment(operations: ProductOperationWithRate[]): OperationDepartmentGroup[] {
  const byDept = new Map<string, ProductOperationWithRate[]>()
  for (const op of operations) {
    const list = byDept.get(op.department_label) ?? []
    list.push(op)
    byDept.set(op.department_label, list)
  }
  return Array.from(byDept.entries()).map(([departmentLabel, ops]) => ({
    departmentLabel,
    operations: ops.sort((a, b) => a.sort_order - b.sort_order),
  }))
}
