import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'tldraw/src/test/TestEditor': path.resolve(
        __dirname,
        './node_modules/tldraw/src/test/TestEditor.ts'
      ),
    },
  },
})
