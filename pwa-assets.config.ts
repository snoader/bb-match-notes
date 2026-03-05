import { defineConfig, minimal2023Preset, createAppleSplashScreens } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  images: ['public/icon-master.png'],

  headLinkOptions: {
    preset: '2023',
  },

  preset: {
    ...minimal2023Preset,

    appleSplashScreens: createAppleSplashScreens({
      resizeOptions: {
        background: 'white',
        fit: 'contain',
      },
    }),
  },
})
