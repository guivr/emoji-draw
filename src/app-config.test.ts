import fs from 'fs';
import path from 'path';

type ExpoConfig = {
  expo?: {
    ios?: {
      supportsTablet?: boolean;
      requireFullScreen?: boolean;
    };
  };
};

function readAppConfig(): ExpoConfig {
  const configPath = path.resolve(process.cwd(), 'app.json');
  const content = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(content) as ExpoConfig;
}

describe('iOS app sizing configuration', () => {
  test('enables full-screen layout on iPad', () => {
    const config = readAppConfig();
    expect(config.expo?.ios?.supportsTablet).toBe(true);
    expect(config.expo?.ios?.requireFullScreen).toBe(true);
  });
});
