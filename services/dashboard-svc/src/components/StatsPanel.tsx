import React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock,
  Target,
  TrendingUp,
  Shield
} from 'lucide-react'
import { DashboardStats } from '../App'
import { cn } from '../lib/utils'

interface StatsPanelProps {
  stats: DashboardStats
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const statCards = [
    {
      label: 'Total Processed',
      value: stats.totalProcessed.toLocaleString(),
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Green Lane',
      value: stats.greenLaneCount.toLocaleString(),
      subtext: `${((stats.greenLaneCount / stats.totalProcessed) * 100).toFixed(1)}%`,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Yellow Lane',
      value: stats.yellowLaneCount.toLocaleString(),
      subtext: `${((stats.yellowLaneCount / stats.totalProcessed) * 100).toFixed(1)}%`,
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      label: 'Red Lane',
      value: stats.redLaneCount.toLocaleString(),
      subtext: `${((stats.redLaneCount / stats.totalProcessed) * 100).toFixed(1)}%`,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      label: 'Avg Processing',
      value: `${stats.avgProcessingTime}s`,
      subtext: 'Target: <180s',
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Seizures',
      value: stats.seizureCount.toString(),
      subtext: `${((stats.seizureCount / stats.totalProcessed) * 100).toFixed(2)}% rate`,
      icon: Shield,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      label: 'AI Accuracy',
      value: `${stats.accuracy}%`,
      subtext: 'Last 24h',
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-lg border bg-card p-3"
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              stat.bgColor
            )}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">{stat.value}</span>
                {stat.subtext && (
                  <span className="text-xs text-muted-foreground">{stat.subtext}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
