import { ipcMain, type IpcMainInvokeEvent } from 'electron';

let trustedWebContentsId: number | null = null;
let trustedMainFrameUrl: string | null = null;

export function trustMainRenderer(webContentsId: number, mainFrameUrl: string): void {
  trustedWebContentsId = webContentsId;
  trustedMainFrameUrl = mainFrameUrl;
}

export function assertTrustedIpcSender(event: IpcMainInvokeEvent): void {
  if (trustedWebContentsId === null || trustedMainFrameUrl === null) {
    throw new Error('Trusted renderer IPC is not initialized.');
  }
  const frame = event.senderFrame;
  if (event.sender.id !== trustedWebContentsId || frame === null || frame.parent !== null || frame.url !== trustedMainFrameUrl) {
    throw new Error('IPC request rejected: untrusted renderer sender.');
  }
}

export function handleTrustedIpc(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown,
): void {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedIpcSender(event);
    return listener(event, ...args);
  });
}
