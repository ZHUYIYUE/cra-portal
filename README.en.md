# CRA Portal

CRA Portal is a lightweight web tool for CRA clinical trial operations. It helps manage projects, sites, tasks, findings, and ethics submission letters.

## Current Architecture

- Frontend: static `HTML + CSS + vanilla JavaScript`
- Backend: Supabase (PostgreSQL + Storage, accessed directly from the browser)
- Hosting: GitHub Pages (`gh-pages` branch)
- Word generation: `docxtemplater + PizZip + FileSaver`

## Production Site

https://zhuyiyue.github.io/cra-portal/

## Key Folders

```text
index.html          # Static entry point
static/             # Frontend styles and business JS
supabase/           # Database SQL scripts
deploy.bat          # Windows deployment helper
HANDOVER.md         # Detailed handover notes
legacy-flask/       # Archived Flask/JSON implementation
```

## Deployment

See `部署指南.md`.

## Notes

- There is no build step.
- Supabase publishable key is public in the frontend; current RLS policy is open for internal-tool usage.
- `center_count` is computed at read time and is not a database column.
- Word templates should be modified from the original `.docx` files to preserve header/footer/layout formatting.