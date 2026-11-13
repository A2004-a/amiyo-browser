const Navigation = {
  backBtn: null,
  forwardBtn: null,
  reloadBtn: null,
  homeBtn: null,
  progressBar: null,

  init() {
    this.backBtn = document.getElementById('back-btn');
    this.forwardBtn = document.getElementById('forward-btn');
    this.reloadBtn = document.getElementById('reload-btn');
    this.homeBtn = document.getElementById('home-btn');
    this.progressBar = document.getElementById('page-progress-bar');

    if (this.backBtn) {
      this.backBtn.innerHTML = Utils.icons.back;
      this.backBtn.addEventListener('click', () => {
        IpcClient.goBack(State.activeTabId);
      });
    }

    if (this.forwardBtn) {
      this.forwardBtn.innerHTML = Utils.icons.forward;
      this.forwardBtn.addEventListener('click', () => {
        IpcClient.goForward(State.activeTabId);
      });
    }

    if (this.reloadBtn) {
      this.reloadBtn.innerHTML = Utils.icons.reload;
      this.reloadBtn.addEventListener('click', () => {
        const tab = State.getActiveTab();
        if (tab?.isLoading) {
          IpcClient.stop(State.activeTabId);
        } else {
          IpcClient.reload(State.activeTabId);
        }
      });
    }

    if (this.homeBtn) {
      this.homeBtn.innerHTML = Utils.icons.home;
      this.homeBtn.addEventListener('click', () => {
        const homepage = State.settings.homepage || 'aether://newtab';
        IpcClient.navigateTab(State.activeTabId, homepage);
      });
    }
  },

  updateToolbar() {
    const tab = State.getActiveTab();
    if (!tab) return;

    if (this.backBtn) {
      this.backBtn.disabled = !tab.canGoBack;
    }

    if (this.forwardBtn) {
      this.forwardBtn.disabled = !tab.canGoForward;
    }

    if (this.reloadBtn) {
      if (tab.isLoading) {
        this.reloadBtn.innerHTML = Utils.icons.stop;
        this.reloadBtn.title = 'Stop loading';
        this.startProgressBar();
      } else {
        this.reloadBtn.innerHTML = Utils.icons.reload;
        this.reloadBtn.title = 'Reload page';
        this.finishProgressBar();
      }
    }
  },

  startProgressBar() {
    if (!this.progressBar) return;
    this.progressBar.classList.add('loading');
    this.progressBar.style.width = '30%';
    setTimeout(() => {
      if (this.progressBar.classList.contains('loading')) {
        this.progressBar.style.width = '75%';
      }
    }, 400);
  },

  finishProgressBar() {
    if (!this.progressBar) return;
    this.progressBar.style.width = '100%';
    setTimeout(() => {
      this.progressBar.classList.remove('loading');
      this.progressBar.style.width = '0%';
    }, 250);
  }
};

