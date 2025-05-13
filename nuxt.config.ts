// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  app: {
    head: {
      title: 'Barcode Scanner Cart',
      script: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.js', defer: true }
      ]
    }
  }
})