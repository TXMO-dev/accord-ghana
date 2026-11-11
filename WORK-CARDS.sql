-- Opt-in public Testnet work cards. Run the whole file in Accord's SQL Editor.
begin;
create table if not exists public.accord_work_cards (
 network text not null default 'testnet' check(network='testnet'),
 contract text not null check(contract ~ '^C[A-Z2-7]{55}$'), agreement text not null check(agreement ~ '^AC-[a-f0-9-]{36}$'), wallet text not null check(wallet ~ '^G[A-Z2-7]{55}$'),
 receipt text not null check(receipt ~ '^[a-f0-9]{64}$'),
 revision integer not null default 0, published boolean not null default false,
 hidden boolean not null default false, title text, description text,
 verified_at timestamptz, updated_at timestamptz not null default now(),
 primary key(network,contract,agreement), unique(network,receipt),
 check((not published and title is null and description is null) or
 (published and title is not null and char_length(btrim(title)) between 1 and 60
 and description is not null and char_length(btrim(description)) between 1 and 240 and verified_at is not null))
);
alter table public.accord_work_cards enable row level security;
revoke all on public.accord_work_cards from public,anon,authenticated;
grant select on public.accord_work_cards to anon,authenticated;
grant select,insert,update on public.accord_work_cards to service_role;
drop policy if exists "Published work cards" on public.accord_work_cards;
create policy "Published work cards" on public.accord_work_cards for select to anon,authenticated using(published and not hidden);
create index if not exists accord_work_cards_wallet on public.accord_work_cards(wallet,updated_at desc);
create or replace function public.accord_work_card_write(p_wallet text,p_contract text,p_id text,p_receipt text,p_revision integer,p_remove boolean,p_title text,p_description text)
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.accord_work_cards;
begin
 if p_remove is null then raise exception 'Choose an action'; end if;
 insert into public.accord_work_cards(contract,agreement,wallet,receipt) values(p_contract,p_id,p_wallet,p_receipt) on conflict(network,contract,agreement) do nothing;
 select * into r from public.accord_work_cards where network='testnet' and contract=p_contract and agreement=p_id for update;
 if r.wallet<>p_wallet or r.receipt<>p_receipt or p_revision is null or r.revision<>p_revision then raise exception 'Card changed. Review and sign again'; end if;
 update public.accord_work_cards set revision=revision+1,published=not p_remove,
 title=case when p_remove then null else p_title end,
 description=case when p_remove then null else p_description end,
 verified_at=case when p_remove then verified_at else now() end,updated_at=now()
 where network='testnet' and contract=p_contract and agreement=p_id;
 return r.revision+1;
end $$;
revoke all on function public.accord_work_card_write(text,text,text,text,integer,boolean,text,text) from public,anon,authenticated;
grant execute on function public.accord_work_card_write(text,text,text,text,integer,boolean,text,text) to service_role;
commit;
-- Expect true, false, false.
select has_table_privilege('anon','public.accord_work_cards','SELECT') as public_can_read,
 has_table_privilege('authenticated','public.accord_work_cards','UPDATE') as browser_can_edit,
 has_function_privilege('anon','public.accord_work_card_write(text,text,text,text,integer,boolean,text,text)','EXECUTE') as public_can_write;
