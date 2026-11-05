# WhoOwes

Split shared expenses with friends. Make a group, send friends the link, and everyone sees the same balances. It installs on phones as an app (PWA).

## What's inside

| Path | What it is |
|---|---|
| `public/` | The app people see (one page), its icon and the files that make it installable |
| `api/group.js` | Server: load one group, save a change |
| `api/groups.js` | Server: create a group, load your list of groups |
| `lib/` | Rules for checking data, and the MongoDB connection |
| `dev-server.js` | Only for testing on a computer (`npm run dev`); Vercel doesn't use it |

## Deploy on Vercel (free)

1. Put these files in a GitHub repository (the root of the repo should contain `package.json`).
2. On vercel.com: **Add New → Project →** import the repository. Leave every setting at its default.
3. Before clicking Deploy, open **Environment Variables** and add:
   - Name: `MONGODB_URI`
   - Value: `mongodb+srv://surajreddyp_db_user:YOUR_PASSWORD@whoowes.ladrfmc.mongodb.net/?retryWrites=true&w=majority&appName=Whoowes`
4. Click **Deploy**. Your app's link is shown when it finishes.

MongoDB Atlas → **Network Access** must allow `0.0.0.0/0`, because Vercel's servers don't have a fixed address.

The password goes only in Vercel's Environment Variables, never in the code or on GitHub.
If your password contains symbols such as `@ : / ? # %`, use one with only letters and numbers (Atlas "Autogenerate" does that).

## How sharing works

Each group has a long random link, for example `https://your-app.vercel.app/#g-k3x9...`. Anyone with the link can view the group and add expenses, the same way Tricount works. There are no accounts. Each phone remembers its own groups and which person you are.

## Test locally

```
npm install
npm run dev     # uses a temporary in-memory database
```
Open http://localhost:3000
