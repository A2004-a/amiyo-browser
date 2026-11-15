package com.amiyo.browser;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.PopupMenu;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    public static final String HOME_URL = "file:///android_asset/www/index.html";
    private WebView webView;
    private EditText urlInput;
    private ProgressBar pageProgressBar;
    private SwipeRefreshLayout swipeRefresh;
    private ImageView btnSecurity, btnClearUrl, btnMenu;
    private ImageView btnNavBack, btnNavForward, btnNavHome, btnNavBookmark, btnNavReload;
    private TextView txtTabCount;
    private View btnTabCount;

    // Find in Page UI
    private View findInPageBar;
    private EditText findInput;
    private TextView txtFindResults;
    private ImageView btnFindPrev, btnFindNext, btnFindClose;

    // Desktop Site & Tab state
    private boolean isDesktopSite = false;
    private String defaultUserAgent = null;

    public static class TabItem {
        public String id;
        public String title;
        public String url;
        public boolean isIncognito;

        public TabItem(String title, String url, boolean isIncognito) {
            this.id = "tab_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000);
            this.title = title;
            this.url = url;
            this.isIncognito = isIncognito;
        }
    }

    private final List<TabItem> tabs = new ArrayList<>();
    private int activeTabIndex = 0;

    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;

    // Brave-grade ad and tracker blocklist for mobile
    private static final String[] AD_TRACKER_DOMAINS = new String[] {
        "doubleclick.net", "googlesyndication.com", "googleadservices.com",
        "adservice.google.com", "pagead2.googlesyndication.com",
        "adsystem.amazon.com", "amazon-adsystem.com", "adnxs.com",
        "criteo.com", "criteo.net", "scorecardresearch.com",
        "outbrain.com", "taboola.com", "rubiconproject.com",
        "pubmatic.com", "openx.net", "moatads.com",
        "quantserve.com", "casalemedia.com", "bidswitch.net",
        "advertising.com", "adcolony.com", "applovin.com",
        "chartbeat.com", "hotjar.com", "segment.io",
        "newrelic.com", "omtrdc.net", "demdex.net",
        "smartadserver.com", "yieldmo.com", "admob.com"
    };

    private boolean isAdOrTracker(String host) {
        if (host == null) return false;
        String lowerHost = host.toLowerCase();
        for (String domain : AD_TRACKER_DOMAINS) {
            if (lowerHost.equals(domain) || lowerHost.endsWith("." + domain)) {
                return true;
            }
        }
        return false;
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize primary default tab
        tabs.add(new TabItem("New Tab", HOME_URL, false));
        activeTabIndex = 0;

        initViews();
        setupWebView();
        setupEvents();
        setupBackNavigation();

        updateTabCountDisplay();

        // Handle incoming view intent (opening links from other apps)
        Intent intent = getIntent();
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            loadTarget(intent.getData().toString());
        } else {
            loadHome();
        }
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        urlInput = findViewById(R.id.urlInput);
        pageProgressBar = findViewById(R.id.pageProgressBar);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        btnSecurity = findViewById(R.id.btnSecurity);
        btnClearUrl = findViewById(R.id.btnClearUrl);
        btnMenu = findViewById(R.id.btnMenu);
        btnTabCount = findViewById(R.id.btnTabCount);
        txtTabCount = findViewById(R.id.txtTabCount);

        btnNavBack = findViewById(R.id.btnNavBack);
        btnNavForward = findViewById(R.id.btnNavForward);
        btnNavHome = findViewById(R.id.btnNavHome);
        btnNavBookmark = findViewById(R.id.btnNavBookmark);
        btnNavReload = findViewById(R.id.btnNavReload);

        findInPageBar = findViewById(R.id.findInPageBar);
        findInput = findViewById(R.id.findInput);
        txtFindResults = findViewById(R.id.txtFindResults);
        btnFindPrev = findViewById(R.id.btnFindPrev);
        btnFindNext = findViewById(R.id.btnFindNext);
        btnFindClose = findViewById(R.id.btnFindClose);

        swipeRefresh.setColorSchemeResources(R.color.accent, R.color.primary);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        defaultUserAgent = settings.getUserAgentString();
        String customUA = defaultUserAgent + " AETHERBrowser/1.1.0";
        settings.setUserAgentString(customUA);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    pageProgressBar.setVisibility(View.VISIBLE);
                    pageProgressBar.setProgress(newProgress);
                } else {
                    pageProgressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                updateOmnibox(url);
                updateNavButtons();
                if (activeTabIndex >= 0 && activeTabIndex < tabs.size()) {
                    tabs.get(activeTabIndex).url = url;
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                updateOmnibox(url);
                updateNavButtons();
                pageProgressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);

                if (activeTabIndex >= 0 && activeTabIndex < tabs.size()) {
                    TabItem cur = tabs.get(activeTabIndex);
                    cur.url = url;
                    String pageTitle = view.getTitle();
                    cur.title = (pageTitle != null && !pageTitle.isEmpty()) ? pageTitle : "AETHER";
                }

                // Inject YouTube Video Ad Fast-Forward & Skipper for mobile
                String script = "(function() {" +
                    "  if (location.hostname.includes('youtube.com')) {" +
                    "    setInterval(() => {" +
                    "      const skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');" +
                    "      if (skip) { skip.click(); }" +
                    "      const vid = document.querySelector('video');" +
                    "      const ad = document.querySelector('.ad-showing, .ytp-ad-player-overlay');" +
                    "      if (vid && ad && isFinite(vid.duration)) { vid.currentTime = vid.duration; }" +
                    "    }, 500);" +
                    "  }" +
                    "})();";
                view.evaluateJavascript(script, null);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri != null ? uri.getHost() : null;
                if (host != null && isAdOrTracker(host)) {
                    return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream("".getBytes()));
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return true;
                }
            }
        });

        // Native DownloadManager integration
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType,
                    long contentLength) {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimeType);
                    String cookies = CookieManager.getInstance().getCookie(url);
                    request.addRequestHeader("cookie", cookies);
                    request.addRequestHeader("User-Agent", userAgent);
                    request.setDescription("Downloading file...");
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    request.setTitle(filename);
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(request);
                        Toast.makeText(MainActivity.this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Download failed: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void setupEvents() {
        swipeRefresh.setOnRefreshListener(() -> webView.reload());

        urlInput.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_GO || actionId == EditorInfo.IME_ACTION_DONE ||
                    (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER
                            && event.getAction() == KeyEvent.ACTION_DOWN)) {
                String target = urlInput.getText().toString().trim();
                loadTarget(target);
                hideKeyboard();
                webView.requestFocus();
                return true;
            }
            return false;
        });

        urlInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                btnClearUrl.setVisibility(s.length() > 0 && urlInput.hasFocus() ? View.VISIBLE : View.GONE);
            }

            @Override
            public void afterTextChanged(Editable s) {
            }
        });

        urlInput.setOnFocusChangeListener((v, hasFocus) -> {
            if (hasFocus) {
                urlInput.selectAll();
                btnClearUrl.setVisibility(urlInput.getText().length() > 0 ? View.VISIBLE : View.GONE);
            } else {
                btnClearUrl.setVisibility(View.GONE);
            }
        });

        btnClearUrl.setOnClickListener(v -> {
            urlInput.setText("");
            urlInput.requestFocus();
        });

        btnNavBack.setOnClickListener(v -> {
            if (webView.canGoBack())
                webView.goBack();
        });

        btnNavForward.setOnClickListener(v -> {
            if (webView.canGoForward())
                webView.goForward();
        });

        btnNavHome.setOnClickListener(v -> loadHome());

        btnNavReload.setOnClickListener(v -> webView.reload());

        btnNavBookmark.setOnClickListener(v -> {
            String title = webView.getTitle() != null ? webView.getTitle() : "Bookmark";
            String url = webView.getUrl() != null ? webView.getUrl() : "";
            Toast.makeText(this, "⭐ Bookmarked: " + title, Toast.LENGTH_SHORT).show();
            // Record bookmark into web storage if available
            webView.evaluateJavascript("if (typeof addBookmarkItem === 'function') { addBookmarkItem('" + title.replace("'", "\\'") + "', '" + url.replace("'", "\\'") + "'); }", null);
        });

        btnTabCount.setOnClickListener(v -> showTabSwitcher());

        btnMenu.setOnClickListener(this::showChromeMenu);

        // Find in Page Listeners
        webView.setFindListener((activeMatchOrdinal, numberOfMatches, isDoneCounting) -> {
            txtFindResults.setText((numberOfMatches > 0 ? (activeMatchOrdinal + 1) : 0) + "/" + numberOfMatches);
        });

        findInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (s.length() > 0) {
                    webView.findAllAsync(s.toString());
                } else {
                    webView.clearMatches();
                    txtFindResults.setText("0/0");
                }
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnFindPrev.setOnClickListener(v -> webView.findNext(false));
        btnFindNext.setOnClickListener(v -> webView.findNext(true));
        btnFindClose.setOnClickListener(v -> {
            webView.clearMatches();
            findInPageBar.setVisibility(View.GONE);
            hideKeyboard();
        });
    }

    private void updateTabCountDisplay() {
        if (txtTabCount != null) {
            txtTabCount.setText(String.valueOf(tabs.size()));
        }
    }

    private void showTabSwitcher() {
        CharSequence[] items = new CharSequence[tabs.size()];
        for (int i = 0; i < tabs.size(); i++) {
            TabItem t = tabs.get(i);
            String prefix = (i == activeTabIndex ? "▶ " : "   ") + (t.isIncognito ? "🕶️ " : "📄 ");
            items[i] = prefix + t.title;
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Open Tabs (" + tabs.size() + ")");
        builder.setItems(items, (dialog, which) -> {
            switchToTab(which);
        });
        builder.setPositiveButton("＋ New Tab", (dialog, which) -> {
            createNewTab(false);
        });
        builder.setNeutralButton("🕶️ Incognito", (dialog, which) -> {
            createNewTab(true);
        });
        if (tabs.size() > 1) {
            builder.setNegativeButton("Close Current Tab", (dialog, which) -> {
                closeTab(activeTabIndex);
            });
        }
        builder.show();
    }

    private void createNewTab(boolean isIncognito) {
        TabItem newTab = new TabItem(isIncognito ? "Incognito Tab" : "New Tab", HOME_URL, isIncognito);
        tabs.add(newTab);
        activeTabIndex = tabs.size() - 1;
        updateTabCountDisplay();
        loadHome();
        if (isIncognito) {
            Toast.makeText(this, "🕶️ Incognito tab opened", Toast.LENGTH_SHORT).show();
        }
    }

    private void switchToTab(int index) {
        if (index >= 0 && index < tabs.size()) {
            activeTabIndex = index;
            TabItem t = tabs.get(index);
            if (t.url != null && !t.url.isEmpty()) {
                loadTarget(t.url);
            } else {
                loadHome();
            }
        }
    }

    private void closeTab(int index) {
        if (tabs.size() <= 1) return;
        tabs.remove(index);
        if (activeTabIndex >= tabs.size()) {
            activeTabIndex = tabs.size() - 1;
        }
        updateTabCountDisplay();
        switchToTab(activeTabIndex);
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (findInPageBar.getVisibility() == View.VISIBLE) {
                    webView.clearMatches();
                    findInPageBar.setVisibility(View.GONE);
                    return;
                }
                if (webView.canGoBack()) {
                    webView.goBack();
                } else if (tabs.size() > 1) {
                    closeTab(activeTabIndex);
                } else {
                    finish();
                }
            }
        });
    }

    public void loadTarget(String input) {
        if (input == null || input.isEmpty())
            return;

        input = input.trim();
        if (input.equals("aether://newtab") || input.equals("amiyo://newtab")
                || input.equalsIgnoreCase("about:blank")) {
            loadHome();
            return;
        }

        // Direct URL or Search query
        if (input.startsWith("http://") || input.startsWith("https://") || input.startsWith("file://")) {
            webView.loadUrl(input);
        } else if (input.contains(".") && !input.contains(" ")) {
            webView.loadUrl("https://" + input);
        } else {
            android.content.SharedPreferences prefs = getSharedPreferences("amiyo_prefs", MODE_PRIVATE);
            String engine = prefs.getString("search_engine", "google");
            String searchBase = "https://www.google.com/search?q=";
            if ("duckduckgo".equalsIgnoreCase(engine)) {
                searchBase = "https://duckduckgo.com/?q=";
            } else if ("bing".equalsIgnoreCase(engine)) {
                searchBase = "https://www.bing.com/search?q=";
            } else if ("yahoo".equalsIgnoreCase(engine)) {
                searchBase = "https://search.yahoo.com/search?p=";
            } else if ("ecosia".equalsIgnoreCase(engine)) {
                searchBase = "https://www.ecosia.org/search?q=";
            }
            webView.loadUrl(searchBase + Uri.encode(input));
        }
    }

    public void loadHome() {
        webView.loadUrl(HOME_URL);
    }

    private void openInternalPage(String page) {
        String targetHash = "#" + page;
        String curUrl = webView.getUrl();
        if (curUrl != null && curUrl.startsWith("file:///android_asset/www/index.html")) {
            webView.evaluateJavascript("if (typeof navigateTo === 'function') { navigateTo('" + targetHash + "'); } else { location.hash = '" + targetHash + "'; }", null);
        } else {
            webView.loadUrl(HOME_URL + targetHash);
        }
    }

    private void updateOmnibox(String url) {
        if (url == null)
            return;

        if (url.equals(HOME_URL) || url.startsWith("file:///android_asset")) {
            urlInput.setText("");
            urlInput.setHint(R.string.search_hint);
            btnSecurity.setImageResource(android.R.drawable.ic_lock_idle_lock);
        } else {
            urlInput.setText(url);
            if (url.startsWith("https://")) {
                btnSecurity.setImageResource(android.R.drawable.ic_lock_idle_lock);
                btnSecurity.setColorFilter(getResources().getColor(R.color.accent, getTheme()));
            } else {
                btnSecurity.setImageResource(android.R.drawable.ic_lock_idle_lock);
                btnSecurity.setColorFilter(getResources().getColor(R.color.text_secondary, getTheme()));
            }
        }
    }

    private void updateNavButtons() {
        btnNavBack.setEnabled(webView.canGoBack());
        btnNavBack.setAlpha(webView.canGoBack() ? 1.0f : 0.35f);

        btnNavForward.setEnabled(webView.canGoForward());
        btnNavForward.setAlpha(webView.canGoForward() ? 1.0f : 0.35f);
    }

    private void showChromeMenu(View anchor) {
        PopupMenu popup = new PopupMenu(this, anchor);
        popup.getMenu().add(0, 1, 0, "New tab");
        popup.getMenu().add(0, 2, 1, "New Incognito tab");
        popup.getMenu().add(0, 3, 2, "History");
        popup.getMenu().add(0, 4, 3, "Downloads");
        popup.getMenu().add(0, 5, 4, "Bookmarks");
        popup.getMenu().add(0, 6, 5, "Share...");
        popup.getMenu().add(0, 7, 6, "Find in page");
        popup.getMenu().add(0, 8, 7, isDesktopSite ? "Mobile site" : "Desktop site");
        popup.getMenu().add(0, 9, 8, "Settings");

        popup.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 1:
                    createNewTab(false);
                    return true;
                case 2:
                    createNewTab(true);
                    return true;
                case 3:
                    openInternalPage("history");
                    return true;
                case 4:
                    try {
                        startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));
                    } catch (Exception e) {
                        openInternalPage("downloads");
                    }
                    return true;
                case 5:
                    openInternalPage("bookmarks");
                    return true;
                case 6:
                    shareCurrentPage();
                    return true;
                case 7:
                    findInPageBar.setVisibility(View.VISIBLE);
                    findInput.requestFocus();
                    InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) imm.showSoftInput(findInput, InputMethodManager.SHOW_IMPLICIT);
                    return true;
                case 8:
                    toggleDesktopSite();
                    return true;
                case 9:
                    openInternalPage("settings");
                    return true;
                default:
                    return false;
            }
        });
        popup.show();
    }

    private void shareCurrentPage() {
        String url = webView.getUrl();
        if (url != null && !url.startsWith("file://")) {
            Intent sendIntent = new Intent();
            sendIntent.setAction(Intent.ACTION_SEND);
            sendIntent.putExtra(Intent.EXTRA_TEXT, url);
            sendIntent.setType("text/plain");
            startActivity(Intent.createChooser(sendIntent, "Share link via"));
        } else {
            Toast.makeText(this, "AETHER Browser — Explore Without Limits", Toast.LENGTH_SHORT).show();
        }
    }

    private void toggleDesktopSite() {
        WebSettings settings = webView.getSettings();
        isDesktopSite = !isDesktopSite;
        if (isDesktopSite) {
            settings.setUserAgentString("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            Toast.makeText(this, "Desktop site enabled", Toast.LENGTH_SHORT).show();
        } else {
            settings.setUserAgentString(defaultUserAgent != null ? defaultUserAgent + " AETHERBrowser/1.1.0" : null);
            settings.setUseWideViewPort(false);
            settings.setLoadWithOverviewMode(false);
            Toast.makeText(this, "Mobile site enabled", Toast.LENGTH_SHORT).show();
        }
        webView.reload();
    }

    private void hideKeyboard() {
        View view = getCurrentFocus();
        if (view != null) {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
                imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK && data != null) {
                    if (data.getData() != null) {
                        results = new Uri[] { data.getData() };
                    } else if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }
}
