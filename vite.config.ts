import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { assertProductionEnv } from './config/buildEnv.ts'

export default defineConfig(({ command, mode }) => {
  // Fail the build, not the users: a production bundle without a usable API URL can't work.
  if (command === 'build' && mode === 'production') {
    assertProductionEnv({ ...loadEnv(mode, process.cwd(), ''), ...process.env })
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          // React and the router are needed by every visit and change far less often than our code:
          // in their own file, a new release doesn't make returning users download them again.
          // MUI is deliberately NOT grouped: its pieces stay with the pages that use them.
          codeSplitting: {
            groups: [
              { name: 'react-vendor', test: /node_modules[/\\](react|react-dom|scheduler|react-router|react-router-dom)[/\\]/ },
            ],
          },
        },
      },
    },
  }
})
