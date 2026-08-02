# Dopa News

Your daily good news.

Public Phase 1 MVP of the **Good News Platform**.

- **Site:** [https://dopa.news](https://dopa.news)
- **Repo:** `WebSite_Dopa_News`

AI assistants and the Phase 1 collection pipeline gather and prepare stories. Humans approve what gets published.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Editorial desk: [http://localhost:3000/admin](http://localhost:3000/admin)

Collect from configured RSS sources:

```bash
npm run collect
```

## Deploy to dopa.news (Namecheap + Vercel)

### What is Vercel?

Vercel is a hosting platform built for Next.js websites. You connect your GitHub repo; Vercel builds and hosts the site, then gives you HTTPS. Your Namecheap domain (`dopa.news`) points to Vercel with DNS records.

Namecheap = where you own the domain.  
Vercel = where the website runs.  
GitHub = where the code lives.

### Namecheap DNS (after Vercel shows your records)

1. Namecheap → **Domain List** → `dopa.news` → **Manage**
2. Open **Advanced DNS**
3. Remove parking / old `@` and `www` records that conflict
4. Add the records Vercel shows (typical values):

| Type | Host | Value | TTL |
|------|------|--------|-----|
| A Record | `@` | `76.76.21.21` | Automatic |
| CNAME Record | `www` | `cname.vercel-dns.com` | Automatic |

5. Save and wait until Vercel marks the domain **Valid** (can take minutes to hours)

### Before going public

- Protect `/admin` with authentication
- Connect **Vercel Blob** (Storage → Blob → connect to project) so search/publish persist via `BLOB_READ_WRITE_TOKEN`
- Or set `STORE_GITHUB_TOKEN` with repo write access to persist `data/store.json` via GitHub

## Project docs

- `Good_News_Knowledge_Platform_Project_Definition.md` — master project definition
