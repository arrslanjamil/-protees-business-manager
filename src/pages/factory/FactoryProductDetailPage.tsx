import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Scissors } from 'lucide-react'
import { useFactoryData } from '@/context/FactoryDataContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { RequireFactoryRole } from '@/components/factory/RequireFactoryRole'
import { groupOperationsByDepartment, type ProductOperationWithRate } from '@/lib/factoryTypes'
import { formatCurrency } from '@/lib/utils'

function AddOperationRow({ productId, departmentLabel }: { productId: number; departmentLabel: string }) {
  const { addOperation } = useFactoryData()
  const [adding, setAdding] = useState(false)
  const [operationName, setOperationName] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const rateNum = Number(rate)
    if (!operationName.trim() || Number.isNaN(rateNum) || rateNum < 0) return
    setSaving(true)
    try {
      await addOperation({ productId, departmentLabel, operationName: operationName.trim(), rate: rateNum })
      setOperationName('')
      setRate('')
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  if (!adding) {
    return (
      <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan hover:text-neon-cyan/80">
        <Plus size={13} /> Add Operation
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input className="input-field py-1.5 text-sm" placeholder="Operation name" value={operationName} onChange={(e) => setOperationName(e.target.value)} />
      <input className="input-field w-24 py-1.5 text-sm" placeholder="Rate" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
      <button className="btn-primary px-3 py-1.5 text-xs" onClick={handleSave} disabled={saving}>
        Save
      </button>
      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setAdding(false)}>
        Cancel
      </button>
    </div>
  )
}

function OperationRateCell({ operation }: { operation: ProductOperationWithRate }) {
  const { updateOperationRate } = useFactoryData()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(operation.currentRate))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const num = Number(value)
    if (Number.isNaN(num) || num < 0) return
    setSaving(true)
    try {
      await updateOperationRate(operation.id, num)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input className="input-field w-20 py-1 text-sm" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="text-xs font-medium text-neon-green" onClick={handleSave} disabled={saving}>
          Save
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white">
      Rs. {operation.currentRate.toFixed(2)}
      <Pencil size={11} className="text-slate-500" />
    </button>
  )
}

function ProductDetailContent() {
  const { id } = useParams()
  const productId = Number(id)
  const { products, operations, currentRates } = useFactoryData()

  const product = products.find((p) => p.id === productId)

  const operationsWithRates = useMemo<ProductOperationWithRate[]>(() => {
    return operations
      .filter((op) => op.product_id === productId && op.is_active)
      .map((op) => {
        const rate = currentRates.find((r) => r.product_operation_id === op.id)
        return { ...op, currentRate: rate?.rate ?? 0 }
      })
  }, [operations, currentRates, productId])

  const departments = useMemo(() => groupOperationsByDepartment(operationsWithRates), [operationsWithRates])
  const existingDepartmentLabels = Array.from(new Set(operationsWithRates.map((o) => o.department_label)))
  const [newDeptName, setNewDeptName] = useState('')
  const [showNewDept, setShowNewDept] = useState(false)

  if (!product) {
    return <EmptyState icon={Scissors} title="Product not found" description="It may have been removed." />
  }

  const totalRate = operationsWithRates.reduce((sum, op) => sum + op.currentRate, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link to="/factory/products" className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300">
          <ArrowLeft size={13} /> Back to Products
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-white">{product.name}</h1>
          <Badge color={product.production_type === 'digital_print' ? 'purple' : 'cyan'}>
            {product.production_type === 'digital_print' ? 'Digital Print' : 'Normal'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Configure stitching operations and rates. Rates are never edited in place — saving a new rate keeps every past production
          record locked to the rate that applied when it was completed.
        </p>
      </div>

      {departments.length === 0 ? (
        <EmptyState icon={Scissors} title="No operations configured" description="Add a department below to start (e.g. Overlock, Flat Lock, Singer, Clipping)." />
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => (
            <div key={dept.departmentLabel} className="card">
              <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-slate-400">{dept.departmentLabel}</h3>
              <div className="space-y-2.5">
                {dept.operations.map((op) => (
                  <div key={op.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3.5 py-2.5">
                    <span className="text-sm text-slate-200">{op.operation_name}</span>
                    <OperationRateCell operation={op} />
                  </div>
                ))}
                <AddOperationRow productId={productId} departmentLabel={dept.departmentLabel} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {!showNewDept ? (
          <button type="button" onClick={() => setShowNewDept(true)} className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan">
            <Plus size={14} /> New Department (e.g. a group like "Overlock")
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="input-field flex-1"
              placeholder="Department name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              list="existing-departments"
            />
            <datalist id="existing-departments">
              {existingDepartmentLabels.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            {newDeptName.trim() && <AddOperationRow productId={productId} departmentLabel={newDeptName.trim()} />}
            <button className="btn-secondary" onClick={() => { setShowNewDept(false); setNewDeptName('') }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {operationsWithRates.length > 0 && (
        <div className="card flex items-center justify-between">
          <span className="text-sm text-slate-400">Total rate per completed piece</span>
          <span className="font-display text-lg font-bold text-neon-green">{formatCurrency(totalRate)}</span>
        </div>
      )}
    </div>
  )
}

export function FactoryProductDetailPage() {
  return (
    <RequireFactoryRole role="admin">
      <ProductDetailContent />
    </RequireFactoryRole>
  )
}
