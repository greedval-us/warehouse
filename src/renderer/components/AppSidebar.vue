<script setup>
import { Warehouse, Settings2, Info, HardDrive, X } from 'lucide-vue-next';
import AppIcon from './ui/AppIcon.vue';
defineProps({ collapsed: Boolean, ready: Boolean, overlay: Boolean, navigationId: { type: String, default: 'main-navigation' } });
defineEmits(['navigate', 'close']);
const navigation = [
  { to: '/', label: 'Склад', icon: Warehouse },
  { to: '/settings', label: 'Настройки', icon: Settings2, utility: true },
  { to: '/info', label: 'О приложении', icon: Info },
];
</script>

<template>
  <aside :id="navigationId" class="sidebar" :class="{ 'sidebar-collapsed': collapsed }" :role="overlay ? 'dialog' : undefined" :aria-modal="overlay || undefined" aria-label="Навигация">
    <RouterLink to="/" class="brand" aria-label="Warehouse — главная" @click="$emit('navigate')">
      <AppIcon /><span class="sidebar-label brand-copy"><span class="brand-title">Warehouse</span><span class="brand-caption">Локальное приложение</span></span>
    </RouterLink>
    <button v-if="overlay" class="sidebar-close icon-button" type="button" aria-label="Закрыть меню" @click="$emit('close')"><X :size="18" aria-hidden="true" /></button>
    <nav class="sidebar-nav" aria-label="Главное меню">
      <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-item" :class="{ 'nav-item-utility-first': item.utility }" :title="item.label" :aria-label="item.label" exact-active-class="nav-item-active" @click="$emit('navigate')">
        <component :is="item.icon" :size="19" aria-hidden="true" /><span class="sidebar-label">{{ item.label }}</span>
      </RouterLink>
    </nav>
    <div class="sidebar-footer" :title="ready ? 'Хранилище подключено' : 'Хранилище недоступно'">
      <HardDrive :size="17" aria-hidden="true" /><div class="sidebar-label"><span class="footer-title">На этом устройстве</span><span class="footer-caption">{{ ready ? 'Хранилище подключено' : 'Хранилище недоступно' }}</span></div>
    </div>
  </aside>
</template>
