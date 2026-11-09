<script setup>
import { Warehouse } from 'lucide-vue-next';
import PageHeading from '../components/ui/PageHeading.vue';
</script>

<template>
  <section class="page workspace-page">
    <PageHeading title="Склад" />
    <div class="workspace-empty"><span class="empty-icon"><Warehouse :size="44" :stroke-width="1.25" aria-hidden="true" /></span><p>Ваше рабочее пространство</p></div>
  </section>
</template>
