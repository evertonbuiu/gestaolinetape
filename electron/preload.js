const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Exemplo de funções que podem ser expostas
  platform: process.platform,
  
  // Funções para comunicação com o processo principal
  openExternal: (url) => {
    ipcRenderer.invoke('open-external', url);
  },
  
  // Informações da aplicação
  getVersion: () => {
    return ipcRenderer.invoke('get-version');
  }
});