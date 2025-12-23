import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/tokens/[id]/holder-analysis/graph
 * Get network graph data for visualization
 *
 * Returns data formatted for vis-network or similar graph libraries
 */
export async function GET(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get vetting process with holder analysis
    const vettingProcess = await prisma.vettingProcess.findUnique({
      where: { id },
      include: {
        token: true,
        holderAnalysis: {
          include: {
            walletTraces: {
              orderBy: { percentage: 'desc' },
            },
          },
        },
      },
    });

    if (!vettingProcess) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (!vettingProcess.holderAnalysis) {
      return NextResponse.json({ error: 'Holder analysis not found' }, { status: 404 });
    }

    const { holderAnalysis } = vettingProcess;

    // Build vis-network compatible data structure
    const nodes = [];
    const edges = [];

    // If we have stored funding graph data, use it
    if (holderAnalysis.fundingGraph) {
      const graphData = holderAnalysis.fundingGraph;

      // Convert nodes
      if (graphData.nodes) {
        graphData.nodes.forEach((node, index) => {
          const nodeType = node.type || 'unknown';
          const isHolder = nodeType === 'holder';

          nodes.push({
            id: node.address,
            label: truncateAddress(node.address),
            title: buildNodeTooltip(node),
            group: nodeType,
            value: isHolder ? (node.percentage || 1) : 0.5,
            shape: isHolder ? 'dot' : 'diamond',
            color: getNodeColor(nodeType, node.flags),
            font: { color: '#f9fafb' },
            borderWidth: node.flags?.length > 0 ? 3 : 1,
            borderWidthSelected: 4,
          });
        });
      }

      // Convert edges
      if (graphData.edges) {
        graphData.edges.forEach((edge, index) => {
          edges.push({
            id: `edge_${index}`,
            from: edge.from,
            to: edge.to,
            arrows: 'to',
            color: { color: '#6b7280', highlight: '#5ECEC6' },
            width: 1,
            title: edge.amount ? `Amount: ${edge.amount}` : 'Funding',
          });
        });
      }
    } else {
      // Build graph from wallet traces
      const walletTraces = holderAnalysis.walletTraces || [];

      walletTraces.forEach((wallet, index) => {
        // Add holder node
        nodes.push({
          id: wallet.walletAddress,
          label: truncateAddress(wallet.walletAddress),
          title: buildWalletTooltip(wallet),
          group: wallet.walletType?.toLowerCase() || 'unknown',
          value: wallet.percentage || 1,
          shape: 'dot',
          color: getNodeColor(wallet.walletType, wallet.riskFlags),
          font: { color: '#f9fafb' },
          borderWidth: wallet.hasCriticalFlag ? 3 : 1,
        });

        // Add funding source edge if available
        if (wallet.primaryFundingSource) {
          // Add funding source node if not exists
          const sourceId = wallet.primaryFundingSource.toLowerCase();
          if (!nodes.find(n => n.id.toLowerCase() === sourceId)) {
            nodes.push({
              id: wallet.primaryFundingSource,
              label: truncateAddress(wallet.primaryFundingSource),
              title: `Funding Source\nType: ${wallet.fundingSourceType || 'Unknown'}`,
              group: wallet.fundingSourceType || 'unknown',
              value: 0.5,
              shape: 'diamond',
              color: getNodeColor(wallet.fundingSourceType),
              font: { color: '#f9fafb' },
            });
          }

          edges.push({
            id: `edge_${index}`,
            from: wallet.primaryFundingSource,
            to: wallet.walletAddress,
            arrows: 'to',
            color: { color: '#6b7280', highlight: '#5ECEC6' },
            width: 1,
          });
        }
      });
    }

    // Build cluster data for highlighting
    const clusters = holderAnalysis.clusters || [];

    return NextResponse.json({
      nodes,
      edges,
      clusters,
      hubs: holderAnalysis.fundingGraph?.hubs || [],
      metrics: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        density: holderAnalysis.graphDensity,
        clusterCount: holderAnalysis.clusterCount,
        hubCount: holderAnalysis.hubWalletCount,
      },
      options: getGraphOptions(),
    });
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
}

/**
 * Truncate address for display
 */
function truncateAddress(address) {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get node color based on type and risk flags
 */
function getNodeColor(type, flags = []) {
  const hasCritical = flags?.some(f => f.severity === 'critical');
  const hasHigh = flags?.some(f => f.severity === 'high');

  if (hasCritical) return { background: '#ef4444', border: '#dc2626' }; // Red
  if (hasHigh) return { background: '#f97316', border: '#ea580c' }; // Orange

  switch (type?.toLowerCase()) {
    case 'holder':
      return { background: '#5ECEC6', border: '#4DB8B0' }; // Teal
    case 'exchange':
      return { background: '#3b82f6', border: '#2563eb' }; // Blue
    case 'dex':
      return { background: '#8b5cf6', border: '#7c3aed' }; // Purple
    case 'mixer':
      return { background: '#ef4444', border: '#dc2626' }; // Red
    case 'contract':
      return { background: '#6b7280', border: '#4b5563' }; // Gray
    default:
      return { background: '#9ca3af', border: '#6b7280' }; // Light gray
  }
}

/**
 * Build tooltip content for a node
 */
function buildNodeTooltip(node) {
  let tooltip = `Address: ${node.address}\n`;
  tooltip += `Type: ${node.type || 'Unknown'}\n`;

  if (node.percentage) {
    tooltip += `Holdings: ${node.percentage.toFixed(2)}%\n`;
  }

  if (node.flags?.length > 0) {
    tooltip += `\nFlags:\n`;
    node.flags.forEach(flag => {
      tooltip += `- [${flag.severity}] ${flag.description}\n`;
    });
  }

  return tooltip;
}

/**
 * Build tooltip for wallet trace
 */
function buildWalletTooltip(wallet) {
  let tooltip = `Address: ${wallet.walletAddress}\n`;
  tooltip += `Holdings: ${wallet.percentage?.toFixed(2) || '?'}%\n`;
  tooltip += `Age: ${wallet.ageInDays || '?'} days\n`;
  tooltip += `Type: ${wallet.walletType || 'Unknown'}\n`;

  if (wallet.clusterId) {
    tooltip += `Cluster: ${wallet.clusterId}\n`;
  }

  if (wallet.riskFlagCount > 0) {
    tooltip += `Risk Flags: ${wallet.riskFlagCount}\n`;
  }

  return tooltip;
}

/**
 * Get vis-network graph options
 */
function getGraphOptions() {
  return {
    nodes: {
      font: {
        size: 12,
        face: 'monospace',
      },
      scaling: {
        min: 10,
        max: 50,
        label: {
          enabled: true,
          min: 10,
          max: 20,
        },
      },
    },
    edges: {
      smooth: {
        type: 'continuous',
      },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.5,
        },
      },
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springLength: 100,
        springConstant: 0.08,
        damping: 0.4,
      },
      stabilization: {
        iterations: 100,
        updateInterval: 25,
      },
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      zoomView: true,
      dragView: true,
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
}
