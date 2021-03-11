const ServiceHub = require('../dist/index.js').ServiceHub
const program = require('commander');

const MONGODBURI = 'mongodb://localhost:27017';

program
  .storeOptionsAsProperties(false)
  .name("mellon-service-hub")
  .version('0.0.1')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-v, --verbose', 'Verbose')

  // for processing options
  // .option('-w, --watch', 'run the program in watch mode')

  .command('awareness-service')
  .option('-b, --baseURI <string>', 'Service base URI')
  .option('-m, --mongodbURI <string>', 'MongoDB URI')
  .option('-p, --pod <string>', 'location to run the service data pod')
  .option('-k, --keys <string>', 'location for the keys of the service data pod')
  .description('Awareness service')
  .action(async (flags) => {    
    const hub = new ServiceHub()
    hub.runAwarenessService({
      mongoDBURI: flags.mongodbURI || MONGODBURI,
      baseIRI: flags.baseIRI,
      port: 1234,
      verbose: true,
      podLocation: './pod/awareness/',
      keyLocation: './pod/keys/',
    })
  })


program.parse(process.argv)
