<template>
  <div class="min-h-screen flex flex-col bg-base-200 text-base-content">
    <header class="navbar bg-base-100 shadow mb-4">
      <div class="flex justify-between items-center w-full px-4">
        <div class="text-xl font-bold">📦 ຈ່າຍຕະຫຼາດ</div>
        <label class="swap swap-rotate">
          <input
            type="checkbox"
            class="theme-controller"
            @change="toggleTheme"
            v-model="isDark"
          />
          <img
            class="swap-off w-6 h-6"
            src="https://cdn-icons-png.flaticon.com/512/869/869869.png"
            alt="Dark mode icon"
          />
          <img
            class="swap-on w-6 h-6"
            src="https://cdn-icons-png.flaticon.com/512/740/740878.png"
            alt="Light mode icon"
          />
        </label>
      </div>
    </header>
    <main class="px-4 flex-grow">
      <NuxtPage />
    </main>
    <footer class="footer footer-center p-4 bg-base-100 text-base-content border-t">
      <aside>
        <p>© 2025 ຈ່າຍຕະຫຼາດ - Khonepaseuth SOUNAKHEN</p>
      </aside>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isDark = ref(true)

const toggleTheme = (e) => {
  const theme = e.target.checked ? 'dark' : 'light'
  isDark.value = e.target.checked
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

onMounted(() => {
  const saved = localStorage.getItem('theme') || 'light'
  document.documentElement.setAttribute('data-theme', saved)
  isDark.value = saved === 'dark'
})
</script>