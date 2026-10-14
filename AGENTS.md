<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Demo modes keep the browser-local demo-state provider; real accounts (people and businesses) use Lovable Cloud with RLS, and admin rights come only from the user_roles table checked server-side.
- Keep each content screen in a dedicated TanStack route with unique metadata and shared navigation; this makes every screen directly navigable.
- Preserve the supplied SVG art through reusable avatar, icon and sticker components, using global semantic color tokens for fidelity.

- Keep demo access in a separate browser-only session provider; persist only simulated email/session flags, never passwords, and never use it as real authorization.
- Use native modal dialogs for bottom sheets so keyboard focus and dismissal stay accessible.
- Use a shared fixed header, five-slot bottom navigation and native dialogs for secondary navigation and creation; this keeps primary journeys directly accessible.
- Keep the social shell session-aware and leave entry/legal/help routes public; private data handlers continue enforcing their own existing server authentication.
- Teia membership and group chat for real accounts live in teia_members/teia_messages (RLS: members only, Realtime) via src/lib/shared-teias.ts; demo mode keeps browser-local helpers in src/lib/teias.ts.
- Validate short signup through src/lib/nommi-access.ts and populate existing profile fields after authentication; birth date remains Auth metadata because the profile schema has no birth-date column.
- Host-only frontend affordances use the authenticated profile flag, not demo session flags; this controls presentation without changing existing server authorization.
- New accounts start from emptyState; demo mode loads demoState. Daily-routine rules (greeting, question of the day, pending bell, awaiting reply) live in src/lib/today.ts so they stay testable.
- Profile visibility (public/private) lives in DemoState and listings filter private people via one shared helper so future search reuses it.
- Keep the chat sticker catalogue and tray in focused reusable modules; both private and group chats share browser-local favorites, recents, and message timestamps.
- No MCP server: the public demo catalog server was removed; reintroduce only with authenticated access once real accounts exist.
- The AI opener endpoint applies a best-effort in-memory rate limit (per IP and global daily cap); it is not durable across worker instances.
- Radar rules (places, nearest public place, approximate distance, privacy filter) live in src/lib/radar.ts; device coordinates are never persisted. Partner meetup ideas use a server function with the same best-effort in-memory rate limit as openers.

- Credit balances change only through security-definer database functions (admin adjust, boost spend) that write the ledger; clients never write balances directly.
- Real credit purchases use embedded card checkout; balances change only in the payment webhook via the idempotent grant_purchased_credits function (keyed by checkout session), so a client can never add credits itself.

- Keep the visual reward catalogue in a focused module; it reads existing published host ideas without modifying payment or reward-balance rules.
- Real-account teias and open rolês live in the teias table (any signed-in account reads, creator writes) via src/lib/real-teias.ts; ids start at 100000 so they never collide with demo teias.
- Real-account profile edits, photo (resized data URL in profiles.avatar_url, since public storage buckets are blocked) and people search live in src/lib/real-profiles.ts; public profiles are at /nommi/$id.
