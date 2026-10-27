import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

const envFile = path.resolve(process.cwd(), '.env');
const env = fs.existsSync(envFile)
  ? dotenv.parse(fs.readFileSync(envFile))
  : (process.env as Record<string, string>);

export default defineConfig({
  plugins: [
    tailwindcss(),
    hydrogen(),
    oxygen({env}),
    reactRouter(),
    tsconfigPaths(),
  ],
  server: {
    host: '0.0.0.0',
    port: 4050,
    allowedHosts: ['localhost', '127.0.0.1', 'chollodesierto.com', 'www.chollodesierto.com', 'zkowo4gss0wkw0wccgoo4s0c.46.224.13.143.sslip.io'],
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      include: ['set-cookie-parser', 'cookie', 'react-router'],
    },
  },
});
