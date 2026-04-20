import { seedProjectFromRegistry } from '../lib/seed-project';

async function main() {
  await seedProjectFromRegistry(15);
  console.log('done');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
