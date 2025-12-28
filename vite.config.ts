import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變數 (包含 .env 檔案與 Vercel 系統變數)
  // 第三個參數 '' 表示載入所有變數，不限制 VITE_ 前綴
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // 將 process.env.API_KEY 替換為實際的字串值
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // 防止程式碼中其他地方存取 process.env 導致報錯
      'process.env': {}
    },
  };
});