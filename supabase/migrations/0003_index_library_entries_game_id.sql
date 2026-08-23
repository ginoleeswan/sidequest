-- library_entries.game_id references games(id) with no covering index.
-- Two costs: every delete or update on `games` has to scan the whole of
-- library_entries to check the constraint, and the join behind any
-- "who saved this" question is a sequential scan.
--
-- The other four notices from the linter are the `_pull` indexes, all
-- reported unused. They are unused because the database is empty and the
-- sync code that will read them is not written yet — a fact the linter
-- cannot know. They stay.
create index library_entries_game on public.library_entries (game_id);
