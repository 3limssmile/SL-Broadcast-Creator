import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { PAGES, SITE } from './src/pages.js'

const escape = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function pageMeta(html, { title, description, url }) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${escape(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${escape(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
}

function staticPages() {
  let outDir
  return {
    name: 'static-pages',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const html = readFileSync(resolve(outDir, 'index.html'), 'utf8')
      for (const [path, page] of Object.entries(PAGES)) {
        const out = pageMeta(html, { title: `${page.title} | SCP:SL Admin Tools`, description: page.description, url: `${SITE}/${path}` })
        writeFileSync(resolve(outDir, `${path}.html`), out)
      }
      writeFileSync(resolve(outDir, '404.html'), html)
      const urls = ['', ...Object.keys(PAGES)].map(p => `  <url><loc>${SITE}/${p}</loc></url>`).join('\n')
      writeFileSync(resolve(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
    },
  }
}

export default defineConfig({
  plugins: [react(), staticPages()],
  base: '/',
  build: { chunkSizeWarningLimit: 700 },
})
