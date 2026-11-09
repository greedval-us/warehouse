import { contextBridge, ipcRenderer } from 'electron';
import { createDesktopBridge } from '../shared/bridge.js';

contextBridge.exposeInMainWorld('desktopAPI', createDesktopBridge((...args) => ipcRenderer.invoke(...args)));
