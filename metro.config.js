const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const emptyModulePath = path.resolve(__dirname, 'empty-module.js');

const config = {
  resolver: {
    unstable_conditionNames: ['browser', 'require', 'import'],
    resolverMainFields: ['browser', 'main'],
    
    extraNodeModules: {
      // 1. Redirecionar Axios para versão de browser
      'axios': path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      
      // 2. Mapear TODOS os módulos de Node para o arquivo vazio de uma vez
      assert: emptyModulePath,
      http2: emptyModulePath,
      zlib: emptyModulePath,
      fs: emptyModulePath,
      net: emptyModulePath,
      tls: emptyModulePath,
      child_process: emptyModulePath,
      os: emptyModulePath,
      path: emptyModulePath,
      vm: emptyModulePath,
      constants: emptyModulePath,
      dns: emptyModulePath,
      module: emptyModulePath,
      process: emptyModulePath,
      'follow-redirects': emptyModulePath,
      
      // 3. Polyfills que o Metro geralmente precisa para funcionar
      events: require.resolve('events' ),
      util: require.resolve('util'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      http: require.resolve('stream-http' ),
      https: require.resolve('https-browserify' ),
      url: require.resolve('url'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
