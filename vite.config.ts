import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// 源码统一在 src/ 下：模块（modules/）、页面（views/）、跨端共享（utils/）
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 仓库内美术 / 音频资源（不在用户数据目录）
      '@resources': path.resolve(__dirname, './resources'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 开发时也走后端托管的本地插件缓存
      '/plugins': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 服务端产物在 dist/server/，这里只产出前端，互不覆盖
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});