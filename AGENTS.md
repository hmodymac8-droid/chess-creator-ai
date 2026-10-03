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

- Use asset pointers in `src/assets/pieces` for board and legend piece artwork; the same piece silhouette must render consistently in both places while game rules stay in the engine.
- Accounts use name+password mapped to a synthetic email (src/lib/auth.tsx); usernames live in profiles — keeps sign-in email-free.
- Online games are rows in `games` synced via realtime; each game copies its rules so the friend can play without access to the owner's private variants.
