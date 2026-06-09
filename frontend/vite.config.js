import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function removeModuleType() {
  return {
    name: 'remove-module-type',
    closeBundle() {
      const htmlPath = path.resolve(__dirname, 'dist/index.html');
      if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf-8');
        html = html.replace(/ type="module"/g, ' defer').replace(/ crossorigin/g, '');
        fs.writeFileSync(htmlPath, html);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), removeModuleType()],
  base: './',
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'KanbanApp',
        inlineDynamicImports: true
      }
    }
  }
});
