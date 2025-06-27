import { useEffect, useRef, useState } from 'react';

export interface ParkingSpace {
  id: number;
  occupied: boolean;
  distance: number;
  sensor: string;
  timestamp: string;
  battery?: number;
  change_detected?: boolean;
  previous_state?: boolean;
}

export interface GateStatus {
  status: 'closed' | 'opening' | 'open' | 'closing';
  timestamp: string;
  servo_angle: number;
  action?: string;
}

export interface SystemStats {
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  dailyEntries: number;
  occupancyRate: number;
  systemUptime: number;
  lastEntry: string;
  lastExit: string;
  timestamp: string;
}

export interface HourlyData {
  hour: string;
  occupied: number;
  available: number;
  timestamp?: string;
}

export interface MqttData {
  parkingSpaces: ParkingSpace[];
  gates: {
    entry: GateStatus;
    exit: GateStatus;
  };
  systemStats: SystemStats;
  hourlyData: HourlyData[];
  isConnected: boolean;
  lastUpdate: Date;
}

const WEBSOCKET_URL = 'ws://localhost:8080';

export const useMqttWebSocket = () => {
  const [data, setData] = useState<MqttData>({
    parkingSpaces: [
      { id: 1, occupied: false, distance: 32, sensor: 'HC-SR04-1', timestamp: new Date().toISOString() },
      { id: 2, occupied: true, distance: 8, sensor: 'HC-SR04-2', timestamp: new Date().toISOString() },
      { id: 3, occupied: false, distance: 28, sensor: 'HC-SR04-3', timestamp: new Date().toISOString() },
    ],
    gates: {
      entry: { status: 'closed', timestamp: new Date().toISOString(), servo_angle: 0 },
      exit: { status: 'closed', timestamp: new Date().toISOString(), servo_angle: 0 },
    },
    systemStats: {
      totalSpaces: 3,
      occupiedSpaces: 1,
      availableSpaces: 2,
      dailyEntries: 0,
      occupancyRate: 33,
      systemUptime: 0,
      lastEntry: new Date().toISOString(),
      lastExit: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    },
    hourlyData: Array(24).fill(0).map((_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      occupied: Math.floor(Math.random() * 3),
      available: 3 - Math.floor(Math.random() * 3),
    })),
    isConnected: false,
    lastUpdate: new Date(),
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const processMessage = (topic: string, parsedPayload: any) => {
    setData(prev => {
      const newData = { ...prev };

      // Actualizar según el topic
      if (topic.startsWith('parking/spaces/') && topic.endsWith('/status')) {
        const spaceId = parseInt(topic.split('/')[2]);
        const spaceIndex = newData.parkingSpaces.findIndex(space => space.id === spaceId);

        if (spaceIndex !== -1) {
          newData.parkingSpaces[spaceIndex] = {
            id: spaceId,
            occupied: parsedPayload.occupied,
            distance: parsedPayload.distance,
            sensor: parsedPayload.sensor,
            timestamp: parsedPayload.timestamp,
            battery: parsedPayload.battery,
            change_detected: parsedPayload.change_detected,
            previous_state: parsedPayload.previous_state,
          };
        }
      }

      if (topic.startsWith('parking/gates/') && topic.endsWith('/status')) {
        const gateType = topic.split('/')[2] as 'entry' | 'exit';
        newData.gates[gateType] = {
          status: parsedPayload.status,
          timestamp: parsedPayload.timestamp,
          servo_angle: parsedPayload.servo_angle,
          action: parsedPayload.action,
        };
      }

      if (topic === 'parking/stats/summary') {
        newData.systemStats = {
          totalSpaces: parsedPayload.totalSpaces,
          occupiedSpaces: parsedPayload.occupiedSpaces,
          availableSpaces: parsedPayload.availableSpaces,
          dailyEntries: parsedPayload.dailyEntries,
          occupancyRate: parsedPayload.occupancyRate,
          systemUptime: parsedPayload.systemUptime,
          lastEntry: parsedPayload.lastEntry,
          lastExit: parsedPayload.lastExit,
          timestamp: parsedPayload.timestamp,
        };
      }

      if (topic === 'parking/analytics/hourly') {
        newData.hourlyData = parsedPayload;
      }

      newData.lastUpdate = new Date();
      return newData;
    });
  };

  const scheduleReconnect = () => {
    if (connectionAttempts < 10) {
      const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
      console.log(`🔄 Reconectando en ${delay / 1000}s (intento ${connectionAttempts + 1}/10)`);

      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionAttempts(prev => prev + 1);
        connect();
      }, delay);
    }
  };

  const connect = () => {
    try {
      console.log('🔌 Conectando a WebSocket:', WEBSOCKET_URL);
      wsRef.current = new WebSocket(WEBSOCKET_URL);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket conectado');
        setData(prev => ({ ...prev, isConnected: true, lastUpdate: new Date() }));
        setConnectionAttempts(0);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const parsedEvent = JSON.parse(event.data);
          const { topic, message: payload } = parsedEvent;

          console.log('📨 Mensaje recibido:', topic);

          // Parsear el payload si es JSON
          let parsedPayload;
          try {
            parsedPayload = JSON.parse(payload);
          } catch {
            parsedPayload = payload;
          }

          processMessage(topic, parsedPayload);

        } catch (error) {
          console.error('❌ Error procesando mensaje WebSocket:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('❌ WebSocket desconectado:', event.code, event.reason);
        setData(prev => ({ ...prev, isConnected: false }));
        scheduleReconnect();
      };

      wsRef.current.onerror = (error) => {
        console.error('🔴 Error WebSocket:', error);
        setData(prev => ({ ...prev, isConnected: false }));
      };

    } catch (error) {
      console.error('🔴 Error creando WebSocket:', error);
      setData(prev => ({ ...prev, isConnected: false }));
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setData(prev => ({ ...prev, isConnected: false }));
  };

  const manualReconnect = () => {
    setConnectionAttempts(0);
    disconnect();
    setTimeout(connect, 1000);
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    data,
    isConnected: data.isConnected,
    reconnect: manualReconnect,
  };
};
