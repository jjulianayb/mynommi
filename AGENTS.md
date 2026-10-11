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
- Use a shared fixed header and a native right-side navigation dialog instead of persistent navigation bars; expose creation through a floating action button.
- Keep the social shell session-aware and leave entry/legal/help routes public; backend authentication remains out of scope.
- Teia membership lives in DemoState.joinedTeias; join/leave rules and the open-teias catalog live in src/lib/teias.ts (original groups stay in friends-data for the social-web layout).
- New accounts start from emptyState; demo mode loads demoState. Daily-routine rules (greeting, question of the day, pending bell, awaiting reply) live in src/lib/today.ts so they stay testable.
- Profile visibility (public/private) lives in DemoState and listings filter private people via one shared helper so future search reuses it.
- Keep the chat sticker catalogue and tray in focused reusable modules; both private and group chats share browser-local favorites, recents, and message timestamps.
- No MCP server: the public demo catalog server was removed; reintroduce only with authenticated access once real accounts exist.
- The AI opener endpoint applies a best-effort in-memory rate limit (per IP and global daily cap); it is not durable across worker instances.
- Radar rules (places, nearest public place, approximate distance, privacy filter) live in src/lib/radar.ts; device coordinates are never persisted. Partner meetup ideas use a server function with the same best-effort in-memory rate limit as openers.

- Credit balances change only through security-definer database functions (admin adjust, boost spend) that write the ledger; clients never write balances directly.
- Real credit purchases use embedded card checkout; balances change only in the payment webhook via the idempotent grant_purchased_credits function (keyed by checkout session), so a client can never add credits itself.
