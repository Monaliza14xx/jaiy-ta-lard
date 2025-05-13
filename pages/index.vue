<template>
  <div class="bg-base-200 p-4 min-h-screen">
    <!-- <h1 class="text-2xl font-bold mb-4">📦 Barcode Scanner & Cart</h1> -->

    <div class="flex gap-2 mb-4">
      <button @click="openScanner('product')" class="btn btn-success">📷 Scan Product</button>
      <button @click="openScanner('add')" class="btn btn-warning">➕ Scan to Add Barcode</button>
    </div>

    <div class="mb-2">
      <label for="currency" class="mr-2 font-medium">Currency:</label>
      <select v-model="selectedCurrency" @change="saveCurrency" class="select select-bordered max-w-xs">
        <option value="USD">$ (USD)</option>
        <option value="THB">฿ (THB)</option>
        <option value="LAK">₭ (LAK)</option>
        <option value="JPY">¥ (JPY)</option>
      </select>
    </div>

    <div class="mb-4 flex items-center gap-4">
      <label class="label cursor-pointer">
        <span class="label-text">Group Cart Mode</span>
        <input type="checkbox" class="toggle" v-model="groupMode">
      </label>
      <div v-if="groupMode" class="flex flex-wrap gap-2 items-center">
        <input v-model="currentBuyer" type="text" placeholder="New buyer name" class="input input-bordered input-sm w-40" />
        <button class="btn btn-sm btn-accent" @click="switchBuyer">➕ Add / Switch</button>
        <select v-model="currentBuyer" class="select select-sm select-bordered">
          <option disabled value="">Select buyer</option>
          <option v-for="(cart, name) in groupCarts" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>
    </div>

    <div role="tablist" class="tabs tabs-bordered mb-6">
      <a role="tab" :class="['tab', activeTab === 'cart' ? 'tab-active' : '']" @click="activeTab = 'cart'">🛒 Cart</a>
      <a role="tab" :class="['tab', activeTab === 'product' ? 'tab-active' : '']" @click="activeTab = 'product'">📋 Product Management</a>
    </div>

    <div v-if="activeTab === 'cart'">
      <h2 class="text-xl font-semibold mb-2">🛒 Cart</h2>
      <ul :class="['space-y-2 overflow-y-auto', cart.length >= 4 ? 'max-h-96 pr-1' : '']">
        <li v-for="(item, index) in cart" :key="index" class="card card-side bg-base-100 shadow p-4 justify-between items-center">
          <div>
            <div class="font-bold text-lg">
              {{ item.name }}
              <select v-model="item.buyer" class="select select-xs select-bordered ml-2">
                <option value="">Unassigned</option>
                <option v-for="(cart, name) in groupCarts" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
            <div class="text-sm text-gray-500">{{ currencyMap[item.currency || selectedCurrency] }}{{ item.price.toFixed(2) }}</div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="changeQty(index, -1)" class="btn btn-sm btn-outline">-</button>
            <span>{{ item.qty }}</span>
            <button @click="changeQty(index, 1)" class="btn btn-sm btn-outline">+</button>
            <button @click="changeQty(index, -999)" class="btn btn-sm btn-error text-white">🗑</button>
          </div>
        </li>
      </ul>
      <div class="text-right mt-2 font-bold text-lg">Total: {{ currencyMap[selectedCurrency] }}{{ totalPrice.toFixed(2) }}</div>
      <div v-if="groupMode" class="mt-2 text-sm">
        <div v-for="(total, name) in buyerTotals" :key="name">
          {{ name }}: {{ currencyMap[selectedCurrency] }}{{ total.toFixed(2) }}
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'product'">
      <h2 class="text-xl font-semibold mb-2">📋 Product Management</h2>
      <form @submit.prevent="saveProduct" class="flex flex-wrap gap-2 items-end">
        <input v-model="productForm.name" type="text" placeholder="Name" class="input input-bordered w-full max-w-xs" required />
        <input v-model="productForm.barcode" type="text" placeholder="Barcode" class="input input-bordered w-full max-w-xs" required />
        <button type="button" @click="openScanner('add')" class="btn btn-outline">📷</button>
        <input v-model.number="productForm.price" type="number" placeholder="Price" step="0.01" class="input input-bordered w-full max-w-xs" required />
        <button type="submit" class="btn btn-primary">Add/Update</button>
      </form>

      <ul class="space-y-2 mt-4">
        <li v-for="(item, code) in products" :key="code" class="flex justify-between items-center bg-base-100 p-2 rounded shadow">
          <div>
            <strong>{{ item.name }}</strong> | {{ code }} | {{ currencyMap[item.currency || selectedCurrency] }}{{ item.price }}
          </div>
          <div>
            <button @click="editProduct(code)" class="btn btn-sm btn-info mr-2">Edit</button>
            <button @click="deleteProduct(code)" class="btn btn-sm btn-error">Delete</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Scanner Overlay -->
    <div v-if="scanning" class="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div class="relative w-full max-w-md h-64 bg-white rounded overflow-hidden">
        <div id="camera" class="w-full h-full bg-black relative">
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div :class="['border-4 rounded w-3/4 h-20', scanSuccess ? 'border-green-500' : 'border-white']"></div>
          </div>
        </div>
        <button @click="closeScanner" class="absolute top-2 right-2 btn btn-sm btn-error">✖</button>
        <button @click="confirmScan" class="absolute bottom-2 left-1/2 transform -translate-x-1/2 btn btn-primary">✅ Confirm Scan</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, nextTick } from 'vue'

const cart = ref([])
const products = ref({})
if (process.client) {
  products.value = JSON.parse(localStorage.getItem('products') || '{}')
}
const selectedCurrency = ref(process.client ? (localStorage.getItem('currency') || 'USD') : 'USD')
const scanMode = ref('product')
const scanning = ref(false)
let lastScannedCode = ''
let scanCooldown = false
const scannedCode = ref('')
const currencyMap = { USD: '$', THB: '฿', LAK: '₭', JPY: '¥' }
const productForm = ref({ name: '', barcode: '', price: 0 })
const scanSuccess = ref(false)
const activeTab = ref('cart')

const groupMode = ref(false)
const groupCarts = ref({})
const currentBuyer = ref('')

const saveCurrency = () => {
  if (process.client) {
    localStorage.setItem('currency', selectedCurrency.value)
  }
}

const getCart = () => {
  return cart.value
}

const totalPrice = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.price * item.qty, 0)
})

const buyerTotals = computed(() => {
  const totals = {}
  for (const item of cart.value) {
    const name = item.buyer || 'Unassigned'
    if (!totals[name]) totals[name] = 0
    totals[name] += item.price * item.qty
  }
  return totals
})

const saveProduct = () => {
  const { name, barcode, price } = productForm.value
  if (name && barcode && price >= 0) {
    products.value[barcode] = { name, price, currency: selectedCurrency.value }
    if (process.client) {
      localStorage.setItem('products', JSON.stringify(products.value))
    }
    productForm.value = { name: '', barcode: '', price: 0 }
  }
}

const deleteProduct = code => {
  delete products.value[code]
  if (process.client) {
    localStorage.setItem('products', JSON.stringify(products.value))
  }
}

const editProduct = code => {
  const item = products.value[code]
  if (item) productForm.value = { name: item.name, barcode: code, price: item.price }
}

const changeQty = (index, delta) => {
  cart.value[index].qty += delta
  if (cart.value[index].qty <= 0) cart.value.splice(index, 1)
}

const addToCart = code => {
  const item = products.value[code]
  if (!item) return alert('Product not found')
  const existing = cart.value.find(i => i.code === code && i.buyer === currentBuyer.value)
  if (existing) {
    existing.qty += 1
  } else {
    cart.value.push({ code, name: item.name, price: item.price, qty: 1, buyer: currentBuyer.value || '' })
  }
}

const switchBuyer = () => {
  const name = currentBuyer.value.trim()
  if (!name) return
  if (!groupCarts.value[name]) {
    groupCarts.value[name] = {}
  }
  currentBuyer.value = name
}

const openScanner = mode => {
  scanMode.value = mode
  scanning.value = true
  scanSuccess.value = false
  nextTick(() => startScanner())
}

const closeScanner = () => {
  scanning.value = false
  if (window.Quagga) {
    Quagga.stop()
    Quagga.offDetected()
  }
}

const startScanner = () => {
  if (!window.Quagga) return alert('Quagga not loaded')
  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: document.querySelector('#camera'),
      constraints: {
        width: 640,
        height: 480,
        facingMode: 'environment'
      }
    },
    locator: {
      patchSize: 'large',
      halfSample: true
    },
    decoder: {
      readers: ['ean_reader', 'code_128_reader', 'ean_8_reader']
    },
    frequency: 10,
    debug: {
      drawBoundingBox: true,
      showFrequency: true,
      drawScanline: true,
      showPattern: true
    }
  }, err => {
    if (err) {
      console.error('[Quagga init error]', err)
      return
    }
    Quagga.start()
  })

  Quagga.onDetected(data => {
    if (scanCooldown) return
    scanCooldown = true
    setTimeout(() => (scanCooldown = false), 1000)

    console.log('[SCAN]', data.codeResult.code)
    lastScannedCode = String(data.codeResult.code).trim()
  })
}

const confirmScan = () => {
  if (!lastScannedCode) return
  if (scanMode.value === 'product') {
    addToCart(lastScannedCode)
    scanSuccess.value = true
  } else {
    productForm.value.barcode = lastScannedCode
  }
  closeScanner()
  lastScannedCode = ''
}

onMounted(() => {
  if (process.client) {
    // rehydrate product form currency
    Object.values(products.value).forEach(p => {
      if (!p.currency) p.currency = selectedCurrency.value
    })
  }
})
</script>