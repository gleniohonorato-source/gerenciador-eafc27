import { contextBridge, ipcRenderer } from 'electron';

// Only the three career channels are exposed. The renderer never receives ipcRenderer itself,
// and each wrapper fixes its channel name, so the UI cannot invoke arbitrary channels.
contextBridge.exposeInMainWorld('careerDesktop', Object.freeze({
  runtime: 'electron',
  bridgeVersion: 3,
  createCareer: (input: { name: string; currentSeason: string }) =>
    ipcRenderer.invoke('career:create', input),
  listCareers: () => ipcRenderer.invoke('career:list'),
  openCareer: (id: string) => ipcRenderer.invoke('career:open', { id }),
  listFixtures: (careerId: string) => ipcRenderer.invoke('calendar:list', { careerId }),
  listPlayers: (careerId: string) => ipcRenderer.invoke('squad:list', { careerId }),
  updatePlayer: (careerId: string, playerId: string, profile: { name: string; birthDate: string | null; overall: number | null; potential: number | null; heightCm: number | null; weightKg: number | null }) =>
    ipcRenderer.invoke('squad:update', { careerId, playerId, profile }),
  selectCalendarImportFile: () => ipcRenderer.invoke('calendar:select-import-file'),
  previewCalendarImport: (selectionToken: string) => ipcRenderer.invoke('calendar:preview-import', { selectionToken }),
  confirmCalendarImport: (token: string, careerId: string) => ipcRenderer.invoke('calendar:confirm-import', { token, careerId, confirmed: true }),
  cancelCalendarImport: (token: string, kind: 'preview' | 'selection') => ipcRenderer.invoke('calendar:cancel-import', { token, kind }),
  appVersion: () => ipcRenderer.invoke('app:version'),
  createBackup: () => ipcRenderer.invoke('backup:create'),
  selectBackupRestore: () => ipcRenderer.invoke('backup:select-restore'),
  confirmBackupRestore: (token: string, confirmed: boolean) => ipcRenderer.invoke('backup:confirm-restore', { token, confirmed }),
}));
