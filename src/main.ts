import { createApp } from 'vue';
import App from './App.vue';
import { router } from '@/modules/ViewsManager/router';
import './style.css';

const app = createApp(App);
app.use(router);
app.mount('#app');
