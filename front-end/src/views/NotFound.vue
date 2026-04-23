<template>
  <div class="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
    <p class="text-8xl font-bold text-gray-100 select-none">404</p>
    <h1 class="text-xl font-bold text-gray-800 mt-4">{{ $t('404.title') }}</h1>
    <p class="text-gray-400 text-sm mt-2">{{ $t('404.sub') }}</p>
    <router-link
      to="/"
      class="mt-8 inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors"
    >
      {{ $t('404.back') }}
    </router-link>
  </div>
</template>

<script>
export default { name: 'NotFound' }
</script>
