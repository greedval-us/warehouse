import { ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { getBootstrap, saveTheme } from '../services/AppService.js';
import { DesktopError } from '../infrastructure/desktopApi.js';

export const useAppStore = defineStore('app', () => {
  const theme = ref('light');
  const info = shallowRef(null);
  const storage = shallowRef(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  let failedAction = null;

  function showError(cause) {
    error.value = cause instanceof DesktopError ? cause.message : 'Не удалось выполнить действие. Повторите попытку.';
  }

  async function initialize() {
    if (loading.value || saving.value) return;
    loading.value = true;
    error.value = null;
    failedAction = { type: 'initialize' };
    try {
      const value = await getBootstrap();
      theme.value = value.settings.theme;
      info.value = value.info;
      storage.value = value.storage;
      failedAction = null;
    } catch (cause) { showError(cause); }
    finally { loading.value = false; }
  }

  async function setTheme(nextTheme) {
    if (loading.value || saving.value || !storage.value?.ready) return;
    saving.value = true;
    error.value = null;
    failedAction = { type: 'theme', theme: nextTheme };
    try {
      const value = await saveTheme(nextTheme);
      theme.value = value.theme;
      failedAction = null;
    } catch (cause) { showError(cause); }
    finally { saving.value = false; }
  }

  async function retry() {
    if (failedAction?.type === 'theme') return setTheme(failedAction.theme);
    return initialize();
  }

  return { theme, info, storage, loading, saving, error, initialize, setTheme, retry };
});
