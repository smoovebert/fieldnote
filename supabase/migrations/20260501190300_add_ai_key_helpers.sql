-- Encrypt to base64-encoded ciphertext.
create or replace function public.ai_key_encrypt(p_plaintext text, p_secret text)
returns text language sql immutable
set search_path = extensions, public as $$
  select encode(pgp_sym_encrypt(p_plaintext, p_secret), 'base64')
$$;

-- Decrypt from base64-encoded ciphertext.
create or replace function public.ai_key_decrypt(p_ciphertext_b64 text, p_secret text)
returns text language sql immutable
set search_path = extensions, public as $$
  select pgp_sym_decrypt(decode(p_ciphertext_b64, 'base64'), p_secret)
$$;

-- Restrict execution to service role.
revoke all on function public.ai_key_encrypt(text, text) from public, anon, authenticated;
revoke all on function public.ai_key_decrypt(text, text) from public, anon, authenticated;
grant execute on function public.ai_key_encrypt(text, text) to service_role;
grant execute on function public.ai_key_decrypt(text, text) to service_role;
