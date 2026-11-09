import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Settings from '../views/Settings.vue';
import Info from '../views/Info.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home, meta: { title: 'Склад' } },
    { path: '/settings', component: Settings, meta: { title: 'Настройки' } },
    { path: '/info', component: Info, meta: { title: 'О приложении' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
