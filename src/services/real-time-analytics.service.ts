import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { AnalyticsService } from './analytics.service';
import { ReportingService } from './reporting.service';
import { DatabaseService } from '../database/database.service';
import { AnalyticsEvent, AnalyticsFilters } from '../types/analytics.types';

export class RealTimeAnalyticsService {
  private io: SocketIOServer;
  private db: DatabaseService;
  private reportingService: ReportingService;
  private updateInterval: NodeJS.Timeout | null = null;
  private connectedClients: Map<string, { socket: Socket; filters: AnalyticsFilters; subscriptions: string[] }> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io/analytics'
    });

    this.db = DatabaseService.getInstance();
    this.reportingService = new ReportingService();
    this.setupSocketHandlers();
    this.startPeriodicUpdates();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Analytics client connected: ${socket.id}`);
      
      // Initialize client data
      this.connectedClients.set(socket.id, {
        socket,
        filters: {},
        subscriptions: []
      });

      // Handle subscription to specific analytics streams
      socket.on('subscribe', (data: { 
        streams: string[]; 
        filters?: AnalyticsFilters;
        dashboardType?: 'executive' | 'department' | 'employee' | 'project';
      }) => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.subscriptions = data.streams;
          client.filters = data.filters || {};
          
          console.log(`Client ${socket.id} subscribed to:`, data.streams);
          
          // Send initial data for subscribed streams
          this.sendInitialData(socket, data.streams, data.filters || {});
        }
      });

      // Handle unsubscription
      socket.on('unsubscribe', (streams: string[]) => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.subscriptions = client.subscriptions.filter(s => !streams.includes(s));
          console.log(`Client ${socket.id} unsubscribed from:`, streams);
        }
      });

      // Handle filter updates
      socket.on('updateFilters', (filters: AnalyticsFilters) => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.filters = { ...client.filters, ...filters };
          console.log(`Client ${socket.id} updated filters:`, filters);
          
          // Send updated data with new filters
          this.sendInitialData(socket, client.subscriptions, client.filters);
        }
      });

      // Handle real-time report requests
      socket.on('generateReport', async (data: {
        reportType: string;
        filters: AnalyticsFilters;
        exportOptions?: any;
      }) => {
        try {
          let report: any;
          
          switch (data.reportType) {
            case 'utilization':
              report = await this.reportingService.generateUtilizationReport(data.filters);
              break;
            case 'executive-dashboard':
              report = await this.reportingService.generateExecutiveDashboard(data.filters);
              break;
            default:
              throw new Error(`Unsupported report type: ${data.reportType}`);
          }

          socket.emit('reportGenerated', {
            reportType: data.reportType,
            data: report.data,
            metadata: report.metadata
          });
        } catch (error) {
          socket.emit('reportError', {
            reportType: data.reportType,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Analytics client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  private async sendInitialData(socket: Socket, streams: string[], filters: AnalyticsFilters): Promise<void> {
    try {
      for (const stream of streams) {
        let data: any;
        
        switch (stream) {
          case 'utilization':
            data = await AnalyticsService.getTeamUtilizationData(filters);
            break;
          case 'capacity-trends':
            data = await AnalyticsService.getCapacityTrends(filters);
            break;
          case 'resource-metrics':
            data = await AnalyticsService.getResourceAllocationMetrics(filters);
            break;
          case 'department-performance':
            data = await AnalyticsService.getDepartmentPerformance(filters);
            break;
          case 'skill-gaps':
            data = await AnalyticsService.getSkillGapAnalysis(filters);
            break;
          case 'executive-kpis':
            data = await this.reportingService.generateExecutiveDashboard(filters);
            break;
        }

        if (data) {
          socket.emit('analyticsUpdate', {
            stream,
            data: data.data || data,
            metadata: data.metadata,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error sending initial data:', error);
      socket.emit('analyticsError', {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  private startPeriodicUpdates(): void {
    // Update every 30 seconds for real-time dashboards
    this.updateInterval = setInterval(async () => {
      await this.broadcastUpdates();
    }, 30000);
  }

  private async broadcastUpdates(): Promise<void> {
    const uniqueSubscriptions = new Set<string>();
    const clientFilters = new Map<string, AnalyticsFilters>();

    // Collect all unique subscriptions and filters
    this.connectedClients.forEach((client, socketId) => {
      client.subscriptions.forEach(sub => uniqueSubscriptions.add(sub));
      clientFilters.set(socketId, client.filters);
    });

    // Generate updates for each subscription type
    for (const stream of uniqueSubscriptions) {
      try {
        // Get clients subscribed to this stream
        const subscribedClients = Array.from(this.connectedClients.entries())
          .filter(([_, client]) => client.subscriptions.includes(stream));

        if (subscribedClients.length === 0) continue;

        // Generate data for this stream (using default filters for efficiency)
        let streamData: any;
        const defaultFilters: AnalyticsFilters = {
          dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          dateTo: new Date()
        };

        switch (stream) {
          case 'utilization':
            streamData = await AnalyticsService.getTeamUtilizationData(defaultFilters);
            break;
          case 'capacity-trends':
            streamData = await AnalyticsService.getCapacityTrends(defaultFilters);
            break;
          case 'resource-metrics':
            streamData = await AnalyticsService.getResourceAllocationMetrics(defaultFilters);
            break;
          case 'real-time-alerts':
            streamData = await this.generateRealTimeAlerts();
            break;
        }

        if (streamData) {
          // Broadcast to subscribed clients
          subscribedClients.forEach(([socketId, client]) => {
            client.socket.emit('analyticsUpdate', {
              stream,
              data: streamData.data || streamData,
              metadata: streamData.metadata || { generatedAt: new Date() },
              timestamp: new Date()
            });
          });
        }
      } catch (error) {
        console.error(`Error updating stream ${stream}:`, error);
      }
    }
  }

  private async generateRealTimeAlerts(): Promise<{ data: AnalyticsEvent[] }> {
    const alerts: AnalyticsEvent[] = [];

    try {
      // Check for utilization alerts
      const utilizationData = await AnalyticsService.getTeamUtilizationData({
        dateFrom: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        dateTo: new Date()
      });

      utilizationData.data.forEach(dept => {
        if (dept.averageUtilization > 120) {
          alerts.push({
            type: 'capacity_alert',
            timestamp: new Date(),
            departmentId: dept.departmentId,
            severity: 'critical',
            message: `Department ${dept.departmentName} is severely over-allocated at ${dept.averageUtilization.toFixed(1)}%`,
            data: { utilization: dept.averageUtilization, department: dept.departmentName }
          });
        } else if (dept.averageUtilization > 100) {
          alerts.push({
            type: 'capacity_alert',
            timestamp: new Date(),
            departmentId: dept.departmentId,
            severity: 'warning',
            message: `Department ${dept.departmentName} is over-allocated at ${dept.averageUtilization.toFixed(1)}%`,
            data: { utilization: dept.averageUtilization, department: dept.departmentName }
          });
        }

        if (dept.utilizationTrend > 15) {
          alerts.push({
            type: 'utilization_change',
            timestamp: new Date(),
            departmentId: dept.departmentId,
            severity: 'warning',
            message: `Department ${dept.departmentName} utilization increased by ${dept.utilizationTrend.toFixed(1)}%`,
            data: { trend: dept.utilizationTrend, department: dept.departmentName }
          });
        }
      });

      // Check for skill gap alerts
      const skillGaps = await AnalyticsService.getSkillGapAnalysis({
        dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
        dateTo: new Date()
      });

      skillGaps.data
        .filter(gap => gap.criticalityLevel === 'critical')
        .forEach(gap => {
          alerts.push({
            type: 'skill_gap_detected',
            timestamp: new Date(),
            severity: 'critical',
            message: `Critical skill gap in ${gap.skillName}: ${gap.gapPercentage.toFixed(1)}% shortage`,
            data: { skill: gap.skillName, gap: gap.gapPercentage, category: gap.skillCategory }
          });
        });

      // Limit to most recent 20 alerts
      return { data: alerts.slice(0, 20) };
    } catch (error) {
      console.error('Error generating real-time alerts:', error);
      return { data: [] };
    }
  }

  public async emitCustomEvent(event: AnalyticsEvent, targetClients?: string[]): Promise<void> {
    const clients = targetClients 
      ? Array.from(this.connectedClients.entries()).filter(([id]) => targetClients.includes(id))
      : Array.from(this.connectedClients.entries());

    clients.forEach(([_, client]) => {
      client.socket.emit('analyticsEvent', event);
    });
  }

  public async broadcastAlert(alert: AnalyticsEvent): Promise<void> {
    this.io.emit('analyticsAlert', alert);
  }

  public getConnectionCount(): number {
    return this.connectedClients.size;
  }

  public getActiveSubscriptions(): Record<string, number> {
    const subscriptions: Record<string, number> = {};
    
    this.connectedClients.forEach(client => {
      client.subscriptions.forEach(sub => {
        subscriptions[sub] = (subscriptions[sub] || 0) + 1;
      });
    });

    return subscriptions;
  }

  public async triggerReportGeneration(
    reportType: string, 
    filters: AnalyticsFilters,
    targetClients?: string[]
  ): Promise<void> {
    try {
      let report: any;
      
      switch (reportType) {
        case 'utilization':
          report = await this.reportingService.generateUtilizationReport(filters);
          break;
        case 'executive-dashboard':
          report = await this.reportingService.generateExecutiveDashboard(filters);
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      const clients = targetClients 
        ? Array.from(this.connectedClients.entries()).filter(([id]) => targetClients.includes(id))
        : Array.from(this.connectedClients.entries());

      clients.forEach(([_, client]) => {
        client.socket.emit('reportGenerated', {
          reportType,
          data: report.data,
          metadata: report.metadata,
          timestamp: new Date()
        });
      });
    } catch (error) {
      console.error(`Error generating report ${reportType}:`, error);
    }
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.io.close();
  }
}