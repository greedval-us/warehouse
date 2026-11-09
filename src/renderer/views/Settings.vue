<script setup>
import { Sun, Moon, Check } from 'lucide-vue-next';
import PageHeading from '../components/ui/PageHeading.vue';
import { useAppStore } from '../stores/appStore.js';
const store = useAppStore();
const themes = [{ value: 'light', label: 'Светлая', icon: Sun }, { value: 'dark', label: 'Тёмная', icon: Moon }];
function selectTheme(event, theme) {
  // Native radios toggle before change; retain the saved selection until persistence succeeds.
  for (const input of event.currentTarget.closest('fieldset').querySelectorAll('input[type="radio"]')) {
    input.checked = input.value === store.theme;
  }
  store.setTheme(theme);
}
</script>

<template>
  <section class="page settings-page">
    <PageHeading title="Настройки" description="Внешний вид и локальное хранилище." />
    <section class="settings-section" aria-labelledby="appearance-title">
      <div class="section-heading"><h2 id="appearance-title">Оформление</h2><p>Тема сохраняется на этом устройстве.</p></div>
      <fieldset class="theme-options" :disabled="!store.storage?.ready || store.loading || store.saving">
        <legend class="sr-only">Тема приложения</legend>
        <label v-for="theme in themes" :key="theme.value" class="theme-option" :class="{ 'theme-option-selected': store.theme === theme.value }">
          <input class="sr-only theme-input" type="radio" name="theme" :value="theme.value" :checked="store.theme === theme.value" @change="selectTheme($event, theme.value)" />
          <span class="appearance-preview" :class="{ 'appearance-preview-dark': theme.value === 'dark' }" aria-hidden="true"><span class="preview-toolbar"><i /><i /><i /></span><span class="preview-sidebar"><i /><i /><i /></span><span class="preview-content"><i /><i /><i /></span></span>
          <span class="theme-option-caption"><component :is="theme.icon" :size="16" aria-hidden="true" />{{ theme.label }}<span class="theme-check" aria-hidden="true"><Check v-if="store.theme === theme.value" :size="12" /></span></span>
        </label>
      </fieldset>
      <p class="save-status" role="status">{{ store.saving ? 'Сохранение темы…' : store.storage?.ready ? 'Изменения сохраняются автоматически.' : 'Настройки недоступны до подключения хранилища.' }}</p>
    </section>
    <section class="settings-section" aria-labelledby="storage-title">
      <div class="section-heading"><h2 id="storage-title">Хранилище</h2><p>Данные находятся на вашем устройстве.</p></div>
      <dl class="details-list"><div><dt>SQLite</dt><dd>{{ store.storage?.ready ? 'Подключено' : 'Недоступно' }}</dd></div><div><dt>Файл базы данных</dt><dd class="file-path">{{ store.storage?.path ?? 'Недоступен' }}</dd></div></dl>
    </section>
  </section>
</template>
