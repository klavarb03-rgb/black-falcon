"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", {
      // Add IPC methods here as the app grows
      send: (channel, ...args) => electron.ipcRenderer.send(channel, ...args),
      invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args),
      on: (channel, listener) => {
        electron.ipcRenderer.on(channel, (_event, ...args) => listener(...args));
      }
    });
    electron.contextBridge.exposeInMainWorld("authAPI", {
      setToken: (token) => electron.ipcRenderer.invoke("auth:setToken", token),
      getToken: () => electron.ipcRenderer.invoke("auth:getToken"),
      clearToken: () => electron.ipcRenderer.invoke("auth:clearToken")
    });
  } catch (error) {
    console.error(error);
  }
}
