import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Plus, Sparkles } from 'lucide-react'
import { useFactoryData } from '@/context/FactoryDataContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { RequireFactoryRole } from '@/components/factory/RequireFactoryRole'
import { ADULT_SIZES, KIDS_SIZES, type SizeGroup, type ProductionType } from '@/lib/factoryTypes'
import { classNames } from '@/lib/utils'

function CreateProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors, addColor, createProduct } = useFactoryData()
  const [name, setName] = useState('')
  const [pictureUrl, setPictureUrl] = useState('')
  const [productionType, setProductionType] = useState<ProductionType>('normal')
  const [sizeGroup, setSizeGroup] = useState<SizeGroup>('adult')
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([])
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#64748b')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableSizes = sizeGroup === 'adult' ? ADULT_SIZES : KIDS_SIZES

  function toggleSize(size: string) {
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]))
  }

  function toggleColor(id: number) {
    setSelectedColorIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  async function handleAddColor() {
    if (!newColorName.trim()) return
    const color = await addColor(newColorName.trim(), newColorHex)
    setSelectedColorIds((prev) => [...prev, color.id])
    setNewColorName('')
  }

  function reset() {
    setName('')
    setPictureUrl('')
    setProductionType('normal')
    setSizeGroup('adult')
    setSelectedSizes([])
    setSelectedColorIds([])
    setError(null)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Enter a product name.')
      return
    }
    if (selectedSizes.length === 0) {
      setError('Select at least one size.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createProduct({
        name: name.trim(),
        pictureUrl: pictureUrl.trim() || null,
        productionType,
        sizeGroup,
        sizeLabels: selectedSizes,
        colorIds: selectedColorIds,
      })
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="New Product" maxWidth="max-w-xl">
      <div className="space-y-5">
        <div>
          <label className="label-field">Product Name</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. T-Shirt" />
        </div>
        <div>
          <label className="label-field">Product Picture URL (optional)</label>
          <input className="input-field" value={pictureUrl} onChange={(e) => setPictureUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div>
          <label className="label-field">Production Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setProductionType('normal')}
              className={classNames(
                'flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition',
                productionType === 'normal' ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 text-slate-400'
              )}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setProductionType('digital_print')}
              className={classNames(
                'flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition',
                productionType === 'digital_print' ? 'border-neon-purple/50 bg-neon-purple/10 text-neon-purple' : 'border-white/10 text-slate-400'
              )}
            >
              <Sparkles size={14} className="mr-1 inline" /> Digital Print / Sublimation
            </button>
          </div>
        </div>

        <div>
          <label className="label-field">Size Group</label>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => { setSizeGroup('adult'); setSelectedSizes([]) }}
              className={classNames(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                sizeGroup === 'adult' ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 text-slate-400'
              )}
            >
              Adult
            </button>
            <button
              type="button"
              onClick={() => { setSizeGroup('kids'); setSelectedSizes([]) }}
              className={classNames(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                sizeGroup === 'kids' ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 text-slate-400'
              )}
            >
              Kids
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={classNames(
                  'min-w-[48px] rounded-lg border px-3 py-2 text-sm font-semibold transition',
                  selectedSizes.includes(size) ? 'border-neon-green/50 bg-neon-green/10 text-neon-green' : 'border-white/10 text-slate-400'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-field">Colors</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleColor(c.id)}
                className={classNames(
                  'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                  selectedColorIds.includes(c.id) ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 text-slate-400'
                )}
              >
                <span className="h-3 w-3 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
            <input className="input-field flex-1" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} placeholder="Add a color (e.g. Maroon)" />
            <button type="button" className="btn-secondary shrink-0" onClick={handleAddColor}>
              Add
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-neon-red">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={() => { reset(); onClose() }}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ProductsContent() {
  const { products, productSizes, productColorLinks, colors } = useFactoryData()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Products</h1>
          <p className="mt-1 text-sm text-slate-400">Define products, sizes, colors, and stitching operations with rates.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Product
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description="Add your first product to start configuring operations and rates." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const sizes = productSizes.filter((s) => s.product_id === product.id)
            const productColorIds = productColorLinks.filter((pc) => pc.product_id === product.id).map((pc) => pc.color_id)
            const productColors = colors.filter((c) => productColorIds.includes(c.id))
            return (
              <Link key={product.id} to={`/factory/products/${product.id}`} className="card group transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-semibold text-white">{product.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge color={product.production_type === 'digital_print' ? 'purple' : 'cyan'}>
                        {product.production_type === 'digital_print' ? 'Digital Print' : 'Normal'}
                      </Badge>
                      <Badge color="amber">{product.size_group === 'adult' ? 'Adult' : 'Kids'}</Badge>
                      {!product.is_active && <Badge color="red">Inactive</Badge>}
                    </div>
                  </div>
                  {product.picture_url && (
                    <img src={product.picture_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <span key={s.id} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {s.size_label}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                  {productColors.map((c) => (
                    <span key={c.id} className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} title={c.name} />
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <CreateProductModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

export function FactoryProductsPage() {
  return (
    <RequireFactoryRole role="admin">
      <ProductsContent />
    </RequireFactoryRole>
  )
}
