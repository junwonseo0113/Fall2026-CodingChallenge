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

On top of the base spec, the Unsplash integration is hardened rather than
just wired up: small compressed thumbnails in the search grid with a
full-resolution fetch only at save time, server-side caching of repeat
searches so the free tier's rate limit doesn't get burned through, smart
link resolution so pasting an Unsplash photo page (not just a raw image URL)
still resolves to the real asset and attribution, and required-by-license
photographer credit stored and shown on every saved item. See FEATURES below
for the full list.

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
   # "...or paste a link instead" field that works with no key at all for
   # a direct image URL or any page with an og:image (an Unsplash *page*
   # link still needs the key, since that goes through the Unsplash API).
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
     a link) and save a few, tag them, edit their captions, and remove one.
   - Click "Share" on a collection to toggle it public (grab the link and
     open it in an incognito window) or invite a second account (register
     a second user first) to collaborate on it.
   - Paste an Unsplash photo *page* URL (e.g. unsplash.com/photos/...) into
     the link field, not just a raw image URL -- it resolves through the
     Unsplash API for the full-res asset and attribution.

Note: since the default database is in-memory, restarting the server
resets all data. Set MONGODB_URI if you want data to persist.

------------------------------------------------------------
FEATURES
------------------------------------------------------------
Core
- Email/password accounts (JWT auth, bcrypt-hashed passwords)
- Create, rename, and delete collections
- Search Unsplash and save results into a collection, or paste a link
  directly (works with zero API key configured)
- Edit a saved item's note and remove items from a collection
- Search/filter within a collection by title, note, or tag
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
- One-touch tag chips (wallpaper / reference / profile) on saved items,
  with a quick filter row to browse a collection by tag

Unsplash integration, hardened (bonus)
- Thumbnail/full-res split: search results and grid tiles load a small,
  compressed render (w=400&q=70); the full-resolution asset is only
  fetched once an image is actually saved, not for every tile
- Search result caching: identical searches are cached server-side for
  5 minutes so retyped or repeated queries don't count twice against
  Unsplash's 50 req/hr free-tier rate limit
- Smart link resolution (GET /api/resolve-url): pasting an Unsplash photo
  *page* URL (not just a raw image URL) resolves through the Unsplash API
  for the real high-res asset and attribution; a direct image link (with
  or without a file extension) passes through via a Content-Type sniff;
  any other page has its og:image scraped as a last resort. Blocks
  loopback/private-network hosts.
- Photographer attribution: "Photo by X on Unsplash" is stored and shown
  on every item sourced from Unsplash, per their API usage guidelines.
- Download tracking: saving an Unsplash-sourced item pings its
  download_location URL once, so it counts toward the photographer's
  download stats as Unsplash's API guidelines require.
- Color palette: Unsplash's own per-photo dominant-color swatch is carried
  through search results, saved items, and pasted Unsplash links. It shows
  as an instant loading placeholder behind thumbnails/saved images and as a
  small hex-code chip on each saved item (click to copy).

Today's visual (bonus)
- A banner on the dashboard picks one Unsplash photo matched to your local
  time of day (morning/sunset/night/etc.) and, if you grant location
  permission, the current weather there (e.g. a rainy evening surfaces a
  moody "rain sunset golden hour" pick) via Open-Meteo -- a free weather API
  that needs no signup or API key, so this works with zero extra setup.
  Location is entirely optional; declining it just falls back to
  time-of-day only. The pick is stable for the day (not re-randomized on
  every reload) and can be saved straight into any of your collections from
  the banner itself.

Wallpaper preview
- A "preview as wallpaper" button on every saved item opens a phone-bezel
  mockup (drawn with CSS, no image assets needed) showing that image as a
  lock-screen wallpaper, cropped to the screen's aspect ratio, with a real
  live clock and today's date overlaid on top -- so you can judge how an
  image would actually look as a wallpaper before committing to it.

Save to device
- A download button on every saved item fetches the image and either
  hands it to the OS share sheet (Web Share API, where supported -- the
  share sheet itself is the real "save to Photos" permission prompt) or
  triggers a browser download otherwise. If the source host blocks
  cross-origin fetches, it opens the image in a new tab instead of
  breaking, so there's always a way to save it.

------------------------------------------------------------
REFLECTION (under 100 words)
------------------------------------------------------------
I started knowing less than this project probably required. I could
draw on my FastAPI experience for REST design, but Express, MongoDB,
and JWT were new to me, and I only understood most of what I built
after breaking it. A shared route leaked items the interface already
superficially hid, and Tailwind rules overrode every border until I
inspected computed styles. Neither was visible from reading code,
only from actually running it. I finished the project less confident
in what I knew going in, and more confident in how I find things out.

------------------------------------------------------------
FEEDBACK ON THE CHALLENGE
------------------------------------------------------------
The rubric has two spots where the header and the listed points don't
match: "Core Features" is headed "up to 3 points" but lists a 5-point
tier, and "Data Handling" says "up to 5" but maxes out at 3. The ~5
hour estimate also reads like it's scoped to a baseline version rather
than one built toward the higher tiers. That said, the open-ended spec
was the best part of the challenge -- deciding what to build beyond
the base requirements is what pushed me to actually improve.
