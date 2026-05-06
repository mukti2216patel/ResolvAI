import baseConfig from './playwright.config';

export default {
  ...baseConfig,
  reporter: 'list',
  workers: 1,
  webServer: undefined,
};
