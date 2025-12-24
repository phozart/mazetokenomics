import { NextResponse } from 'next/server';

// Major cryptocurrency CoinGecko IDs and their symbols
const MAJOR_COINS = [
  { id: 'solana', symbol: 'SOL', name: 'Solana', logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', logoUrl: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', logoUrl: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', logoUrl: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', logoUrl: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
  { id: 'tron', symbol: 'TRX', name: 'TRON', logoUrl: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png' },
];

export async function GET() {
  try {
    const ids = MAJOR_COINS.map(c => c.id).join(',');

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch prices from CoinGecko');
    }

    const data = await response.json();

    // Map to our format
    const coins = MAJOR_COINS.map(coin => {
      const priceData = data[coin.id];
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        logoUrl: coin.logoUrl,
        priceUsd: priceData?.usd || null,
        priceChange24h: priceData?.usd_24h_change || null,
        marketCap: priceData?.usd_market_cap || null,
        volume24h: priceData?.usd_24h_vol || null,
      };
    });

    return NextResponse.json({ coins });
  } catch (error) {
    console.error('Error fetching major prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
