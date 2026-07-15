# Bruno Nakano Portfolio — Deployment Guide

## Quick Start (New Manus Account)

1. Create a new **web-static** project in Manus
2. Upload all files from this ZIP into the project
3. Run `pnpm install` then `pnpm dev` to preview locally
4. All media assets are in `/assets/` — no external URLs needed

## Assets Included
All images, GIFs, and mp4 files have been downloaded and placed in `/assets/`.
Source code URLs have been rewritten to reference `/assets/<filename>` directly.

## Session-Scoped Files (Need Re-upload)
The following files could NOT be exported (they are session-scoped to the original account).
You will need to re-upload them from your original files:

- GKOKBBEWJWOgIKmz.jpg  (Brand/Design carousel)
- cZcqAGSLyHGmMNHg.jpg  (Brand/Design carousel)
- DdGJGfqxUWJTHCvJ.jpg  (Brand/Design carousel)
- FyqHMqmvjjxhqjPy.jpg  (Brand/Design carousel)
- TfvUmqLWOOlhEAjb.jpg  (Brand/Design carousel)
- nqTQwxGwGYLVJlON.jpg  (Brand/Design carousel)
- YHDCxKvJYJPpCLqe.jpg  (Brand/Design carousel)
- sm_ceramics_vid_5353fdc9.gif  (Studio Mano)
- sm_drop2_6ab62b2d.gif         (Studio Mano)

After uploading, run `manus-upload-file --webdev <file>` for each and update the URLs
in `client/src/components/FolderContent.tsx`.

## Stack
- React 19 + TypeScript
- Tailwind CSS 4
- Vite 7
- Wouter (routing)
- shadcn/ui components
