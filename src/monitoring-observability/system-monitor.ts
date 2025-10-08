/**
 * System Monitor - Comprehensive System Health and Performance Monitoring
 * 
 * This module monitors system health, performance metrics, and provides
 * real-time insights into the AGI system's operation.
 */

import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';
import { ConfigManager } from '@config/config-manager';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  processes: {
    active: number;
    total: number;
  };
}

export class SystemMonitor extends EventEmitter {
  private static instance: SystemMonitor;
  private logger: Logger;
  private config: ConfigManager;
  private isActive: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
  }

  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  public async start(): Promise<void> {
    if (this.isActive) return;

    this.isActive = true;
    this.startMonitoring();
    this.logger.info('📊 System Monitor started');
  }

  public async stop(): Promise<void> {
    this.isActive = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.logger.info('📊 System Monitor stopped');
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // Collect metrics every 5 seconds
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: this.getCPUMetrics(),
        memory: this.getMemoryMetrics(),
        disk: this.getDiskMetrics(),
        network: this.getNetworkMetrics(),
        processes: this.getProcessMetrics()
      };

      this.emit('metricsCollected', metrics);
      this.checkThresholds(metrics);

    } catch (error) {
      this.logger.error('Error collecting system metrics:', error);
    }
  }

  private getCPUMetrics(): SystemMetrics['cpu'] {
    const cpuUsage = process.cpuUsage();
    const loadAverage = [0.5, 0.3, 0.2]; // Placeholder

    return {
      usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      loadAverage
    };
  }

  private getMemoryMetrics(): SystemMetrics['memory'] {
    const memUsage = process.memoryUsage();
    const totalMemory = 8 * 1024 * 1024 * 1024; // 8GB placeholder

    return {
      used: memUsage.rss,
      free: totalMemory - memUsage.rss,
      total: totalMemory,
      percentage: (memUsage.rss / totalMemory) * 100
    };
  }

  private getDiskMetrics(): SystemMetrics['disk'] {
    // Placeholder disk metrics
    return {
      used: 50 * 1024 * 1024 * 1024, // 50GB
      free: 450 * 1024 * 1024 * 1024, // 450GB
      total: 500 * 1024 * 1024 * 1024, // 500GB
      percentage: 10
    };
  }

  private getNetworkMetrics(): SystemMetrics['network'] {
    // Placeholder network metrics
    return {
      bytesIn: 1024 * 1024, // 1MB
      bytesOut: 512 * 1024, // 512KB
      packetsIn: 1000,
      packetsOut: 800
    };
  }

  private getProcessMetrics(): SystemMetrics['processes'] {
    return {
      active: 1,
      total: 1
    };
  }

  private checkThresholds(metrics: SystemMetrics): void {
    // Check CPU threshold
    if (metrics.cpu.usage > 80) {
      this.emit('threshold', {
        type: 'cpu',
        value: metrics.cpu.usage,
        threshold: 80,
        severity: 'warning'
      });
    }

    // Check memory threshold
    if (metrics.memory.percentage > 85) {
      this.emit('threshold', {
        type: 'memory',
        value: metrics.memory.percentage,
        threshold: 85,
        severity: 'warning'
      });
    }

    // Check disk threshold
    if (metrics.disk.percentage > 90) {
      this.emit('threshold', {
        type: 'disk',
        value: metrics.disk.percentage,
        threshold: 90,
        severity: 'critical'
      });
    }
  }
}