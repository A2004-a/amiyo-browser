const ThemeManager = {
  currentTheme: 'dark',

  init(settings) {
    this.currentTheme = settings.theme || 'dark';
    this.applyTheme(this.currentTheme);

    // Watch system theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (this.currentTheme === 'system') {
        this.applyTheme('system');
      }
    });
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    let effectiveTheme = theme;

    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', effectiveTheme);
  },

  setTheme(theme) {
    this.applyTheme(theme);
    IpcClient.saveSettings({ theme });
  }
};

