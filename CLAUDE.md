# AI Agent Instructions for Awwwards Landing Page Template

This file provides guidance for AI coding agents customizing this Next.js landing page template.

## Quick Start

1. **Pages**: Edit files in `app/` or `pages/` directory
2. **Components**: Customize components for UI changes
3. **Styling**: Uses Tailwind CSS or custom styles

---

## Files to MODIFY (Customize These)

### Pages
| Location | Purpose |
|----------|---------|
| `app/page.tsx` or `pages/index.tsx` | Landing page |

### Assets
| Location | Purpose |
|----------|---------|
| `public/` | Images, favicon |

---

## Build and Test

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## Deployment Notes

For static export, add to `next.config.js`:

```javascript
module.exports = {
  output: 'export',
  images: { unoptimized: true }
};
```

Output goes to `out/` folder.
