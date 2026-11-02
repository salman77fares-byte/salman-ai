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
- Android app (Capacitor, appId com.salman.ai) loads the published site via server.url and bundles only public/offline.html + logo as errorPath fallback — the SSR app has no static build, so updates ship by publishing.
- Voice input records with MediaRecorder and transcribes server-side via /api/transcribe — Web Speech API is unreliable in Android WebView.
