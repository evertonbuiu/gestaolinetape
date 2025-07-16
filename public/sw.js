// Service Worker simples para PWA
const CACHE_NAME = 'luz-locacao-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Deixar o navegador lidar com as requisições normalmente
  return;
});