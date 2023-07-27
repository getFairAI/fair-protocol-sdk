import { FairSDK } from '.';

(async () => {
  const x = await FairSDK.queries.listModels();

  await FairSDK.use('model', x[0].raw);
  console.log(FairSDK.model, 'display model');

  const y = await FairSDK.queries.listScripts();
  await FairSDK.use('script', y[0].raw);
  console.log(FairSDK.script, 'display script');

  const z = await FairSDK.queries.listOperators();
  await FairSDK.use('operator', z[0].raw);
  console.log(FairSDK.operator, 'display operator');
})();
