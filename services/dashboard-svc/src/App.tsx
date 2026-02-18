import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Activity, Users, Package, AlertTriangle } from 'lucide-react'
import { ContainerQueue } from './components/ContainerQueue'
import { StatsPanel } from './components/StatsPanel'
import { HeatmapViewer } from './components/HeatmapViewer'
import { OverrideModal } from './components/OverrideModal'
import { useWebSocket } from './hooks/useWebSocket'
import { cn } from './lib/utils'

export interface Clearance {
  clearance_id: string
  container_id: string
  importer_gstin: string
  lane: 'GREEN' | 'YELLOW' | 'RED'
  risk_score: number
  status: 'PROCESSING' | 'COMPLETED' | 'ERROR'
  vision_result?: {
    anomaly_detected: boolean
    heatmap_url: string
    confidence: number
    detections: Array<{
      label: string
      confidence: number
      bbox: number[]
    }>
  }
  blockchain_trust?: {
    score: number
    years_active: number
    violations: number
    aeo_tier: number
  }
  officer_override?: boolean
  created_at?: string
}

export interface DashboardStats {
  totalProcessed: number
  greenLaneCount: number
  yellowLaneCount: number
  redLaneCount: number
  avgProcessingTime: number
  seizureCount: number
  accuracy: number
}

function App() {
  const [selectedClearance, setSelectedClearance] = useState<Clearance | null>(null)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'queue' | 'heatmap'>('queue')
  
  const { data: wsData, isConnected } = useWebSocket('ws://localhost:8000/ws/stats')
  
  const [clearances, setClearances] = useState<Clearance[]>([
    {
      clearance_id: 'CLR-20260218-001',
      container_id: 'TCMU-2026-00147',
      importer_gstin: '27AABCU9603R1ZN',
      lane: 'GREEN',
      risk_score: 15,
      status: 'COMPLETED',
      vision_result: {
        anomaly_detected: false,
        heatmap_url: 'https://storage.scannr.in/heatmaps/demo1.png',
        confidence: 0.05,
        detections: []
      },
      blockchain_trust: {
        score: 88,
        years_active: 7,
        violations: 0,
        aeo_tier: 1
      },
      created_at: new Date().toISOString()
    },
    {
      clearance_id: 'CLR-20260218-002',
      container_id: 'TCMU-2026-00148',
      importer_gstin: '29ABCDE1234F1Z5',
      lane: 'YELLOW',
      risk_score: 45,
      status: 'COMPLETED',
      vision_result: {
        anomaly_detected: true,
        heatmap_url: 'https://storage.scannr.in/heatmaps/demo2.png',
        confidence: 0.65,
        detections: [
          { label: 'density_anomaly', confidence: 0.65, bbox: [120, 140, 320, 360] }
        ]
      },
      blockchain_trust: {
        score: 62,
        years_active: 3,
        violations: 1,
        aeo_tier: 0
      },
      created_at: new Date(Date.now() - 300000).toISOString()
    },
    {
      clearance_id: 'CLR-20260218-003',
      container_id: 'TCMU-2026-00149',
      importer_gstin: '33FGHIJ5678K1Z9',
      lane: 'RED',
      risk_score: 78,
      status: 'COMPLETED',
      vision_result: {
        anomaly_detected: true,
        heatmap_url: 'https://storage.scannr.in/heatmaps/demo3.png',
        confidence: 0.92,
        detections: [
          { label: 'weapon', confidence: 0.92, bbox: [200, 180, 400, 380] },
          { label: 'narcotic', confidence: 0.87, bbox: [150, 200, 350, 400] }
        ]
      },
      blockchain_trust: {
        score: 35,
        years_active: 1,
        violations: 3,
        aeo_tier: 0
      },
      created_at: new Date(Date.now() - 600000).toISOString()
    }
  ])

  const stats: DashboardStats = {
    totalProcessed: 1247,
    greenLaneCount: 873,
    yellowLaneCount: 249,
    redLaneCount: 125,
    avgProcessingTime: 47,
    seizureCount: 18,
    accuracy: 94.2
  }

  useEffect(() => {
    if (wsData) {
      console.log('WebSocket data received:', wsData)
    }
  }, [wsData])

  const handleOverride = (clearance: Clearance) => {
    setSelectedClearance(clearance)
    setOverrideModalOpen(true)
  }

  const submitOverride = async (clearanceId: string, reason: string, newLane: 'GREEN' | 'YELLOW' | 'RED') => {
    try {
      const response = await fetch('/api/officer/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          clearance_id: clearanceId,
          officer_id: 'OFF-MUM-0042',
          override_to: newLane,
          reason
        })
      })
      
      if (response.ok) {
        setClearances(prev => prev.map(c => 
          c.clearance_id === clearanceId 
            ? { ...c, lane: newLane, officer_override: true }
            : c
        ))
      }
    } catch (error) {
      console.error('Override failed:', error)
    }
    setOverrideModalOpen(false)
    setSelectedClearance(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b bg-card px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SCANNR</h1>
              <p className="text-sm text-muted-foreground">AI-Enabled Customs Clearance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"
              )} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Live' : 'Reconnecting...'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Officer: OFF-MUM-0042</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Stats Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="border-b bg-muted/50 px-6 py-4"
      >
        <StatsPanel stats={stats} />
      </motion.div>

      {/* Main Content */}
      <main className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === 'queue' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <Package className="h-4 w-4" />
              Container Queue
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              disabled={!selectedClearance}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === 'heatmap' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80 disabled:opacity-50"
              )}
            >
              <Activity className="h-4 w-4" />
              Heatmap View
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span>{clearances.filter(c => c.lane === 'YELLOW').length} items require review</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'queue' ? (
            <motion.div
              key="queue"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ContainerQueue 
                clearances={clearances}
                onSelect={setSelectedClearance}
                onOverride={handleOverride}
                selectedId={selectedClearance?.clearance_id}
              />
            </motion.div>
          ) : (
            <motion.div
              key="heatmap"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <HeatmapViewer 
                clearance={selectedClearance}
                onBack={() => setActiveTab('queue')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Override Modal */}
      <OverrideModal
        isOpen={overrideModalOpen}
        onClose={() => {
          setOverrideModalOpen(false)
          setSelectedClearance(null)
        }}
        clearance={selectedClearance}
        onSubmit={submitOverride}
      />
    </div>
  )
}

export default App
