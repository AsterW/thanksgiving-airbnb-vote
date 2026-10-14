# Contributing

Several people build on this at once, so the code is split by feature to keep
PRs from touching the same files.

## Where things go

- **A new page/tab**: add `web/src/features/<name>/` (its components, hooks and
  CSS), one entry in `VIEWS` in `web/src/lib/config.js`, and one `<Pane>` line in
  `web/src/App.jsx`. If it needs an API, add `worker/<name>/routes.js` exporting
  `routes` and spread it into `ROUTES` in `worker/index.js`.
- **A new endpoint for an existing feature**: add it to that feature's `routes`
  table. Don't edit `worker/index.js`.
- **Styles**: Tailwind classes in JSX. Anything Tailwind can't express goes in the
  feature's own CSS file, not `web/src/styles.css`.
- **Shared code** (`web/src/lib`, `web/src/components`, `worker/lib`,
  `worker/users`): change it only when several features need the change; these
  files are the ones most likely to conflict.

## Before you push

```bash
npm run check   # lint + build + bundle the worker
```

CI runs the same on every PR. There are no generated files in git, so merge
conflicts are always in code you can read.

## Storage keys

KV keys are listed in `ARCHITECTURE.md`. A new feature should use its own key
prefix (e.g. `angel:v1`) rather than adding fields to another feature's data.
