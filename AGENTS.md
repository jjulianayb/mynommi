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

- Use a shared React demo-state provider with browser-local persistence for the visual-only prototype; no remote backend is permitted in this phase.
- Keep each content screen in a dedicated TanStack route with unique metadata and shared navigation; this makes every screen directly navigable.
- Preserve the supplied SVG art through reusable avatar, icon and sticker components, using global semantic color tokens for fidelity.

- Keep demo access in a separate browser-only session provider; persist only simulated email/session flags, never passwords, and never use it as real authorization.
- Use native modal dialogs for bottom sheets so keyboard focus and dismissal stay accessible.
- Use a shared fixed header and a native right-side navigation dialog instead of persistent navigation bars; expose creation through a floating action button.
- Keep the social shell session-aware and leave entry/legal/help routes public; backend authentication remains out of scope.
- Keep the chat sticker catalogue and tray in focused reusable modules; both private and group chats share browser-local favorites, recents, and message timestamps.
- MCP server lives in src/lib/mcp (one tool per file) and exposes only static demo catalog data publicly; browser-local user state is never reachable.
