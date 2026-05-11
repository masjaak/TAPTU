-- Add method fields used by the API attendance state machine.
alter table public.attendance_records
  add column if not exists check_in_method text check (check_in_method in ('QR','GPS','Selfie','Manual')),
  add column if not exists check_out_method text check (check_out_method in ('QR','GPS','Selfie','Manual'));
