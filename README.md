# Dashboard IoT - Sistema de Estacionamiento Inteligente

Este proyecto combina un simulador MQTT que emula sensores Arduino (HC-SR04 y servos SG90) con un dashboard móvil en React Native que se actualiza en tiempo real.

## � Características

- **Dashboard en tiempo real**: Interfaz móvil que se actualiza automáticamente
- **Simulador MQTT completo**: Emula sensores ultrasónicos HC-SR04 y servomotores SG90
- **WebSocket Bridge**: Conecta MQTT con React Native para actualizaciones instantáneas
- **Datos realistas**: Simula comportamiento real de un estacionamiento inteligente

## 🛠️ Componentes del Sistema

### 1. Simulador MQTT (`mqtt-simulator/`)
- **broker.js**: Broker MQTT usando Aedes
- **publisher.js**: Simula sensores Arduino (HC-SR04 y SG90)
- **ws-bridge.js**: Puente WebSocket-MQTT para el dashboard
- **Puerto MQTT**: 1883
- **Puerto WebSocket**: 8080

### 2. Dashboard React Native
- **Tecnología**: Expo + React Native
- **Estado en tiempo real**: Usando WebSockets
- **Visualización**: Gráficos, métricas y estados de sensores
- **Puerto**: 8081 (Expo Metro)

## 📦 Instalación

### Instalación completa (recomendada)
```bash
npm run setup
```

### Instalación manual
```bash
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias del simulador MQTT
npm run mqtt-install
```

## 🚀 Uso

### Modo Desarrollo (Recomendado)
Inicia tanto el simulador MQTT como el dashboard:
```bash
npm run dev
```

Esto ejecutará:
- Broker MQTT en puerto 1883
- WebSocket Bridge en puerto 8080
- Publisher (simulador de sensores)
- Expo Metro bundler

### Modo Manual
Si prefieres controlar cada componente por separado:

1. **Iniciar simulador MQTT:**
```bash
npm run mqtt-start
```

2. **En otra terminal, iniciar dashboard:**
```bash
npm start
```

## 📊 Datos Simulados

### Sensores HC-SR04 (Ultrasonidos)
- **3 sensores** de detección de vehículos
- **Distancias realistas**: 5-15cm (ocupado), 25-40cm (libre)
- **Cambios automáticos**: Cada 4 segundos aprox.
- **Topics MQTT**: `parking/spaces/{id}/status`

### Servomotores SG90 (Portones)
- **2 portones**: Entrada y salida
- **Estados**: Cerrado, Abriendo, Abierto, Cerrando
- **Ángulos**: 0° (cerrado) a 90° (abierto)
- **Activación**: Cada 7 segundos aprox.
- **Topics MQTT**: `parking/gates/{entry|exit}/status`

### Estadísticas del Sistema
- **Ocupación en tiempo real**
- **Entradas diarias**
- **Datos por hora** (últimas 24h)
- **Tiempo de funcionamiento**
- **Topic MQTT**: `parking/stats/summary`

## 🔧 Estructura de Mensajes MQTT

### Espacios de Estacionamiento
```json
{
  "occupied": true,
  "distance": 8,
  "sensor": "HC-SR04-1",
  "timestamp": "2024-12-15T10:30:00.000Z",
  "battery": 89.5,
  "change_detected": true,
  "previous_state": false
}
```

### Estado de Portones
```json
{
  "status": "opening",
  "timestamp": "2024-12-15T10:30:00.000Z",
  "servo_angle": 45,
  "action": "opening"
}
```

### Estadísticas del Sistema
```json
{
  "totalSpaces": 3,
  "occupiedSpaces": 1,
  "availableSpaces": 2,
  "dailyEntries": 15,
  "occupancyRate": 33,
  "systemUptime": 3600,
  "lastEntry": "2024-12-15T10:25:00.000Z",
  "lastExit": "2024-12-15T10:20:00.000Z",
  "timestamp": "2024-12-15T10:30:00.000Z"
}
```

## 📱 Características del Dashboard

### Vista General
- **Ocupación total** con barra de progreso
- **Estado de dispositivos IoT** conectados
- **Estado de red** con indicador de señal
- **Conexión MQTT** en tiempo real

### Espacios de Estacionamiento
- **Vista horizontal** deslizable
- **Estados visuales**: Ocupado/Disponible
- **Información del sensor**: HC-SR04 + distancia
- **Resumen**: Contador de espacios ocupados/libres

### Gráfico de Ocupación
- **Datos por hora** de las últimas 24h
- **Colores dinámicos**: Verde (<30%), Naranja (30-60%), Rojo (>60%)
- **Actualización automática**

### Estado del Sistema
- **Métricas IoT**: Sensores activos, protocolo, tiempo activo
- **Control de portones**: Estado visual de servos SG90
- **Información técnica**: Broker MQTT, última actualización

## 🔧 Configuración

### Puertos Utilizados
- **1883**: Broker MQTT
- **8080**: WebSocket Bridge
- **8081**: Expo Metro (dashboard)

### Topics MQTT
- `parking/spaces/+/status` - Estado de espacios individuales
- `parking/gates/+/status` - Estado de portones
- `parking/stats/summary` - Estadísticas generales
- `parking/analytics/hourly` - Datos por hora

## 🐛 Solución de Problemas

### El dashboard no recibe datos
1. Verificar que el simulador MQTT esté corriendo
2. Comprobar conexión WebSocket en puerto 8080
3. Revisar logs del bridge en la terminal

### Error de conexión MQTT
1. Verificar que el broker esté en puerto 1883
2. Reiniciar el simulador: `Ctrl+C` y `npm run mqtt-start`

### Dashboard no se actualiza
1. Verificar conexión a internet
2. Reiniciar Expo: `r` en la terminal
3. Limpiar caché: `Shift+R` en la terminal de Expo

## 📁 Estructura del Proyecto

```
dashboard-mobile-iot/
├── app/                    # Páginas de la aplicación
│   └── index.tsx          # Dashboard principal
├── hooks/                 # React hooks personalizados
│   └── useMqttWebSocket.ts # Hook WebSocket-MQTT
├── mqtt-simulator/        # Simulador completo
│   ├── broker.js         # Broker MQTT
│   ├── publisher.js      # Simulador de sensores
│   ├── ws-bridge.js      # Bridge WebSocket
│   └── package.json      # Dependencias del simulador
├── components/           # Componentes React Native
├── constants/           # Constantes y temas
└── package.json        # Configuración principal
```

## 🎯 Próximos Pasos

Este simulador está diseñado para ser reemplazado fácilmente por hardware real:

1. **Arduino con sensores HC-SR04** → Sustituir `publisher.js`
2. **Servomotores SG90 reales** → Conectar directamente al broker
3. **Sistema embebido** → Mantener el mismo protocolo MQTT
4. **Dashboard en producción** → Ya listo para datos reales

## 📄 Licencia

Este proyecto está bajo la licencia ISC.

---

**¡El dashboard ya está listo para recibir datos reales de tu Arduino! 🚀**
