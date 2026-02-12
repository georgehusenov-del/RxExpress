const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export class OrderTrackingSocket {
  constructor(orderId, onMessage, onError) {
    this.orderId = orderId;
    this.onMessage = onMessage;
    this.onError = onError;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const wsUrl = BACKEND_URL.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsUrl}/api/ws/track/${this.orderId}`);

    this.ws.onopen = () => {
      console.log(`Connected to order tracking: ${this.orderId}`);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.onError) this.onError(error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export class DriverLocationSocket {
  constructor(driverId, onLocationUpdate) {
    this.driverId = driverId;
    this.onLocationUpdate = onLocationUpdate;
    this.ws = null;
  }

  connect() {
    const wsUrl = BACKEND_URL.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsUrl}/api/ws/driver/${this.driverId}`);

    this.ws.onopen = () => {
      console.log(`Driver ${this.driverId} connected`);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'location_update') {
          this.onLocationUpdate(data);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }

  sendLocation(latitude, longitude) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'location_update',
        latitude,
        longitude
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
