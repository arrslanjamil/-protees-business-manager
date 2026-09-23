import { useMemo, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { useFactoryData } from '@/context/FactoryDataContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { RequireFactoryRole } from '@/components/factory/RequireFactoryRole'
import { PRODUCTION_PLAN_STATUS_LABELS, type ProductionPlanStatus } from '@/lib/factoryTypes'
import { classNames, errorMessage, formatDate, todayISO } from '@/lib/utils'

const STATUS_BADGE_COLOR: Record<ProductionPlanStatus, 'cyan' | 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  in_progress: 'cyan',
  completed: 'green',
  cancelled: 'red',
}

function CreatePlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, productSizes, productColorLinks, colors, createProductionPlan } = useFactoryData()
  const activeProducts = products.filter((p) => p.is_active)

  const [productId, setProductId] = useState<number | ''>('')
  const [colorId, setColorId] = useState<number | ''>('')
  const [planDate, setPlanDate] = useState(todayISO())
  const [expectedDate, setExpectedDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = activeProducts.find((p) => p.id === productId)
  const sizesForProduct = productSizes.filter((s) => s.product_id === productId).sort((a, b) => a.sort_order - b.sort_order)
  const colorIdsForProduct = productColorLinks.filter((pc) => pc.product_id === productId).map((pc) => pc.color_id)
  const colorsForProduct = colors.filter((c) => colorIdsForProduct.includes(c.id))

  function reset() {
    setProductId('')
    setColorId('')
    setPlanDate(todayISO())
    setExpectedDate('')
    setRemarks('')
    setQuantities({})
    setError(null)
  }

  const totalPlanned = useMemo(() => Object.values(quantities).reduce((sum, v) => sum + (Number(v) || 0), 0), [quantities])

  async function handleSave() {
    if (!productId || !selectedProduct) {
      setError('Select a product.')
      return
    }
    const sizes = sizesForProduct
      .map((s) => ({ sizeLabel: s.size_label, plannedQty: Number(quantities[s.size_label]) || 0 }))
      .filter((s) => s.plannedQty > 0)
    if (sizes.length === 0) {
      setError('Enter a quantity for at least one size.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createProductionPlan({
        productId: selectedProduct.id,
        colorId: colorId === '' ? null : colorId,
        productionType: selectedProduct.production_type,
        planDate,
        expectedCompletionDate: expectedDate || null,
        remarks: remarks.trim() || null,
        sizes,
      })
      reset()
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Failed to create plan.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="New Production Plan" maxWidth="max-w-xl">
      <div className="space-y-5">
        <div>
          <label className="label-field">Product</label>
          <select className="input-field" value={productId} onChange={(e) => { setProductId(e.target.value ? Number(e.target.value) : ''); setColorId(''); setQuantities({}) }}>
            <option value="">Select a product</option>
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.production_type === 'digital_print' ? '(Digital Print)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <>
            {selectedProduct.picture_url && (
              <img src={selectedProduct.picture_url} alt={selectedProduct.name} className="h-24 w-24 rounded-xl object-cover" />
            )}

            {colorsForProduct.length > 0 && (
              <div>
                <label className="label-field">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorsForProduct.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColorId(c.id)}
                      className={classNames(
                        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                        colorId === c.id ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 text-slate-400'
                      )}
                    >
                      <span className="h-3 w-3 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label-field">Quantity by Size</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {sizesForProduct.map((s) => (
                  <div key={s.id}>
                    <p className="mb-1 text-center text-xs font-semibold text-slate-400">{s.size_label}</p>
                    <input
                      type="number"
                      className="input-field py-1.5 text-center text-sm"
                      placeholder="0"
                      value={quantities[s.size_label] ?? ''}
                      onChange={(e) => setQuantities((prev) => ({ ...prev, [s.size_label]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Total planned: {totalPlanned}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Plan Date</label>
                <input type="date" className="input-field" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
              </div>
              <div>
                <label className="label-field">Expected Completion (optional)</label>
                <input type="date" className="input-field" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label-field">Remarks (optional)</label>
              <input className="input-field" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Notes" />
            </div>
          </>
        )}

        {error && <p className="text-xs text-neon-red">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={() => { reset(); onClose() }}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving || !selectedProduct}>
            {saving ? 'Saving…' : 'Create Plan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ProductionPlansContent() {
  const { plans, planSizes, products, colors } = useFactoryData()
  const [modalOpen, setModalOpen] = useState(false)

  const sortedPlans = [...plans].sort((a, b) => new Date(b.plan_date).getTime() - new Date(a.plan_date).getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Production Plans</h1>
          <p className="mt-1 text-sm text-slate-400">Only relevant, configured sizes are offered per product.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Plan
        </button>
      </div>

      {sortedPlans.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No production plans yet" description="Create your first plan to start tracking production." />
      ) : (
        <div className="space-y-3">
          {sortedPlans.map((plan) => {
            const product = products.find((p) => p.id === plan.product_id)
            const color = colors.find((c) => c.id === plan.color_id)
            const sizes = planSizes.filter((s) => s.production_plan_id === plan.id)
            const total = sizes.reduce((sum, s) => sum + s.planned_qty, 0)
            return (
              <div key={plan.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {product?.picture_url && <img src={product.picture_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  <div>
                    <p className="font-medium text-white">
                      {product?.name ?? 'Unknown product'} {color && <span className="text-slate-400">— {color.name}</span>}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(plan.plan_date)} · {total} pieces planned</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {plan.production_type === 'digital_print' && <Badge color="purple">Digital Print</Badge>}
                  <Badge color={STATUS_BADGE_COLOR[plan.status]}>{PRODUCTION_PLAN_STATUS_LABELS[plan.status]}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreatePlanModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

export function FactoryProductionPlansPage() {
  return (
    <RequireFactoryRole role="admin">
      <ProductionPlansContent />
    </RequireFactoryRole>
  )
}
