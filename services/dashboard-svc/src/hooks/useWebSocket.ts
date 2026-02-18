import { useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  type: 'stats' | 'clearance_update' | 'alert'
  data: unknown
  timestamp: string
}

export function useWebSocket(url: string) {
  const [data, setData] = useState<WebSocketMessage | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setData(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        // Attempt to reconnect after 5 seconds
        reconnectTimeout.current = setTimeout(connect, 5000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setIsConnected(false)
    }
  }, [url])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [connect])

  return { data, isConnected }
}
