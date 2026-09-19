import { supabase } from '@/lib/supabase'

const BUCKET = 'creditor-invoices'
const MAX_BYTES = 8 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 1800

export const INVOICE_ACCEPT = 'image/*,application/pdf'

/** Phone photos are often 5-10MB — downscale to a readable-but-light JPEG
 * before uploading. PDFs and anything the browser can't decode pass
 * through untouched. */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1024 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export async function uploadCreditorInvoice(creditorId: number, file: File): Promise<string> {
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    throw new Error('Invoice must be a picture or a PDF.')
  }
  const prepared = await compressImage(file)
  if (prepared.size > MAX_BYTES) throw new Error('Invoice file is too large (max 8 MB).')
  const safeName = prepared.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${creditorId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, prepared, { contentType: prepared.type, upsert: false })
  if (error) throw new Error(`Invoice upload failed: ${error.message}`)
  return path
}

export async function getInvoiceUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
  if (error || !data) throw new Error(error?.message ?? 'Could not open invoice.')
  return data.signedUrl
}

export async function removeInvoice(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}
