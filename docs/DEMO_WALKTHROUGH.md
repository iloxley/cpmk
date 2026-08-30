# CPMK demo walkthroughs

Use these as a live script, not a slide deck. Each demo names the machine, the directory, and the expected result. Copy the commands. Do not skip the `git status` checks — they are the point.

Open this page in the app at [http://127.0.0.1:7435/demo](http://127.0.0.1:7435/demo) after `npm run demo` or `cpmk dashboard`.

## Demo 0 — 90 seconds in this repo

**Machine:** your laptop. **Directory:** the CPMK checkout.

```bash
npm run build
npm run cpmk -- session status
npm run cpmk -- list
npm run cpmk -- context --budget 1800
npm run demo
```

**Expect**

- `session status` shows an open session titled **Explore the 1.0 CLI**, or `session: none` if you already ended it.
- `list` includes conventions (Node 22, schema v1, do not edit `sources/`), a secrets warning, and session-related decisions.
- The browser opens on loopback. **Memory** is the live store. **Guide** is the user manual. **Demo** is this script.

In the Memory page, add a note such as `Tried the in-app demo` and refresh `cpmk list`. The new JSON file appears under `.cpmk/memory/`. That is the whole product: UI and CLI writing the same files.

## Demo 1 — empty folder to first commit

**Machine:** your laptop. **Directory:** a throwaway project, not this repo.

```bash
mkdir /tmp/cpmk-demo-notes && cd /tmp/cpmk-demo-notes
git init -b main
# from a built checkout:
CPMK=/path/to/CPMK
node "$CPMK/dist/cli.js" init --name notes-demo
printf '\n.cpmk/generated/\n' >> .gitignore
node "$CPMK/dist/cli.js" remember "Use strict TypeScript" --type convention --tag typescript
node "$CPMK/dist/cli.js" remember "Never commit credentials" --type warning --tag security
node "$CPMK/dist/cli.js" session start --title "First sitting"
node "$CPMK/dist/cli.js" context --budget 800
git add .gitignore .cpmk
git status
```

**Expect**

- `git status` stages `config.json`, memory JSON, `.gitkeep` files, and `.gitignore`.
- `.cpmk/generated/` is **not** staged if the ignore line is present. Confirm with `git check-ignore -v .cpmk/generated/.gitkeep` — the keep file may still be tracked if you added it before the ignore; the generated **views** you create later must stay untracked.
- Safer first commit:

```bash
git add .gitignore .cpmk/config.json .cpmk/memory
git commit -m "Initialize demo memory"
node "$CPMK/dist/cli.js" status
```

`status` prints the project root, `main`, the new commit, and `dirty: no` (or `yes` if generated files appeared).

End the sitting:

```bash
node "$CPMK/dist/cli.js" session end "Demo 1 complete"
git add .cpmk/memory
git commit -m "Close first sitting"
ls .cpmk/generated
git status
```

**Expect** `handoff.md` under generated, and `git status` clean aside from that untracked (or ignored) view.

## Demo 2 — two clones, one remote

This is the “it works on my other machine” demo. You need a Git remote you can push to (a private GitHub repo, or a bare repo on disk).

### Variant A — bare repo on disk (no GitHub)

**Machine:** your laptop. Two work trees, one bare remote.

```bash
mkdir -p /tmp/cpmk-remote /tmp/cpmk-desk /tmp/cpmk-laptop
git init --bare /tmp/cpmk-remote/notes.git

cd /tmp/cpmk-desk
git clone /tmp/cpmk-remote/notes.git .
git checkout -b main
# if clone was empty:
git commit --allow-empty -m "root" && git push -u origin main

CPMK=/path/to/CPMK
node "$CPMK/dist/cli.js" init --name two-machine-demo
printf '\n.cpmk/generated/\n' >> .gitignore
node "$CPMK/dist/cli.js" remember "Desk and laptop share memory through Git" --type convention --tag git
node "$CPMK/dist/cli.js" session start --title "On the desk"
git add .gitignore .cpmk/config.json .cpmk/memory
git commit -m "Memory from the desk"
git push
```

Second work tree:

```bash
cd /tmp/cpmk-laptop
git clone /tmp/cpmk-remote/notes.git .
node "$CPMK/dist/cli.js" doctor
node "$CPMK/dist/cli.js" list
node "$CPMK/dist/cli.js" session resume "On the laptop"
node "$CPMK/dist/cli.js" remember "Laptop added a fact after pull" --type fact --tag git
node "$CPMK/dist/cli.js" session end "Laptop sitting done"
git add .cpmk/memory
git commit -m "Memory from the laptop"
git push
```

Back on the desk:

```bash
cd /tmp/cpmk-desk
git pull
node "$CPMK/dist/cli.js" list
node "$CPMK/dist/cli.js" search "laptop"
```

**Expect** the laptop fact and the closed laptop session/handoff to appear after `git pull`. No `cpmk sync` required when Git already fast-forwards.

### Variant B — GitHub

Same commands, with `git clone git@github.com:you/cpmk-two-machine-demo.git` instead of the bare path. Keep the remote **private**. Memory is project data.

## Demo 3 — same id, two edits (`cpmk sync`)

Git will conflict if two clones edit the **same** memory file. `cpmk sync` shows that as a merge-by-id preview.

Start from Demo 2 after both clones have the same commit. On the desk, edit one entry (copy an id from `cpmk list`):

```bash
cd /tmp/cpmk-desk
ID=$(node "$CPMK/dist/cli.js" list --json | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const a=JSON.parse(d);console.log(a.find(e=>e.type==='convention').id)})")
node "$CPMK/dist/cli.js" edit "$ID" --content "Desk rewrote this convention"
# do not push yet
```

On the laptop, edit the **same** id:

```bash
cd /tmp/cpmk-laptop
git pull   # only if desk has not pushed; if desk already diverged, skip
node "$CPMK/dist/cli.js" edit "$ID" --content "Laptop rewrote this convention"
```

Preview from the desk against the laptop directory:

```bash
cd /tmp/cpmk-desk
node "$CPMK/dist/cli.js" sync preview --from /tmp/cpmk-laptop
```

**Expect** a conflict for `$ID`. Apply writes `.cpmk/generated/sync-conflicts.json`. Resolve explicitly:

```bash
node "$CPMK/dist/cli.js" sync apply --from /tmp/cpmk-laptop
node "$CPMK/dist/cli.js" sync status
node "$CPMK/dist/cli.js" sync resolve "$ID" --keep local
```

`--keep incoming` takes the laptop text instead. This does not `git push`. You still commit the resolved JSON yourself.

Against a pushed branch, the same preview works without a second checkout:

```bash
node "$CPMK/dist/cli.js" sync preview --ref origin/main
```

## Demo 4 — Cursor brief without touching `.cursor/`

```bash
cd /tmp/cpmk-demo-notes   # or this repo
node "$CPMK/dist/cli.js" cursor generate
ls .cpmk/generated/cursor
git status
```

**Expect** `cpmk.mdc` and `context.md` under `.cpmk/generated/cursor/`, and those paths **untracked or ignored**. The default generate must not create or edit `.cursor/`.

To install the rule into Cursor yourself, copy the generated file to a path you choose, or rerun with `--output` pointed at a directory you own.

## Demo 5 — dashboard as the local app

```bash
cd /path/to/CPMK
npm run demo
```

**Click through**

1. **Memory** — filter `type` to `decision`. Archive nothing you still need. Add a fact from the form.
2. **Guide** — read §2 (desktop vs Git) and §7 (Git workflows).
3. **Demo** — this page.

**Expect** the session line at the top of Memory to match `cpmk session status`. Stop the process with Ctrl+C. The files remain. There is no daemon.

## Cleanup

```bash
rm -rf /tmp/cpmk-demo-notes /tmp/cpmk-remote /tmp/cpmk-desk /tmp/cpmk-laptop
```

Leave this repo's `.cpmk/` alone unless you intend to commit or reset the seeded demo.
