import FairSDK from '.';
import { logger } from './utils';

// with fetch
const inferenceTest = async () => {
  await FairSDK.setWallet('./wallet-user.json');
  logger.info(await FairSDK.address);

  const models = await FairSDK.queries.listModels();
  const dreamshaper = models.find((model) => model.name === 'DreamShaper');

  if (dreamshaper) {
    logger.info(dreamshaper);
    // set model
    await FairSDK.use('model', dreamshaper.raw);

    const scripts = await FairSDK.queries.listScripts(dreamshaper.txid);
    // use first available script for dreamshaper
    logger.info(scripts);
    // set script
    await FairSDK.use('script', scripts[0].raw);

    const operators = await FairSDK.queries.listOperators(scripts[0].raw);
    // use first available operator for dreamshaper
    logger.info(operators[0]);
    // set operator
    await FairSDK.use('operator', operators[0].raw);
    // inference

    logger.info(await FairSDK.getUBalance());
    const result = await FairSDK.prompt('This is a test');
    logger.info(result);
  }
};

const inferenceTestWithIds = async () => {
  await FairSDK.setWallet('./wallet-user.json');
  logger.info(await FairSDK.address);
  await FairSDK.use('model', 'uVDgZu7c78Ro2RuPS6-fqF75VoShO8CIKSMrVe9uAfw'); // use model by payment txid
  await FairSDK.use('script', '1Ra-E9rYvcShaFRqp38Lkf1SP1FFDtYggZILFpggtNE'); // use script by payment txid
  await FairSDK.use('operator', 'IGpjxRSgZoghaxZ-arElfMI2cRaXWPh34MGzOe8NTsE'); // use operator by txid

  const result = await FairSDK.prompt('This is a test');
  logger.info(result);
};

(async () => {
  await inferenceTestWithIds();
})();
