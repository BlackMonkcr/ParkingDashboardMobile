import { StatusBar } from 'expo-status-bar';
import {
  Activity,
  BarChart3,
  Car,
  Clock,
  Database,
  RefreshCw,
  Router,
  Server,
  Shield,
  TrendingUp,
  Wifi
} from 'lucide-react-native';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useMqttWebSocket } from '../hooks/useMqttWebSocket';

const { width } = Dimensions.get('window');

// Funciones auxiliares
const getGateStatusText = (status: string) => {
  switch (status) {
    case 'closed': return 'Cerrado';
    case 'open': return 'Abierto';
    case 'opening': return 'Abriendo...';
    case 'closing': return 'Cerrando...';
    default: return 'Desconocido';
  }
};

const formatUptime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

// Componente para estado desconectado
const DisconnectedState = ({ onRetry }: { onRetry: () => void }) => (
  <View style={styles.disconnectedContainer}>
    <View style={styles.disconnectedContent}>
      <View style={styles.disconnectedIcon}>
        <Wifi size={48} color="#FF5252" />
      </View>
      <Text style={styles.disconnectedTitle}>MQTT Desconectado</Text>
      <Text style={styles.disconnectedMessage}>
        No se puede conectar al simulador MQTT.{'\n'}
        Asegúrate de que el servidor esté ejecutándose.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <RefreshCw size={16} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>Reintentar Conexión</Text>
      </TouchableOpacity>
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Para iniciar el simulador:</Text>
        <Text style={styles.instructionsText}>npm run mqtt-start</Text>
        <Text style={styles.instructionsText}>o</Text>
        <Text style={styles.instructionsText}>npm run dev</Text>
      </View>
    </View>
  </View>
);

export default function DashboardScreen() {
  const { data: mqttData, isConnected, reconnect } = useMqttWebSocket();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Generar datos del gráfico basados en los datos de MQTT
  const generateChartData = () => {
    // Tomar solo cada 3 horas para evitar sobresaturación del eje X
    const filteredData = mqttData.hourlyData.filter((_, index) => index % 3 === 0).slice(0, 8);
    const labels = filteredData.map(item => {
      // Formatear como "6h", "9h", etc.
      const hour = parseInt(item.hour.split(':')[0]);
      return `${hour}h`;
    });

    const data = filteredData.map(item =>
      Math.round((item.occupied / (item.occupied + item.available)) * 100) || 0
    );

    return {
      labels,
      datasets: [
        {
          data,
          colors: data.map(value => () => {
            if (value < 30) return '#00D4AA';
            if (value < 60) return '#FFA726';
            return '#FF5252';
          })
        }
      ]
    };
  };

  const chartData = generateChartData();

  // Si no está conectado, mostrar pantalla de desconexión
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <DisconnectedState onRetry={reconnect} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Router size={26} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Panel IoT</Text>
              <Text style={styles.headerSubtitle}>Estacionamiento Inteligente</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.connectionStatus}>
              <Wifi size={16} color={isConnected ? "#00D4AA" : "#FF5252"} />
              <Text style={[styles.connectionText, { color: isConnected ? "#00D4AA" : "#FF5252" }]}>
                {isConnected ? 'MQTT Conectado' : 'MQTT Desconectado'}
              </Text>
            </View>
            <Text style={styles.timeText}>{formatTime(mqttData.lastUpdate)}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScrollView}>
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Ocupación Total</Text>
                  <BarChart3 size={24} color="#00D4AA" />
                </View>
                <Text style={styles.statValue}>{mqttData.systemStats.occupancyRate}%</Text>
                <Text style={styles.statSubtext}>{mqttData.systemStats.totalSpaces} espacios totales</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${mqttData.systemStats.occupancyRate}%` }]} />
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardSecondary]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Dispositivos IoT</Text>
                  <Router size={24} color="#4A90E2" />
                </View>
                <Text style={styles.statValue}>{mqttData.parkingSpaces.length}</Text>
                <Text style={styles.statSubtext}>Sensores conectados</Text>
                <View style={styles.deviceIndicators}>
                  {mqttData.parkingSpaces.map((space) => (
                    <View key={space.id} style={[styles.deviceDot, { backgroundColor: '#4A90E2' }]} />
                  ))}
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardSuccess]}>
                <View style={styles.statHeader}>
                  <Text style={styles.statLabel}>Estado de Red</Text>
                  <Shield size={24} color="#00D4AA" />
                </View>
                <Text style={[styles.statValue, { color: isConnected ? '#00D4AA' : '#FF5252' }]}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </Text>
                <Text style={styles.statSubtext}>
                  Señal {isConnected ? '95' : '0'}%
                </Text>
                <View style={styles.signalBars}>
                  {[1, 2, 3, 4].map((bar) => (
                    <View
                      key={bar}
                      style={[
                        styles.signalBar,
                        {
                          height: bar * 3 + 6,
                          backgroundColor: isConnected && bar <= 4 ? '#00D4AA' : '#2A3441'
                        }
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Parking Spaces */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Car size={20} color="#4A90E2" />
              <Text style={styles.sectionTitleMain}>Disponibilidad</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Tiempo real</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parkingScrollView}>
            <View style={styles.parkingContainer}>
              {mqttData.parkingSpaces.map((space) => (
                <View
                  key={space.id}
                  style={[
                    styles.parkingSpace,
                    {
                      borderColor: space.occupied ? '#FF4757' : '#00D4AA',
                      backgroundColor: space.occupied ? '#2D1B1B' : '#1B2D1B'
                    }
                  ]}
                >
                  <View style={styles.parkingHeader}>
                    <View style={styles.parkingNumberContainer}>
                      <Text style={styles.parkingNumber}>{space.id}</Text>
                    </View>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: space.occupied ? '#FF4757' : '#00D4AA' }
                    ]} />
                  </View>

                  <View style={styles.carIconContainer}>
                    <Car size={40} color={space.occupied ? '#FF4757' : '#00D4AA'} />
                  </View>

                  <View style={styles.parkingInfo}>
                    <Text style={[
                      styles.parkingStatus,
                      { color: space.occupied ? '#FF4757' : '#00D4AA' }
                    ]}>
                      {space.occupied ? 'Ocupado' : 'Disponible'}
                    </Text>
                    <Text style={styles.sensorText}>{space.sensor}</Text>
                    <View style={styles.distanceContainer}>
                      <Text style={styles.distanceText}>{space.distance}cm</Text>
                      <Text style={styles.distanceLabel}>distancia</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.parkingSummary}>
            <Text style={styles.summaryText}>
              {mqttData.systemStats.occupiedSpaces} ocupados, {' '}
              {mqttData.systemStats.availableSpaces} disponibles
            </Text>
            <Text style={[styles.summaryHighlight, { color: '#00D4AA' }]}>
              {mqttData.systemStats.availableSpaces} Espacios Libres
            </Text>
          </View>
        </View>

        {/* Occupancy Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <TrendingUp size={20} color="#4A90E2" />
              <Text style={styles.sectionTitleMain}>Ocupación por Hora</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Cada 3h</Text>
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.chartWrapper}>
              <BarChart
                data={chartData}
                width={width - 60} // Más espacio para las etiquetas
                height={220} // Altura ligeramente mayor
                yAxisLabel=""
                yAxisSuffix="%"
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: '#1A2332',
                  backgroundGradientTo: '#1A2332',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(142, 154, 175, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForBackgroundLines: {
                    strokeWidth: 0,
                  },
                  barPercentage: 0.6, // Barras más delgadas para más espacio
                  propsForLabels: {
                    fontSize: 10, // Texto más pequeño
                  },
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                  marginLeft: -10, // Menos compensación
                }}
                showBarTops={false}
                fromZero={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#00D4AA' }]} />
                <Text style={styles.legendText}>Bajo (&lt;30%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FFA726' }]} />
                <Text style={styles.legendText}>Medio (30-50%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF5252' }]} />
                <Text style={styles.legendText}>Alto (&gt;50%)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Activity size={20} color="#4A90E2" />
              <Text style={styles.sectionTitleMain}>Estado del Sistema</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Operativo</Text>
            </View>
          </View>

          <View style={styles.systemGrid}>
            <View style={styles.systemCard}>
              <Text style={styles.systemCardTitle}>Estado IoT</Text>
              <View style={styles.systemMetrics}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Sensores</Text>
                  <Text style={styles.metricValue}>{mqttData.parkingSpaces.length} activos</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Dispositivos</Text>
                  <Text style={styles.metricValue}>{mqttData.parkingSpaces.length} conectados</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Protocolo</Text>
                  <Text style={styles.metricValue}>MQTT v3.1.1</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Tiempo activo</Text>
                  <Text style={styles.metricValue}>
                    {formatUptime(mqttData.systemStats.systemUptime)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.systemCard}>
              <Text style={styles.systemCardTitle}>Portones</Text>
              <View style={styles.gatewayControls}>
                <View style={styles.gatewayItem}>
                  <Text style={styles.gatewayLabel}>Entrada</Text>
                  <Text style={styles.gatewaySubtext}>(Servo SG90-1)</Text>
                  <View style={styles.gatewayStatus}>
                    <View style={[
                      styles.toggleSwitch,
                      { backgroundColor: mqttData.gates.entry.status === 'open' ? '#00D4AA' : '#6C757D' }
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        { transform: [{ translateX: mqttData.gates.entry.status === 'open' ? 20 : 0 }] }
                      ]} />
                    </View>
                    <Text style={styles.gatewayStatusText}>
                      {getGateStatusText(mqttData.gates.entry.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.gatewayItem}>
                  <Text style={styles.gatewayLabel}>Salida</Text>
                  <Text style={styles.gatewaySubtext}>(Servo SG90-2)</Text>
                  <View style={styles.gatewayStatus}>
                    <View style={[
                      styles.toggleSwitch,
                      { backgroundColor: mqttData.gates.exit.status === 'open' ? '#00D4AA' : '#6C757D' }
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        { transform: [{ translateX: mqttData.gates.exit.status === 'open' ? 20 : 0 }] }
                      ]} />
                    </View>
                    <Text style={styles.gatewayStatusText}>
                      {getGateStatusText(mqttData.gates.exit.status)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Database size={20} color="#4A90E2" />
              <Text style={styles.sectionTitleMain}>Información del Sistema</Text>
            </View>
            <View style={styles.signalStrength}>
              <Wifi size={16} color="#00D4AA" />
              <Text style={styles.signalText}>{isConnected ? '95' : '0'}%</Text>
            </View>
          </View>

          <View style={styles.systemInfoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Server size={16} color="#8E9AAF" />
                <Text style={styles.infoLabel}>Broker MQTT</Text>
              </View>
              <Text style={styles.infoValue}>localhost:1883</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Database size={16} color="#8E9AAF" />
                <Text style={styles.infoLabel}>Ambiente</Text>
              </View>
              <Text style={styles.infoValue}>MQTT v3.1.1</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Clock size={16} color="#8E9AAF" />
                <Text style={styles.infoLabel}>Última actualización</Text>
              </View>
              <Text style={styles.infoValue}>{formatTime(mqttData.lastUpdate)}</Text>
            </View>
          </View>
        </View>

        {/* Estado desconectado */}
        {!isConnected && (
          <DisconnectedState onRetry={reconnect} />
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  header: {
    backgroundColor: '#1A2332',
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#4A90E2',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E9AAF',
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  refreshButton: {
    padding: 10,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: '#2A3441',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  connectionText: {
    fontSize: 12,
    color: '#00D4AA',
    marginLeft: 6,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
    color: '#8E9AAF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleMain: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8E9AAF',
    fontWeight: '500',
  },
  statsScrollView: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingRight: 24,
  },
  statCard: {
    width: 220,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardPrimary: {
    backgroundColor: '#1E3A4F',
    borderColor: '#00D4AA',
  },
  statCardSecondary: {
    backgroundColor: '#1E2F4F',
    borderColor: '#4A90E2',
  },
  statCardSuccess: {
    backgroundColor: '#1E4F3A',
    borderColor: '#00D4AA',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E9AAF',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#8E9AAF',
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2A3441',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 2,
  },
  deviceIndicators: {
    flexDirection: 'row',
    gap: 6,
  },
  deviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  signalBars: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'flex-end',
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  parkingScrollView: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  parkingContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingRight: 24,
  },
  parkingSpace: {
    width: 200,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  parkingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  parkingNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parkingNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  carIconContainer: {
    marginVertical: 16,
  },
  parkingInfo: {
    alignItems: 'center',
  },
  parkingStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sensorText: {
    fontSize: 11,
    color: '#8E9AAF',
    marginBottom: 8,
  },
  distanceContainer: {
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  distanceLabel: {
    fontSize: 10,
    color: '#8E9AAF',
  },
  parkingSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1A2332',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#8E9AAF',
  },
  summaryHighlight: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#1A2332',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
    alignSelf: 'stretch',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#8E9AAF',
  },
  statusBadge: {
    backgroundColor: '#1E4F3A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#00D4AA',
    fontWeight: '500',
  },
  systemGrid: {
    gap: 16,
  },
  systemCard: {
    backgroundColor: '#1A2332',
    borderRadius: 16,
    padding: 20,
  },
  systemCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  systemMetrics: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#8E9AAF',
  },
  metricValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  gatewayControls: {
    gap: 16,
  },
  gatewayItem: {
    gap: 4,
  },
  gatewayLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  gatewaySubtext: {
    fontSize: 11,
    color: '#8E9AAF',
  },
  gatewayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  gatewayStatusText: {
    fontSize: 12,
    color: '#8E9AAF',
  },
  signalStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalText: {
    fontSize: 12,
    color: '#00D4AA',
    fontWeight: '500',
  },
  systemInfoCard: {
    backgroundColor: '#1A2332',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E9AAF',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
  // Estilos para estado desconectado
  disconnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1419',
    paddingHorizontal: 24,
  },
  disconnectedContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  disconnectedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2A1B1B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF5252',
  },
  disconnectedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF5252',
    marginBottom: 12,
    textAlign: 'center',
  },
  disconnectedMessage: {
    fontSize: 16,
    color: '#8E9AAF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 32,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: '#1A2332',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 13,
    color: '#00D4AA',
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
