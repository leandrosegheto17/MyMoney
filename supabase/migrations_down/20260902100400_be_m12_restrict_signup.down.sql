-- Rollback manual de 20260902100400_be_m12_restrict_signup.sql
drop trigger if exists auth_users_before_insert_restrict_signup on auth.users;
drop function if exists public.auth_users_restrict_signup();
drop table if exists public.allowed_signup_emails;
