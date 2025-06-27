# MQTT Simulador

## Broker MQTT
- Servidor central que recibe y distribuye mensajes
- Sensores arduinos publican datos aqui
- Dashboard se suscribe para recibir actualizaciones
- Funciona como cartero que entrega mensajes según el tema

## WebSocket Bridge
- Puente para que navegadores se conecten a MQTT
- Este bridge convierte WebSocket a MQTT

## Publisher
- Simula sensores HC-SR04 y servomotores SG90
- Envia datos falsos pero realistas al broker
- Cambia estados de ocupación
