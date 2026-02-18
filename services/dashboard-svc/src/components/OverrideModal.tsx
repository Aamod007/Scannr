import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, CheckCircle2, AlertCircle, XCircle, MessageSquare } from 'lucide-react'
import { Clearance } from '../App'
import { cn } from '../lib/utils'

interface OverrideModalProps {
  isOpen: boolean
  onClose: () => void
  clearance: Clearance | null
  onSubmit: (clearanceId: string, reason: string, newLane: 'GREEN' | 'YELLOW' | 'RED') => void
}

export function OverrideModal({ isOpen, onClose, clearance, onSubmit }: OverrideModalProps) {
  const [selectedLane, setSelectedLane] = useState<'GREEN' | 'YELLOW' | 'RED' | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!isOpen || !clearance) return null

  const handleSubmit = () => {
    if (!selectedLane) {
      setError('Please select a lane')
      return
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the override')
      return
    }
    
    onSubmit(clearance.clearance_id, reason, selectedLane)
    setSelectedLane(null)
    setReason('')
    setError('')
  }

  const handleClose = () => {
    setSelectedLane(null)
    setReason('')
    setError('')
    onClose()
  }

  const laneOptions: Array<{ value: 'GREEN' | 'YELLOW' | 'RED'; label: string; icon: typeof CheckCircle2; color: string; desc: string }> = [
    {
      value: 'GREEN',
      label: 'Green Lane',
      icon: CheckCircle2,
      color: 'text-green-500 bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
      desc: 'Auto-release without inspection'
    },
    {
      value: 'YELLOW',
      label: 'Yellow Lane',
      icon: AlertCircle,
      color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20',
      desc: 'Officer review required'
    },
    {
      value: 'RED',
      label: 'Red Lane',
      icon: XCircle,
      color: 'text-red-500 bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
      desc: 'Physical inspection mandatory'
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Override Clearance Decision</h2>
                <p className="text-sm text-muted-foreground">
                  {clearance.container_id} • Current: {clearance.lane} Lane
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning */}
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-yellow-500/10 p-4 text-yellow-500">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Override Confirmation Required</p>
                <p className="text-yellow-500/80">
                  This action will override the AI decision and will be logged for audit purposes. 
                  Please ensure you have valid reasons for this override.
                </p>
              </div>
            </div>

            {/* Lane Selection */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium">
                Select New Lane
              </label>
              <div className="grid gap-2">
                {laneOptions.map((lane) => (
                  <button
                    key={lane.value}
                    onClick={() => {
                      setSelectedLane(lane.value)
                      setError('')
                    }}
                    disabled={clearance.lane === lane.value}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      selectedLane === lane.value
                        ? lane.color
                        : "border-border bg-muted/50 hover:bg-muted",
                      clearance.lane === lane.value && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <lane.icon className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-medium">{lane.label}</p>
                      <p className="text-xs opacity-80">{lane.desc}</p>
                    </div>
                    {selectedLane === lane.value && (
                      <div className="h-4 w-4 rounded-full bg-current" />
                    )}
                    {clearance.lane === lane.value && (
                      <span className="text-xs">Current</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Input */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium">
                Override Reason
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setError('')
                  }}
                  placeholder="Describe your reason for overriding the AI decision..."
                  className="min-h-[100px] w-full rounded-lg border bg-background px-10 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                This reason will be logged for audit purposes.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500"
              >
                {error}
              </motion.div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedLane || !reason.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Confirm Override
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
