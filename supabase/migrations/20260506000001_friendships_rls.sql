-- The original SELECT policy only allowed users to see rows where they are the
-- follower (user_id = auth.uid()), which made the followers query return zero
-- rows because those rows have auth.uid() = friend_id, not user_id.
-- Replace it with a policy that covers both sides of the relationship.

drop policy if exists "Users see who they follow" on public.friendships;

create policy "Users see own follow relationships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);
