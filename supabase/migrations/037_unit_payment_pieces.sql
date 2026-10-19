-- Piece-rate pay for unit supervisors: pieces made and the rate used, snapshotted per payment.
alter table unit_payments add column if not exists pieces_completed int check (pieces_completed is null or pieces_completed >= 0);
alter table unit_payments add column if not exists rate_per_piece numeric(12,2) check (rate_per_piece is null or rate_per_piece >= 0);
