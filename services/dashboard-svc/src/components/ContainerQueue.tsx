import React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock,
  Shield,
  User,
  Box,
  AlertTriangle,
  Edit3
} from 'lucide-react'
import { Clearance } from '../App'
import { cn } from '../lib/utils'

interface ContainerQueueProps {
  clearances: Clearance[]
  onSelect: (clearance: Clearance) => void
  onOverride: (clearance: Clearance) => void
  selectedId?: string
}

export function ContainerQueue({ 
  clearances, 
  onSelect, 
  onOverride,
  selectedId 
}: ContainerQueueProps) {
  const getLaneIcon = (lane: string) => {
    switch (lane) {
      case 'GREEN':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'YELLOW':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'RED':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getLaneColor = (lane: string) => {
    switch (lane) {
      case 'GREEN':
        return 'bg-green-500/10 border-green-500/30 text-green-500'
      case 'YELLOW':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
      case 'RED':
        return 'bg-red-500/10 border-red-500/30 text-red-500'
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-500'
    }
  }

  const getLaneBadge = (lane: string) => {
    switch (lane) {
      case 'GREEN':
        return 'Auto-Release'
      case 'YELLOW':
        return 'Review Required'
      case 'RED':
        return 'Physical Inspection'
      default:
        return 'Processing'
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Unknown'
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Container Queue</h2>
        <span className="text-sm text-muted-foreground">
          {clearances.length} items
        </span>
      </div>

      <div className="grid gap-3">
        {clearances.map((clearance, index) => (
          <motion.div
            key={clearance.clearance_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(clearance)}
            className={cn(
              "group relative cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md",
              selectedId === clearance.clearance_id 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg border",
                  getLaneColor(clearance.lane)
                )}>
                  {getLaneIcon(clearance.lane)}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono font-medium">{clearance.container_id}</span>
                    <span className="text-xs text-muted-foreground">
                      {clearance.clearance_id}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{clearance.importer_gstin}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      getLaneColor(clearance.lane)
                    )}>
                      {clearance.lane} LANE
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getLaneBadge(clearance.lane)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{clearance.risk_score}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
                
                {clearance.vision_result?.anomaly_detected && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Anomaly Detected</span>
                  </div>
                )}
                
                {clearance.blockchain_trust && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Trust: {clearance.blockchain_trust.score}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(clearance.created_at)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({formatTimeAgo(clearance.created_at)})
                  </span>
                </div>
              </div>
            </div>

            {/* Override Button */}
            {(clearance.lane === 'YELLOW' || clearance.lane === 'RED') && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onOverride(clearance)
                }}
                className="absolute right-4 bottom-4 flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/90"
              >
                <Edit3 className="h-3 w-3" />
                Override
              </motion.button>
            )}

            {/* Already Overridden Badge */}
            {clearance.officer_override && (
              <div className="absolute right-4 bottom-4 flex items-center gap-1 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-500">
                <Edit3 className="h-3 w-3" />
                Overridden
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
