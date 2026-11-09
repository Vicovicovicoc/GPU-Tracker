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

## Rules
- Read `import.meta.env.VITE_*` with dot notation only; generated files using bracket access are normalized by the `normalize-supabase-client-env` pre-plugin in `vite.config.ts`. Why: Vite/OXC `define` skips bracket access, leaving production values undefined.
