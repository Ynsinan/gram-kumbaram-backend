import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import type { GoldPrice, GoldPricesResponse, GoldType } from '../types/index.js';
import { GoldTypeEnum, GOLD_TYPES, GOLD_TYPE_NAMES } from '../types/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALTIN_IN_URL = 'https://altin.in/';
const BIGPARA_URL = 'https://bigpara.hurriyet.com.tr/altin/';

// Create axios instance without proxy
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: true,
  }),
  proxy: false,
  timeout: 15000,
});

// Parse Turkish format: 6.908,23 (dot=thousand, comma=decimal)
const parseTurkishPrice = (priceText: string): number => {
  if (!priceText) return 0;

  const cleaned = priceText
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')  // Remove thousand separator
    .replace(',', '.');   // Convert decimal separator

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Parse international format: 5323.9200 (dot=decimal)
const parseInternationalPrice = (priceText: string): number => {
  if (!priceText) return 0;

  const cleaned = priceText
    .trim()
    .replace(/\s/g, '')
    .replace(/,/g, '');  // Remove any commas (thousand separator)

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Scrape from altin.in (Primary source)
const scrapeAltinIn = async (): Promise<Partial<Record<GoldType, GoldPrice>>> => {
  const response = await axiosInstance.get(ALTIN_IN_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  const $ = cheerio.load(response.data);
  const prices: Partial<Record<GoldType, GoldPrice>> = {};

  // URL pattern → integer gold type mapping
  const urlPatterns: Record<string, GoldType> = {
    'gram-altin': GoldTypeEnum.GRAM,
    'ceyrek-altin': GoldTypeEnum.CEYREK,
    'yarim-altin': GoldTypeEnum.YARIM,
    'cumhuriyet-altini': GoldTypeEnum.CUMHURIYET,
  };

  // Find all h2 elements with links
  $('h2 a, h2').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href') || $el.find('a').attr('href') || '';
    const text = $el.text().toLowerCase();

    let goldType: GoldType | null = null;

    // Match by URL
    for (const [pattern, type] of Object.entries(urlPatterns)) {
      if (href.includes(pattern)) {
        goldType = type;
        break;
      }
    }

    // Match by text if URL didn't match
    if (!goldType) {
      if (text.includes('gram altın') || text.includes('gram altin')) goldType = GoldTypeEnum.GRAM;
      else if (text.includes('çeyrek') || text.includes('ceyrek')) goldType = GoldTypeEnum.CEYREK;
      else if (text.includes('yarım') || text.includes('yarim')) goldType = GoldTypeEnum.YARIM;
      else if (text.includes('cumhuriyet')) goldType = GoldTypeEnum.CUMHURIYET;
    }

    if (!goldType || prices[goldType]) return;

    // Find parent container and look for price values
    const $parent = $el.closest('li, div, section');
    const $nextSiblings = $parent.nextAll('li').slice(0, 2);

    if ($nextSiblings.length >= 2) {
      const buyPrice = parseInternationalPrice($nextSiblings.eq(0).text());
      const sellPrice = parseInternationalPrice($nextSiblings.eq(1).text());

      if (buyPrice > 0 && sellPrice > 0) {
        prices[goldType] = {
          id: goldType,
          name: GOLD_TYPE_NAMES[goldType],
          buyPrice,
          sellPrice,
        };
      }
    }
  });

  // Alternative: Look for price patterns near gold type mentions
  if (Object.keys(prices).length < 4) {
    const patterns: Array<{ type: GoldType; regex: RegExp }> = [
      { type: GoldTypeEnum.GRAM, regex: /Gram\s*Alt[ıi]n\s*Fiyatlar[ıi][^\d]*(\d+\.\d+)[^\d]*(\d+\.\d+)/i },
      { type: GoldTypeEnum.CEYREK, regex: /[ÇC]eyrek\s*Alt[ıi]n\s*Fiyat[ıi][^\d]*(\d+\.\d+)[^\d]*(\d+\.\d+)/i },
      { type: GoldTypeEnum.YARIM, regex: /Yar[ıi]m\s*Alt[ıi]n\s*Fiyatlar[ıi][^\d]*(\d+\.\d+)[^\d]*(\d+\.\d+)/i },
      { type: GoldTypeEnum.CUMHURIYET, regex: /Cumhuriyet\s*Alt[ıi]n[ıi][^\d]*(\d+\.\d+)[^\d]*(\d+\.\d+)/i },
    ];

    const pageText = $('body').text();

    for (const { type, regex } of patterns) {
      if (prices[type]) continue;

      const match = pageText.match(regex);
      if (match?.[1] && match[2]) {
        const buyPrice = parseInternationalPrice(match[1]);
        const sellPrice = parseInternationalPrice(match[2]);

        if (buyPrice > 0 && sellPrice > 0) {
          prices[type] = {
            id: type,
            name: GOLD_TYPE_NAMES[type],
            buyPrice,
            sellPrice,
          };
        }
      }
    }
  }

  return prices;
};

// Scrape from Bigpara (Fallback source)
const scrapeBigpara = async (): Promise<Partial<Record<GoldType, GoldPrice>>> => {
  const response = await axiosInstance.get(BIGPARA_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  const $ = cheerio.load(response.data);
  const prices: Partial<Record<GoldType, GoldPrice>> = {};

  const urlPatterns: Record<string, GoldType> = {
    'gram-altin-fiyati': GoldTypeEnum.GRAM,
    'ceyrek-altin-fiyati': GoldTypeEnum.CEYREK,
    'yarim-altin-fiyati': GoldTypeEnum.YARIM,
    'cumhuriyet-altini-fiyati': GoldTypeEnum.CUMHURIYET,
  };

  // Find links and their associated prices
  $('a').each((_, element) => {
    const $link = $(element);
    const href = $link.attr('href') || '';

    let goldType: GoldType | null = null;
    for (const [pattern, type] of Object.entries(urlPatterns)) {
      if (href.includes(pattern)) {
        goldType = type;
        break;
      }
    }

    if (!goldType || prices[goldType]) return;

    // Find prices near this link
    const $parent = $link.closest('li, tr, div');
    const parentText = $parent.text();
    const priceMatches = parentText.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g);

    if (priceMatches && priceMatches.length >= 2) {
      // Bigpara uses Turkish format: 6.908,23
      const buyPrice = parseTurkishPrice(priceMatches[0] ?? '0');
      const sellPrice = parseTurkishPrice(priceMatches[1] ?? '0');

      if (buyPrice > 0 && sellPrice > 0) {
        prices[goldType] = {
          id: goldType,
          name: GOLD_TYPE_NAMES[goldType],
          buyPrice,
          sellPrice,
        };
      }
    }
  });

  return prices;
};

export const scrapeGoldPrices = async (): Promise<GoldPricesResponse> => {
  let prices: Partial<Record<GoldType, GoldPrice>> = {};

  // Try altin.in first
  try {
    console.log('Fetching prices from primary source...');
    prices = await scrapeAltinIn();
    console.log(`Primary source returned ${Object.keys(prices).length} gold types`);
  } catch (error) {
    console.warn('Failed to fetch from primary source:', error instanceof Error ? error.message : error);
  }

  // If primary failed or didn't return all types, try fallback
  if (Object.keys(prices).length < 4) {
    try {
      console.log('Fetching prices from fallback source...');
      const fallbackPrices = await scrapeBigpara();

      // Merge prices, prefer existing (primary) prices
      for (const [typeStr, price] of Object.entries(fallbackPrices)) {
        const type = Number(typeStr) as GoldType;
        if (!prices[type]) {
          prices[type] = price;
        }
      }
      console.log(`Combined sources returned ${Object.keys(prices).length} gold types`);
    } catch (error) {
      console.warn('Failed to fetch from fallback source:', error instanceof Error ? error.message : error);
    }
  }

  // Ensure all gold types have prices
  for (const type of GOLD_TYPES) {
    if (!prices[type]) {
      console.warn(`Missing price data for ${GOLD_TYPE_NAMES[type]}`);
      prices[type] = {
        id: type,
        name: GOLD_TYPE_NAMES[type],
        buyPrice: 0,
        sellPrice: 0,
      };
    }
  }

  if (Object.values(prices).every(p => p.buyPrice === 0)) {
    throw new Error('Altın fiyatları alınamadı');
  }

  return {
    prices: prices as Record<GoldType, GoldPrice>,
    lastUpdated: new Date().toISOString(),
  };
};

// Cache for prices
let priceCache: GoldPricesResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

// Calculate daily change percentage
const calculateDailyChange = (currentPrice: number, openingPrice: number): number => {
  if (openingPrice === 0) return 0;
  return ((currentPrice - openingPrice) / openingPrice) * 100;
};

// Save price to database history
const savePriceToHistory = async (goldType: GoldType, buyPrice: number, sellPrice: number): Promise<void> => {
  try {
    await prisma.goldPriceHistory.create({
      data: {
        goldType,
        buyPrice,
        sellPrice,
      },
    });
    console.log(`💾 Saved price to history: ${GOLD_TYPE_NAMES[goldType]} - ${sellPrice} TL`);
  } catch (error) {
    console.error(`Failed to save price to history for ${GOLD_TYPE_NAMES[goldType]}:`, error);
  }
};

// Get yesterday's closing price from database (last price of previous day)
const getYesterdayClosingPrice = async (goldType: GoldType): Promise<number | null> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today (midnight)

    // Get the last price from yesterday (before today's midnight)
    const lastPriceYesterday = await prisma.goldPriceHistory.findFirst({
      where: {
        goldType,
        fetchedAt: {
          lt: today, // Before today's midnight
        },
      },
      orderBy: {
        fetchedAt: 'desc', // Get the latest price before today
      },
    });

    if (lastPriceYesterday) {
      console.log(`📊 Yesterday's closing price for ${GOLD_TYPE_NAMES[goldType]}: ${lastPriceYesterday.sellPrice} TL`);
      return lastPriceYesterday.sellPrice;
    }

    return null;
  } catch (error) {
    console.error(`Failed to get yesterday's closing price for ${GOLD_TYPE_NAMES[goldType]}:`, error);
    return null;
  }
};

export const getGoldPrices = async (forceRefresh = false): Promise<GoldPricesResponse> => {
  const now = Date.now();

  if (!forceRefresh && priceCache && now - cacheTimestamp < CACHE_DURATION_MS) {
    return priceCache;
  }

  priceCache = await scrapeGoldPrices();
  cacheTimestamp = now;

  // Calculate daily change for each gold type (without saving to DB)
  for (const type of GOLD_TYPES) {
    const price = priceCache.prices[type];

    if (price.buyPrice > 0 && price.sellPrice > 0) {
      // Get yesterday's 10 AM price from database
      const yesterdayPrice = await getYesterdayClosingPrice(type);

      // Calculate daily change percentage based on sell price
      if (yesterdayPrice !== null && yesterdayPrice > 0) {
        price.dailyChangePercent = calculateDailyChange(price.sellPrice, yesterdayPrice);
        console.log(`📊 Daily change for ${GOLD_TYPE_NAMES[type]}: ${price.dailyChangePercent.toFixed(2)}% (Yesterday: ${yesterdayPrice} TL → Today: ${price.sellPrice} TL)`);
      } else {
        // No data from yesterday, show 0%
        price.dailyChangePercent = 0;
        console.log(`📊 No yesterday data for ${GOLD_TYPE_NAMES[type]}, change: 0%`);
      }
    }
  }

  return priceCache;
};

// Save daily snapshot at 10 AM (called by cron job)
export const saveDailySnapshot = async (): Promise<void> => {
  console.log('📸 Taking daily price snapshot at 10 AM...');

  const prices = await scrapeGoldPrices();

  for (const type of GOLD_TYPES) {
    const price = prices.prices[type];
    if (price.buyPrice > 0 && price.sellPrice > 0) {
      await savePriceToHistory(type, price.buyPrice, price.sellPrice);
    }
  }

  console.log('✅ Daily snapshot saved successfully');
};

// Get price for a specific gold type
export const getGoldPrice = async (goldType: GoldType): Promise<GoldPrice> => {
  const prices = await getGoldPrices();
  return prices.prices[goldType];
};
