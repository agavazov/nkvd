import axios from 'axios';
import { env } from './lib/env';

// Configuration
const serviceUrl = env.serviceUrl;
const requestsAmount = env.stressAmount;
const clusters = env.stressClusters;
const workersPerCluster = env.stressWorkers;

// Preparation
let leftAmount = requestsAmount;
const report: { errors: number, success: number, total: number, start: Date, end: Date | null } = {
  errors: 0,
  success: 0,
  total: requestsAmount,
  start: new Date(),
  end: null
};

// Do the work
const worker = async () => {
  while (leftAmount > 0) {
    try {
      await axios.get(`${serviceUrl}/set?k=stress:${leftAmount}&v=value:${leftAmount}`);
      report.success++;
    } catch (e: any) {
      report.errors++;
    }

    leftAmount--;

    if (leftAmount % 1000 === 0) {
      console.log(`[<] ${leftAmount} / [!] ${report.errors} / [^] ${report.success}`);
    }

    if (leftAmount <= 0) {
      showReport();
    }
  }
};

const stress = async () => {
  for (let i = 1; i <= workersPerCluster; i++) {
    worker().catch(console.error);
  }
};

const showReport = () => {
  report.end = new Date();
  const timeDiff = Math.abs(report.start.getTime() - report.end.getTime());

  console.log('\n==================\n');
  console.log('Report:');
  console.log(` - Total requests: ${report.total}`);
  console.log(` - Total time: ${(timeDiff / 1000).toFixed(2)} sec`);
  console.log(` - Avg request response: ${(report.total / timeDiff).toFixed(2)} ms`);
  console.log(` - Errors: ${report.errors}`);
  console.log(` - Success: ${report.success}`);

  console.timeEnd('Stress test');

  process.exit(0);
};

(async () => {
  console.log('Stress test with:');
  console.log(` - Requests: ${leftAmount}`);
  console.log(` - Clusters: ${clusters}`);
  console.log(` - Workers per cluster: ${workersPerCluster}`);
  console.log('\n==================\n');
  console.log('[<] Left Requests / [!] Errors / [^] Success\n');

  for (let i = 1; i <= clusters; i++) {
    stress().catch(console.error);
  }
})();
