import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import { installErrorMonitoring } from './services/errorMonitor'

const app = createApp(App)

app.use(createPinia())
app.use(router)
installErrorMonitoring()
app.mount('#app')
