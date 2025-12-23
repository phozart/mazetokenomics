'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Network,
  GitBranch,
  Loader2,
} from 'lucide-react';

/**
 * Network Graph Visualization Component
 * Uses vis-network for interactive graph rendering
 *
 * Note: vis-network must be installed: npm install vis-network vis-data
 */
export function NetworkGraph({
  nodes = [],
  edges = [],
  clusters = [],
  options = {},
  onNodeClick,
  className,
  loading = false,
}) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [viewMode, setViewMode] = useState('force'); // 'force' or 'hierarchical'
  const [initialized, setInitialized] = useState(false);

  // Initialize network
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Dynamic import to avoid SSR issues
    const initNetwork = async () => {
      try {
        const { Network } = await import('vis-network');
        const { DataSet } = await import('vis-data');

        // Create datasets
        const nodesDataset = new DataSet(nodes);
        const edgesDataset = new DataSet(edges);

        // Merge options with defaults
        const networkOptions = {
          ...getDefaultOptions(viewMode),
          ...options,
        };

        // Create network
        networkRef.current = new Network(
          containerRef.current,
          { nodes: nodesDataset, edges: edgesDataset },
          networkOptions
        );

        // Event handlers
        networkRef.current.on('click', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodes.find((n) => n.id === nodeId);
            if (node && onNodeClick) {
              onNodeClick(node);
            }
          }
        });

        // Stabilization complete
        networkRef.current.on('stabilizationIterationsDone', () => {
          networkRef.current.setOptions({ physics: { enabled: false } });
        });

        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize network graph:', error);
      }
    };

    initNetwork();

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [nodes, edges, viewMode]);

  // Update physics when view mode changes
  useEffect(() => {
    if (networkRef.current && initialized) {
      networkRef.current.setOptions(getDefaultOptions(viewMode));
    }
  }, [viewMode, initialized]);

  // Zoom controls
  const handleZoomIn = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale * 1.3 });
    }
  };

  const handleZoomOut = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale / 1.3 });
    }
  };

  const handleFit = () => {
    if (networkRef.current) {
      networkRef.current.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    }
  };

  const handleReset = () => {
    if (networkRef.current) {
      networkRef.current.setOptions({ physics: { enabled: true } });
      networkRef.current.stabilize(100);
    }
  };

  return (
    <div className={cn('bg-dark-card border border-dark-border rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-200">Network Graph</h3>
          <span className="text-xs text-gray-500">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-dark-hover rounded-lg p-1">
            <button
              onClick={() => setViewMode('force')}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors flex items-center gap-1',
                viewMode === 'force'
                  ? 'bg-brand-400/20 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <Network className="w-3 h-3" />
              Force
            </button>
            <button
              onClick={() => setViewMode('hierarchical')}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors flex items-center gap-1',
                viewMode === 'hierarchical'
                  ? 'bg-brand-400/20 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <GitBranch className="w-3 h-3" />
              Tree
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-dark-hover rounded text-gray-400 hover:text-gray-200"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-dark-hover rounded text-gray-400 hover:text-gray-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFit}
              className="p-1.5 hover:bg-dark-hover rounded text-gray-400 hover:text-gray-200"
              title="Fit to View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 hover:bg-dark-hover rounded text-gray-400 hover:text-gray-200"
              title="Reset Layout"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph container */}
      <div className="relative" style={{ height: '500px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-card/80 z-10">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          </div>
        )}

        {nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Network className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No graph data available</p>
              <p className="text-xs text-gray-500 mt-1">
                Run holder analysis to generate network graph
              </p>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ background: '#0f1419' }}
        />
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-dark-border">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-gray-500">Legend:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-brand-400" />
            <span className="text-gray-400">Holder</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-400">Exchange</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-400">DEX</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-400">Mixer / Flagged</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-gray-400">Unknown</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get default network options based on view mode
 */
function getDefaultOptions(viewMode) {
  const baseOptions = {
    nodes: {
      font: {
        size: 12,
        color: '#f9fafb',
        face: 'monospace',
      },
      scaling: {
        min: 15,
        max: 40,
        label: {
          enabled: true,
          min: 10,
          max: 16,
        },
      },
      borderWidth: 2,
      borderWidthSelected: 3,
    },
    edges: {
      color: {
        color: '#4b5563',
        highlight: '#5ECEC6',
        hover: '#5ECEC6',
      },
      width: 1,
      smooth: {
        type: viewMode === 'hierarchical' ? 'cubicBezier' : 'continuous',
        forceDirection: viewMode === 'hierarchical' ? 'vertical' : 'none',
      },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.5,
        },
      },
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      zoomView: true,
      dragView: true,
      dragNodes: true,
    },
    groups: {
      holder: { color: { background: '#5ECEC6', border: '#4DB8B0' } },
      exchange: { color: { background: '#3b82f6', border: '#2563eb' } },
      dex: { color: { background: '#8b5cf6', border: '#7c3aed' } },
      mixer: { color: { background: '#ef4444', border: '#dc2626' } },
      contract: { color: { background: '#6b7280', border: '#4b5563' } },
      unknown: { color: { background: '#9ca3af', border: '#6b7280' } },
    },
  };

  if (viewMode === 'hierarchical') {
    return {
      ...baseOptions,
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD', // Up-Down
          sortMethod: 'directed',
          levelSeparation: 100,
          nodeSpacing: 150,
        },
      },
      physics: {
        enabled: false,
      },
    };
  }

  // Force-directed layout
  return {
    ...baseOptions,
    layout: {
      hierarchical: {
        enabled: false,
      },
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -100,
        centralGravity: 0.01,
        springLength: 150,
        springConstant: 0.05,
        damping: 0.4,
      },
      stabilization: {
        enabled: true,
        iterations: 200,
        updateInterval: 25,
      },
    },
  };
}

export default NetworkGraph;
