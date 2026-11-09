<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { PanelLeft, Sun, Moon, RefreshCw } from 'lucide-vue-next';
import AppSidebar from '../../components/AppSidebar.vue';
import { useAppStore } from '../../stores/appStore.js';

const store = useAppStore();
const route = useRoute();
const title = computed(() => route.meta.title ?? 'Warehouse');
const query = window.matchMedia('(max-width: 1279px)');
const compact = shallowRef(query.matches);
const collapsed = shallowRef(compact.value);
const mainContent = useTemplateRef('mainContent');
const navigationToggle = useTemplateRef('navigationToggle');
const sidebarFrame = useTemplateRef('sidebarFrame');
watch(() => store.theme, theme => { document.documentElement.dataset.appearance = theme; }, { immediate: true });
function resizeNavigation(event) { compact.value = event.matches; collapsed.value = event.matches; }
function closeNavigation() {
  if (!compact.value || collapsed.value) return;
  collapsed.value = true;
  nextTick(() => navigationToggle.value?.focus());
}
function toggleNavigation() {
  collapsed.value = !collapsed.value;
  if (compact.value && !collapsed.value) nextTick(() => sidebarFrame.value?.querySelector('.sidebar-close')?.focus());
}
function containNavigationFocus(event) {
  if (!compact.value || collapsed.value || event.defaultPrevented) return;
  const elements = [...sidebarFrame.value.querySelectorAll('.sidebar-floating a[href],.sidebar-floating button:not([disabled])')];
  const first = elements[0];
  const last = elements.at(-1);
  if ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
}
onMounted(() => { query.addEventListener('change', resizeNavigation); store.initialize(); });
onBeforeUnmount(() => query.removeEventListener('change', resizeNavigation));
</script>

<template>
  <div class="app-shell" @keydown.esc="closeNavigation" @keydown.tab="containNavigationFocus">
    <a href="#main-content" class="skip-link" @click.prevent="mainContent?.focus()">Перейти к содержимому</a>
    <button v-if="compact && !collapsed" class="sidebar-backdrop" type="button" tabindex="-1" aria-label="Закрыть меню" @click="closeNavigation" />
    <div ref="sidebarFrame" class="sidebar-frame" :class="{ 'sidebar-frame-collapsed': collapsed }">
      <AppSidebar :collapsed="compact || collapsed" :inert="compact && !collapsed" :aria-hidden="compact && !collapsed || undefined" :ready="store.storage?.ready" @navigate="closeNavigation" />
      <AppSidebar v-if="compact && !collapsed" class="sidebar-floating" navigation-id="expanded-navigation" overlay :ready="store.storage?.ready" @navigate="closeNavigation" @close="closeNavigation" />
    </div>
    <div class="app-body" :inert="compact && !collapsed">
      <header class="toolbar">
        <div class="toolbar-start">
          <button ref="navigationToggle" type="button" class="icon-button" :aria-expanded="!collapsed" :aria-controls="compact && !collapsed ? 'expanded-navigation' : 'main-navigation'" :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'" @click="toggleNavigation"><PanelLeft :size="18" aria-hidden="true" /></button>
          <span class="toolbar-title">{{ title }}</span>
        </div>
        <div class="toolbar-end">
          <span class="local-label"><span class="status-dot" :class="{ 'status-dot-ready': store.storage?.ready }" />Локально</span>
          <button type="button" class="icon-button" :disabled="!store.storage?.ready || store.loading || store.saving" :aria-label="store.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'" @click="store.setTheme(store.theme === 'dark' ? 'light' : 'dark')"><component :is="store.theme === 'dark' ? Sun : Moon" :size="18" aria-hidden="true" /></button>
        </div>
      </header>
      <div v-if="store.error" class="error-banner" role="alert"><span>{{ store.error }}</span><button type="button" class="text-button" :disabled="store.loading || store.saving" @click="store.retry"><RefreshCw :size="15" aria-hidden="true" />Повторить</button></div>
      <main id="main-content" ref="mainContent" class="main-content" tabindex="-1" :aria-busy="store.loading">
        <p v-if="store.loading && !store.info" class="loading-status" role="status">Загрузка приложения…</p>
        <RouterView v-else />
      </main>
    </div>
  </div>
</template>
