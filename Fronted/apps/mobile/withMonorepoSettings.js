const { withSettingsGradle, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withMonorepoSettings(config) {
  config = withSettingsGradle(config, (config) => {
    if (config.modResults.contents.includes('useExpoModules()')) {
      config.modResults.contents = config.modResults.contents.replace(
        'useExpoModules()',
        `useExpoModules([
  searchPaths: [
    new File(rootDir, "../../../node_modules").absolutePath
  ]
])`
      );
    }
    return config;
  });

  // Increase Gradle Daemon memory to prevent Java heap space errors during Hermes Jetifier transformation
  config = withGradleProperties(config, (config) => {
    const jvmArgsIndex = config.modResults.findIndex(item => item.key === 'org.gradle.jvmargs');
    if (jvmArgsIndex !== -1) {
      config.modResults[jvmArgsIndex].value = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';
    } else {
      config.modResults.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m'
      });
    }
    return config;
  });

  return config;
};
