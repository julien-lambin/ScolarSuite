// src/preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // --- FONCTIONS EXISTANTES ---
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  createSchool: (schoolData) => ipcRenderer.invoke('db:createSchool', schoolData),
  getSchools: () => ipcRenderer.invoke('db:getSchools'),
  navigateToSchool: (data) => ipcRenderer.invoke('navigate:toSchool', data),
  onSchoolData: (callback) => ipcRenderer.on('school-data', (event, ...args) => callback(...args)),
  getSchoolById: (schoolId) => ipcRenderer.invoke('db:getSchoolById', schoolId),
  getInitialSchoolData: (schoolId) => ipcRenderer.invoke('school:getInitialData', schoolId),
  getClasses: (sourceFolderPath) => ipcRenderer.invoke('school:getClasses', sourceFolderPath),
  getPhotosByClass: (data) => ipcRenderer.invoke('school:getPhotosByClass', data),
  getFratriePhotos: (data) => ipcRenderer.invoke('school:getFratriePhotos', data),
  navigateToOrder: (data) => ipcRenderer.send('navigate:toOrder', data),
  onOrderData: (callback) => ipcRenderer.on('order-data', (event, ...args) => callback(...args)),
  getOrderForStudent: (data) => ipcRenderer.invoke('db:getOrderForStudent', data),
  saveOrder: (orderData) => ipcRenderer.invoke('db:saveOrder', orderData),
  saveGroupOrders: (data) => ipcRenderer.invoke('db:saveGroupOrders', data),
  getOrdersBySchool: (schoolId) => ipcRenderer.invoke('db:getOrdersBySchool', schoolId),
  processOrders: (data) => ipcRenderer.invoke('school:processOrders', data),
  onThumbnailProgress: (callback) => ipcRenderer.on('thumbnail-progress', (event, ...args) => callback(...args)),
  onThumbnailComplete: (callback) => ipcRenderer.on('thumbnail-complete', (event, ...args) => callback(...args)),
  onThumbnailError: (callback) => ipcRenderer.on('thumbnail-error', (event, ...args) => callback(...args)),
  getThumbnailPath: (schoolId) => ipcRenderer.invoke('get-thumbnail-path', schoolId),
  

  // --- NOUVELLES FONCTIONS POUR LA CONFIGURATION ---
  navigateToSchoolConfig: (schoolId) => ipcRenderer.send('navigate:toSchoolConfig', schoolId),
  onSchoolConfigData: (callback) => ipcRenderer.on('school-config-data', (event, ...args) => callback(...args)),
  saveSchoolConfig: (data) => ipcRenderer.invoke('db:saveSchoolConfig', data),
  getDefaultProductCatalog: () => ipcRenderer.invoke('config:getDefaultCatalog'),
  deleteSchool: (schoolId) => ipcRenderer.invoke('db:deleteSchool', schoolId),
  searchAllPhotos: (data) => ipcRenderer.invoke('school:searchAllPhotos', data),
  onProcessProgress: (callback) => ipcRenderer.on('process-progress', (event, ...args) => callback(...args)),
  cancelProcess: () => ipcRenderer.send('process:cancel'),
  getSubfolders: (schoolId) => ipcRenderer.invoke('school:getSubfolders', schoolId),


    // NOUVEAU : Sélectionner un fichier (avec filtre d'extension optionnel)
  selectFile: (extensions) => ipcRenderer.invoke('dialog:openFile', extensions),

  // NOUVEAU : Module Générateur Excel
  startExcelGeneration: (config) => ipcRenderer.send('generator:start', config),
  onGenerateLog: (callback) => ipcRenderer.on('generator:log', (event, msg) => callback(msg)),
  onGenerateComplete: (callback) => ipcRenderer.on('generator:complete', (event, res) => callback(res)),
  // Gestion des Templates
  getTemplates: () => ipcRenderer.invoke('templates:get'),
  saveTemplates: (templates) => ipcRenderer.invoke('templates:save', templates),
  listSubfolders: (path) => ipcRenderer.invoke('fs:listSubfolders', path),


  navigate: (viewName) => ipcRenderer.send('navigate', viewName),
});