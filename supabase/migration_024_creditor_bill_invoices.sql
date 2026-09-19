-- Protees Business Manager — Creditor bills: attach an invoice picture/PDF
-- as proof.
--
-- The file lives in a PRIVATE Supabase Storage bucket (invoices are
-- financial documents — never publicly readable by URL); the app opens
-- them through short-lived signed URLs. creditor_bills.invoice_path stores
-- the object path inside the bucket.
--
-- Safe to re-run.

alter table creditor_bills add column if not exists invoice_path text;

insert into storage.buckets (id, name, public)
values ('creditor-invoices', 'creditor-invoices', false)
on conflict (id) do nothing;

drop policy if exists "app users manage creditor invoices" on storage.objects;
create policy "app users manage creditor invoices" on storage.objects
  for all
  using (bucket_id = 'creditor-invoices' and is_app_user())
  with check (bucket_id = 'creditor-invoices' and is_app_user());
