# Bruno Nakano Portfolio - Deployment Guide

## Project Overview
This is a sophisticated portfolio website for Bruno Nakano, Creative Director @ Meta. The site features:

- **Brutalist Digital Minimalism** design aesthetic
- **455 images** and **31 videos** integrated into the portfolio
- **Multiple navigation modes**: Folder-based and physics ball interactive
- **Responsive design** for desktop and mobile
- **Draggable window system** for content display
- **Media size slider** for adjusting content display
- **Live clock** showing Pacific Time
- **Wave animation** on the name header

## Technology Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS 4 + PostCSS
- **Backend**: Node.js (Express-like server)
- **Build Tool**: Vite 7 + esbuild
- **Package Manager**: pnpm

## Project Structure
```
brunonakano-portfolio/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components (Home, NotFound)
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # React contexts (Theme, Experience)
│   │   └── lib/              # Utilities and helpers
│   ├── public/
│   │   └── assets/           # All portfolio media (images & videos)
│   └── index.html            # HTML entry point
├── server/                   # Node.js backend
├── shared/                   # Shared utilities
├── assets/                   # Original asset files (backup)
├── dist/                     # Production build output
│   ├── public/              # Static files (HTML, CSS, JS, assets)
│   └── index.js             # Server entry point
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite configuration
└── tsconfig.json            # TypeScript configuration
```

## Build & Deployment

### Local Development
```bash
cd /home/ubuntu/brunonakano-portfolio
pnpm install
pnpm run dev
# Server runs on http://localhost:3000
```

### Production Build
```bash
cd /home/ubuntu/brunonakano-portfolio
pnpm run build
# Output: dist/ folder with optimized production files
```

### Start Production Server
```bash
cd /home/ubuntu/brunonakano-portfolio
NODE_ENV=production pnpm run start
# Server runs on http://localhost:3000
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)
Create a `Dockerfile`:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm run build
EXPOSE 3000
CMD ["NODE_ENV=production", "pnpm", "start"]
```

Build and run:
```bash
docker build -t bruno-portfolio .
docker run -p 3000:3000 bruno-portfolio
```

### Option 2: Vercel/Netlify
1. Push to GitHub
2. Connect repository to Vercel/Netlify
3. Set build command: `pnpm run build`
4. Set start command: `NODE_ENV=production pnpm start`
5. Deploy

### Option 3: AWS/DigitalOcean/Heroku
1. Build the project locally: `pnpm run build`
2. Upload `dist/` folder to your server
3. Install Node.js on server
4. Run: `NODE_ENV=production node dist/index.js`
5. Use PM2 or systemd for process management

### Option 4: Static Hosting (GitHub Pages, Netlify Static)
The frontend can be deployed as static files:
```bash
# Build frontend only
cd client
pnpm run build
# Upload dist/public to your static host
```

## Environment Variables
The project uses the following environment variables (already configured):
- `VITE_APP_TITLE`: "Bruno Nakano — Portfolio"
- `VITE_APP_ID`: Manus app ID
- `VITE_OAUTH_PORTAL_URL`: OAuth portal URL
- `NODE_ENV`: Set to "production" for production builds

## Asset Management
- **Total size**: ~607 MB (455 images + 31 videos)
- **Location**: `client/public/assets/`
- **Included in build**: Yes (all assets are bundled)
- **Served from**: `/assets/` path in production

## Performance Considerations
- **Bundle size**: ~576 KB (gzipped: 174 KB) for JavaScript
- **CSS size**: ~113 KB (gzipped: 18 KB)
- **Total assets**: ~607 MB (media files)
- **Recommendation**: Use CDN for asset delivery in production

## Troubleshooting

### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

### Assets Not Loading
- Ensure `client/public/assets/` exists and contains media files
- Run `pnpm run build` to rebuild
- Check browser DevTools Network tab for 404 errors

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run build
```

## Maintenance

### Adding New Projects
Edit `client/src/components/FolderContent.tsx` to add new portfolio items.

### Updating Content
- Modify React components in `client/src/`
- Add new assets to `client/public/assets/`
- Rebuild: `pnpm run build`

### Monitoring
- Check server logs: `NODE_ENV=production pnpm start`
- Monitor performance with browser DevTools
- Use analytics (Umami configured in HTML)

## Support & Documentation
- Vite: https://vitejs.dev
- React: https://react.dev
- TailwindCSS: https://tailwindcss.com
- TypeScript: https://www.typescriptlang.org

## License & Credits
Portfolio for Bruno Nakano, Creative Director @ Meta
Built with React, Vite, and TailwindCSS
