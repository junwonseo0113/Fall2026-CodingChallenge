CHANGE++ FALL 2026 CODING CHALLENGE
Pinboard - an image saving/sharing app

Name: Junwon Seo
Vanderbilt email: junwon.seo@vanderbilt.edu

------------------------------------------------------------
WHAT THIS IS
------------------------------------------------------------
A Pinterest-style app for discovering, saving, and organizing images into
shareable collections ("boards"). Users can create an account, build
collections, search Unsplash for images and save them into a collection,
edit/remove saved items, and share a collection either as a public read-only
link or by inviting specific accounts to collaborate and edit it together.

------------------------------------------------------------
TECH STACK
------------------------------------------------------------
Frontend: React + TypeScript (Vite), Tailwind CSS, shadcn/ui-style
          components built on Radix primitives, react-router-dom
Backend:  Node.js + Express + TypeScript, MongoDB via Mongoose,
          JWT auth, bcrypt password hashing
Images:   Unsplash API (proxied through the backend so the API key
          never reaches the browser)

The database is MongoDB. By default the server automatically spins up an
in-memory MongoDB instance on boot (via mongodb-memory-server), so there is
ZERO database setup required to run this project -- just install
dependencies and start the server. If you'd rather use a persistent
database, set MONGODB_URI in server/.env to a MongoDB Atlas connection
string (or a local mongod) and the server will use that instead.

------------------------------------------------------------
HOW TO RUN IT
------------------------------------------------------------
Requirements: Node.js 18+ and npm.

1) Backend
   cd server
   npm install
   cp .env.example .env
   # Open .env and set UNSPLASH_ACCESS_KEY (free key from
   # https://unsplash.com/oauth/applications). Everything else has a
   # working default -- image search just won't return results without it.
   npm run dev
   # Server starts on http://localhost:4000

2) Frontend (in a second terminal)
   cd client
   npm install
   npm run dev
   # App opens on http://localhost:5173 (Vite will pick the next free
   # port if that one is taken -- check the terminal output)

The frontend dev server proxies /api requests to the backend, so no extra
configuration is needed to connect them locally.

3) Try it out
   - Register an account, create a collection, search for images and save
     a few, edit their captions, and remove one.
   - Click "Share" on a collection to toggle it public (grab the link and
     open it in an incognito window) or invite a second account (register
     a second user first) to collaborate on it.

Note: since the default database is in-memory, restarting the server
resets all data. Set MONGODB_URI if you want data to persist.

------------------------------------------------------------
FEATURES
------------------------------------------------------------
- Email/password accounts (JWT auth, bcrypt-hashed passwords)
- Create, rename, and delete collections
- Search Unsplash and save results into a collection
- Edit a saved item's note and remove items from a collection
- Invite other accounts as collaborators who can add/edit/remove items
- Public/private toggle per collection with a shareable read-only link
- Live "last activity" indicator (who added/edited/removed an item, and
  when) so collaborators can see recent changes
- Optimistic UI updates when saving an image (appears instantly, rolls
  back if the request fails)
- Infinite-scroll image search results
- Responsive, Pinterest-style masonry layout

------------------------------------------------------------
REFLECTION (under 100 words)
------------------------------------------------------------
[YOUR REFLECTION HERE -- did you learn anything new, reinforce any known
concepts, run into any issues?]

------------------------------------------------------------
FEEDBACK ON THE CHALLENGE
------------------------------------------------------------
[YOUR FEEDBACK HERE -- thoughts on the workshops, office hours, or the
challenge itself]
