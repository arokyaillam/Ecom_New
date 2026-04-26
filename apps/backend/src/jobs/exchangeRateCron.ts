import { exchangeService } from '../modules/exchange/exchange.service.js';

export async function runExchangeRateCron() {
  console.log('Running exchange rate update cron...');
  const result = await exchangeService.updateRates('USD');
  console.log(`Exchange rates updated: ${result.updated} rates`);
}
