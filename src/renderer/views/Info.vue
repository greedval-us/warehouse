<script setup>
import PageHeading from '../components/ui/PageHeading.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { useAppStore } from '../stores/appStore.js';
const store = useAppStore();
</script>

<template>
  <section class="page settings-page">
    <PageHeading title="О приложении" />
    <div class="about-card">
      <div class="about-header"><AppIcon :size="64" /><div><h2>{{ store.info?.name ?? 'Warehouse' }}</h2><p class="muted">{{ store.info ? `Версия ${store.info.version}` : 'Версия недоступна' }}</p></div></div>
      <p class="about-description">Рабочее пространство для вашего склада. Приложение работает локально, данные хранятся на этом устройстве.</p>
      <dl class="details-list about-details"><div><dt>Режим работы</dt><dd>Локально</dd></div></dl>
    </div>
  </section>
</template>
