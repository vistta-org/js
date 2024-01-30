export interface Socket {
  emit(event: string, ...args: any[]): void;
  on(event: string, callback: () => any): void;
}
export const socket: Socket;
