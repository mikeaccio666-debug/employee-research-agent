-- The conversation beside the résumé editor (PRD COACH-12): one per person, across all their
-- résumé versions, kept apart from the studio's so each agent reads only its own history.
-- Same tables, same row-level security; only the purpose is new.

alter table public.conversations drop constraint conversations_purpose_check;
alter table public.conversations add constraint conversations_purpose_check check (purpose in ('companion', 'resume'));
