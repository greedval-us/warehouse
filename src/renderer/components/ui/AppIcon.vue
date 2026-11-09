<script setup>
import { Warehouse } from 'lucide-vue-next';
defineProps({ size: { type: Number, default: 34 } });
</script>

<template><span class="app-icon" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true"><Warehouse :size="size * .62" :stroke-width="1.7" /></span></template>
