import { regenerateAllPlans } from './planRegeneration.job';

regenerateAllPlans()
  .then((result) => {
    console.log('Weekly plan regeneration complete:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Weekly plan regeneration failed:', err);
    process.exit(1);
  });
