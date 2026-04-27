import { useState, useEffect, useRef, useCallback } from 'react';

export type WSStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Custom hook for WebSocket connectivity to the dashboard-svc live stats feed.
 * Handles automatic reconnection with exponential backoff.
 */
export function useWebSocket(path = '/ws/stats') {
  const [status, setStatus] = useState<WSStatus>('CONNECTING');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const connectRef = useRef<() => void>(() => undefined);

  const connect = useCallback(() => {
    const configured = import.meta.env.VITE_WS_BASE;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.DEV
      ? `${configured ?? `${protocol}//${window.location.host}`}${path}`
      : `${protocol}//${window.location.host}${path}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('CONNECTED');
      retryCount.current = 0;
    };

    ws.onclose = () => {
      setStatus('DISCONNECTED');
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
      retryCount.current++;
      reconnectTimeout.current = setTimeout(() => connectRef.current(), delay);
    };

    ws.onerror = () => setStatus('ERROR');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch {
        console.error('Failed to parse WS message');
      }
    };
  }, [path]);

  useEffect(() => {
    connectRef.current = connect;
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  return { status, lastMessage };
}
