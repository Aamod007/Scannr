import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Shield,
  User,
  Box,
  Clock,
  Crosshair,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { Clearance } from '../App'
import { cn } from '../lib/utils'

interface HeatmapViewerProps {
  clearance: Clearance | null
  onBack: () => void
}

export function HeatmapViewer({ clearance, onBack }: HeatmapViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [showDetections, setShowDetections] = useState(true)

  if (!clearance) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border bg-muted/50">
        <div className="text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Select a container to view heatmap</p>
        </div>
      </div>
    )
  }

  const getLaneColor = (lane: string) => {
    switch (lane) {
      case 'GREEN':
        return 'text-green-500 bg-green-500/10 border-green-500/30'
      case 'YELLOW':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
      case 'RED':
        return 'text-red-500 bg-red-500/10 border-red-500/30'
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getLaneIcon = (lane: string) => {
    switch (lane) {
      case 'GREEN':
        return <CheckCircle2 className="h-5 w-5" />
      case 'YELLOW':
        return <AlertTriangle className="h-5 w-5" />
      case 'RED':
        return <XCircle className="h-5 w-5" />
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Queue
          </button>
          
          <div>
            <h2 className="text-lg font-semibold">X-Ray Analysis</h2>
            <p className="text-sm text-muted-foreground">
              {clearance.container_id} • {clearance.clearance_id}
            </p>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2",
          getLaneColor(clearance.lane)
        )}>
          {getLaneIcon(clearance.lane)}
          <span className="font-medium">{clearance.lane} LANE</span>
          <span className="text-lg font-bold">{clearance.risk_score}/100</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Image Viewer */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-lg border bg-black">
            {/* Toolbar */}
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-white">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Detection Toggle */}
            <div className="absolute right-4 top-4 z-10">
              <button
                onClick={() => setShowDetections(!showDetections)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  showDetections 
                    ? "bg-green-500 text-white" 
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <Crosshair className="h-3 w-3" />
                {showDetections ? 'Detections On' : 'Detections Off'}
              </button>
            </div>

            {/* Image Container */}
            <div 
              className="relative flex h-[500px] items-center justify-center overflow-hidden"
              style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
            >
              {/* Placeholder X-Ray Image */}
              <div 
                className="relative transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                <div className="flex h-[400px] w-[600px] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-16 w-16 text-slate-600" />
                    <p className="mt-2 text-sm text-slate-500">X-Ray Image</p>
                    <p className="text-xs text-slate-600">{clearance.container_id}</p>
                  </div>
                </div>

                {/* Detection Bounding Boxes */}
                {showDetections && clearance.vision_result?.detections.map((detection, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="absolute border-2 border-red-500 bg-red-500/20"
                    style={{
                      left: `${(detection.bbox[0] / 640) * 100}%`,
                      top: `${(detection.bbox[1] / 640) * 100}%`,
                      width: `${((detection.bbox[2] - detection.bbox[0]) / 640) * 100}%`,
                      height: `${((detection.bbox[3] - detection.bbox[1]) / 640) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap rounded bg-red-500 px-2 py-0.5 text-xs text-white">
                      <AlertTriangle className="h-3 w-3" />
                      {detection.label} ({(detection.confidence * 100).toFixed(0)}%)
                    </div>
                  </motion.div>
                ))}

                {/* Heatmap Overlay */}
                {clearance.vision_result?.anomaly_detected && (
                  <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay">
                    <div className="h-full w-full bg-gradient-to-t from-red-500/50 via-yellow-500/30 to-transparent" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-4">
          {/* Detection Summary */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Detection Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Anomaly Detected</span>
                <span className={cn(
                  "font-medium",
                  clearance.vision_result?.anomaly_detected ? "text-red-500" : "text-green-500"
                )}>
                  {clearance.vision_result?.anomaly_detected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <span className="font-medium">
                  {((clearance.vision_result?.confidence || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Detections</span>
                <span className="font-medium">{clearance.vision_result?.detections.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Blockchain Trust */}
          {clearance.blockchain_trust && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Shield className="h-4 w-4" />
                Blockchain Trust Score
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trust Score</span>
                  <span className="text-lg font-bold text-primary">
                    {clearance.blockchain_trust.score}/100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Years Active</span>
                  <span className="font-medium">{clearance.blockchain_trust.years_active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Violations</span>
                  <span className={cn(
                    "font-medium",
                    clearance.blockchain_trust.violations > 0 ? "text-red-500" : "text-green-500"
                  )}>
                    {clearance.blockchain_trust.violations}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AEO Tier</span>
                  <span className="font-medium">
                    {clearance.blockchain_trust.aeo_tier > 0 ? `Tier ${clearance.blockchain_trust.aeo_tier}` : 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Container Info */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Container Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">ID:</span>
                <span className="font-mono text-sm">{clearance.container_id}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Importer:</span>
                <span className="font-mono text-sm">{clearance.importer_gstin}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Processed:</span>
                <span className="text-sm">
                  {clearance.created_at 
                    ? new Date(clearance.created_at).toLocaleString() 
                    : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Detections List */}
          {clearance.vision_result?.detections && clearance.vision_result.detections.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 font-semibold">Detected Items</h3>
              <div className="space-y-2">
                {clearance.vision_result.detections.map((detection, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between rounded-md bg-red-500/10 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium capitalize">
                        {detection.label.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm text-red-500">
                      {(detection.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
