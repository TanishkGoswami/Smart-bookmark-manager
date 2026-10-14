# Smart Bookmark Manager

A personal Chrome/Chromium new-tab extension for organizing bookmarks into visual boards, tabs, quick-save lists, trash, and a wallpaper-driven workspace.

## Current Experience

- Replaces the browser new tab page with a board-based bookmark manager.
- Reads and writes real browser bookmarks through the Chrome Bookmarks API.
- Supports local mock data when running through Vite in a normal browser.
- Persists wallpaper, board styling, tab grouping, and custom 2D board layout in extension storage.
- Provides search, drag-and-drop board placement, bookmark editing, trash/restore, backup export, and incognito open flow.

## Architecture

```text
manifest.json          Extension permissions and new-tab/popup registration
src/App.jsx            Main React experience and bookmark workflows
src/lib/bookmarkUtils.js
                       Shared URL, favicon, Chrome API, title, and color helpers
tests/layout.spec.js   Playwright smoke coverage for board layout behavior
```

The app currently keeps most UI and workflow state in `App.jsx`. The next architectural upgrade should split this into:

- `src/lib/chromeBookmarks.js` for promise-based Chrome bookmark operations.
- `src/lib/storage.js` for storage/localStorage fallback behavior.
- `src/components/Board.jsx`, `BookmarkItem.jsx`, and modal components.
- `src/hooks/useBookmarks.js`, `useWorkspaceSettings.js`, and `useResponsiveBoardColumns.js`.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

On Windows PowerShell, use `npm.cmd run build` or `npm.cmd run lint` if script execution policy blocks `npm.ps1`.

## Load The Extension

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose "Load unpacked".
5. Select the generated `dist` folder.

## Permissions

- `bookmarks`: read, create, move, edit, delete, restore, and organize bookmark folders/items.
- `storage`: persist workspace UI settings that should not be written into browser bookmarks.

## Upgrade Priorities

1. Split Chrome API access into promise-based adapters with explicit error handling.
2. Break the large app component into focused components and hooks.
3. Add tests for add/edit/delete/restore flows with mocked Chrome APIs.
4. Add confirmation UI for destructive actions like board deletion and empty trash.
5. Optimize `public/logo.png`; it is currently large for an extension icon..


