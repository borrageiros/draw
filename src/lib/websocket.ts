const getWebSocketURL = () => {
  if (typeof window === "undefined") {
    return "";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
};

export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: string) => void)[] = [];
  private connectionHandlers: ((isConnected: boolean) => void)[] = [];
  private isConnecting = false;

  public connect = async (): Promise<void> => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected.");
      return;
    }

    if (this.isConnecting) {
      console.log("WebSocket connection already in progress.");
      return;
    }
    this.isConnecting = true;

    try {
      const wsUrl = getWebSocketURL();
      if (!wsUrl) {
        console.log("WebSocket connection not needed on the server side.");
        this.isConnecting = false;
        return;
      }
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log("Connected to integrated WebSocket server");
        this.notifyConnectionChange(true);
      };

      this.ws.onmessage = (event) => {
        const receivedMessage =
          typeof event.data === "string"
            ? event.data
            : new TextDecoder().decode(event.data as ArrayBuffer);
        this.notifyMessageReceived(receivedMessage);
      };

      this.ws.onclose = (event) => {
        console.log(
          "Disconnected from WebSocket server",
          event.reason,
          event.code
        );
        this.ws = null;
        this.isConnecting = false;
        this.notifyConnectionChange(false);
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error: ", error);
        this.ws = null;
        this.isConnecting = false;
        this.notifyConnectionChange(false);
      };
    } catch (error) {
      this.isConnecting = false;
      console.error("Failed to initialize WebSocket:", error);
      throw error;
    }
  };

  public disconnect = (): void => {
    if (this.ws) {
      this.ws.close();
    }
  };

  public sendMessage = (message: string): void => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && message.trim()) {
      this.ws.send(message);
    } else {
      throw new Error("WebSocket is not connected or message is empty");
    }
  };

  public onMessage = (handler: (message: string) => void): void => {
    this.messageHandlers.push(handler);
  };

  public onConnectionChange = (
    handler: (isConnected: boolean) => void
  ): void => {
    this.connectionHandlers.push(handler);
  };

  public removeMessageHandler = (handler: (message: string) => void): void => {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
  };

  public removeConnectionHandler = (
    handler: (isConnected: boolean) => void
  ): void => {
    this.connectionHandlers = this.connectionHandlers.filter(
      (h) => h !== handler
    );
  };

  private notifyMessageReceived = (message: string): void => {
    this.messageHandlers.forEach((handler) => handler(message));
  };

  private notifyConnectionChange = (isConnected: boolean): void => {
    this.connectionHandlers.forEach((handler) => handler(isConnected));
  };

  public isConnected = (): boolean => {
    return this.ws?.readyState === WebSocket.OPEN;
  };
}

export const webSocketService = new WebSocketService();
