import { appsInToss } from '@apps-in-toss/framework/plugins';
import { router } from '@granite-js/plugin-router';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'myfarm',
  scheme: 'intoss',
  entryFile: './src/_app.tsx',
  plugins: [
    router(),
    appsInToss({
      brand: {
        displayName: '반려동물 모으기',
        primaryColor: '#FFB84D',
        icon: 'https://static.toss.im/appsintoss/28423/b8ac9f62-9011-4264-be7f-af20fd49fe4c.png',
      },
      permissions: [],
      navigationBar: {
        withBackButton: true,
        withHomeButton: false,
      },
    }),
  ],
});
