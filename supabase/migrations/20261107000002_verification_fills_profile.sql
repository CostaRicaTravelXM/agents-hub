-- An agent who answers the verification in the Agents Portal has already told us
-- their agency, so the Hub must not ask again. The answers fill whatever the
-- profile is still missing and never overwrite something the agent typed.
-- The Portal already reads the other way: its form starts from the profile.

create or replace function public.fill_profile_from_answers(p_user uuid, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_company text := nullif(trim(p_answers ->> 'company'), '');
  v_title text := nullif(trim(p_answers ->> 'job_title'), '');
  v_phone text := nullif(trim(p_answers ->> 'phone'), '');
  v_independent boolean := coalesce(p_answers ->> 'partner_type' = 'Independent Travel Agent', false);
begin
  update public.profiles p
  set company = coalesce(p.company, case when p.is_independent then null else v_company end),
      is_independent = p.is_independent or (v_independent and v_company is null and p.company is null),
      job_title = coalesce(p.job_title, v_title),
      phone = coalesce(p.phone, v_phone),
      hub_onboarded_at = case
        when v_company is not null or v_independent then coalesce(p.hub_onboarded_at, now())
        else p.hub_onboarded_at
      end
  where p.id = p_user;
end $$;

revoke all on function public.fill_profile_from_answers(uuid, jsonb) from public, anon, authenticated;

create or replace function public.fill_profile_from_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.fill_profile_from_answers(new.user_id, new.answers);
  return new;
end $$;

revoke all on function public.fill_profile_from_verification() from public, anon, authenticated;

drop trigger if exists agent_verifications_fill_profile on public.agent_verifications;
create trigger agent_verifications_fill_profile
  after insert or update of answers on public.agent_verifications
  for each row execute function public.fill_profile_from_verification();

-- Answers saved before this trigger existed.
select public.fill_profile_from_answers(user_id, answers) from public.agent_verifications;
