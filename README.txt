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

On top of the base spec, collections can also be turned into "time capsules":
locked until a chosen date and/or until a viewer proves (via their browser's
location) they're near a chosen spot, with voice memos attached to individual
photos that stay completely blind -- hidden from everyone but the owner,
including from the person who added them -- until the capsule unlocks. See
FEATURES below for the full list.

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
   # https://unsplash.com/oauth/applications) if you want the search tab to
   # return real results. Everything else has a working default. If you'd
   # rather skip getting a key, the "Add images" dialog also has a
   # "...or paste an image URL directly" field that works with no key at all.
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
   - Register an account, create a collection, search for images (or paste
     a URL) and save a few, edit their captions, and remove one.
   - Click "Share" on a collection to toggle it public (grab the link and
     open it in an incognito window) or invite a second account (register
     a second user first) to collaborate on it.
   - To see the time-capsule side: when creating a collection, set a
     "Time-lock until" date a minute or two in the future and/or click
     "Use my current location" to add a location-lock. Open the collection
     as a second (collaborator) account -- you'll see a live countdown and/or
     a "verify my location" prompt instead of the contents. That second
     account can still add photos and record a voice note (mic icon on a
     saved item) while locked -- they just won't see what they added until
     it unlocks. Once it does, a "Play our radio" button appears and plays
     every voice note back to back.

Note: since the default database is in-memory, restarting the server
resets all data. Set MONGODB_URI if you want data to persist.

------------------------------------------------------------
FEATURES
------------------------------------------------------------
Core
- Email/password accounts (JWT auth, bcrypt-hashed passwords)
- Create, rename, and delete collections
- Search Unsplash and save results into a collection, or paste an image
  URL directly (works with zero API key configured)
- Edit a saved item's note and remove items from a collection
- Search/filter within a collection by title or note
- Invite other accounts as collaborators who can add/edit/remove items
- Public/private toggle per collection with a shareable read-only link
- Dark / light theme toggle, persisted per browser

Reliability & UX
- Live "last activity" indicator (who added/edited/removed an item, and
  when) so collaborators can see recent changes, via lightweight polling
- Optimistic UI updates when saving an image (appears instantly, rolls
  back if the request fails)
- Infinite-scroll image search results
- Responsive, Pinterest-style masonry layout

Time-capsule mode (bonus)
- Time-lock: set a future unlock date on a collection. Until then, only
  the owner can see its contents -- everyone else sees a live countdown.
- Location-lock: require a viewer to be within a chosen radius (proven via
  the browser's Geolocation API) before they can see a collection's
  contents. Works alongside or instead of the time-lock.
- Blind uploads: while locked, collaborators can still add photos (and
  voice notes) to the collection -- they just can't see the collection's
  contents themselves, not even what they just added, until it unlocks.
- Voice notes: record a short voice memo (with rotating prompt cards) on
  any saved item straight from the browser's microphone; no external
  service, just the standard MediaRecorder API.
- Radio playback: once a collection unlocks, a "Play our radio" button
  plays every voice note back to back like a little broadcast.
- Participation indicator: shows how many members have added something to
  a locked collection ("3 / 4 sealed") without revealing who or what, so
  the blind seal isn't spoiled.

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
