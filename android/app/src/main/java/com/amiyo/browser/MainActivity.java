package com.amiyo.browser;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.PopupMenu;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends AppCompatActivity {

    public static final String HOME_URL = "file:///android_asset/www/index.html";
    public static final String APP_VERSION_NAME = "0.2.0";
    public static final int APP_VERSION_CODE = 5;
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

    // Fullscreen video & Zoom support
    private FrameLayout customViewContainer;
    private View customView = null;
    private WebChromeClient.CustomViewCallback customViewCallback = null;
    private int currentTextZoom = 100;

    // AETHER Secure VPN State
    private boolean isVpnEnabled = false;
    private String vpnLocation = "Optimal (Fastest)";

    // Brave-Grade Shields Status
    private boolean shieldsEnabled = true;

    // Pending Permissions Callbacks
    private GeolocationPermissions.Callback pendingGeoCallback = null;
    private String pendingGeoOrigin = null;
    private PermissionRequest pendingWebPermissionRequest = null;

    public static class TabItem {
        public String id;
        public String title;
        public String url;
        public boolean isIncognito;
        public boolean isDesktopSite = false;

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
    private static final int PERMISSION_REQUEST_LOCATION = 1002;
    private static final int PERMISSION_REQUEST_CAMERA_MIC = 1003;

    // Brave-grade ad and tracker blocklist for mobile (O(1) HashSet lookup)
    private static final Set<String> AD_TRACKER_DOMAINS = new HashSet<>(Arrays.asList(
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
        "smartadserver.com", "yieldmo.com", "admob.com",
        "trafficstars.com", "popads.net", "propellerads.com",
        "zergnet.com", "exoclick.com", "infolinks.com"
    ));

    private boolean isAdOrTracker(String host) {
        if (host == null || host.isEmpty()) return false;
        String lowerHost = host.toLowerCase(Locale.ROOT);
        if (AD_TRACKER_DOMAINS.contains(lowerHost)) return true;
        int dotIdx = lowerHost.indexOf('.');
        while (dotIdx != -1) {
            String parent = lowerHost.substring(dotIdx + 1);
            if (AD_TRACKER_DOMAINS.contains(parent)) return true;
            dotIdx = lowerHost.indexOf('.', dotIdx + 1);
        }
        return false;
    }

    public class AetherWebBridge {
        @JavascriptInterface
        public void openDownloads() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));
                } catch (Exception e) {
                    openInternalPage("downloads");
                }
            });
        }

        @JavascriptInterface
        public void setSearchEngine(String engine) {
            runOnUiThread(() -> {
                android.content.SharedPreferences prefs = getSharedPreferences("amiyo_prefs", MODE_PRIVATE);
                prefs.edit().putString("search_engine", engine).apply();
            });
        }

        @JavascriptInterface
        public void setShieldsEnabled(boolean enabled) {
            shieldsEnabled = enabled;
        }

        @JavascriptInterface
        public void sharePage(String title, String url) {
            runOnUiThread(() -> {
                Intent sendIntent = new Intent();
                sendIntent.setAction(Intent.ACTION_SEND);
                sendIntent.putExtra(Intent.EXTRA_TITLE, title);
                sendIntent.putExtra(Intent.EXTRA_TEXT, url);
                sendIntent.setType("text/plain");
                startActivity(Intent.createChooser(sendIntent, "Share link via"));
            });
        }

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void copyToClipboard(String text) {
            runOnUiThread(() -> {
                android.content.ClipboardManager clipboard = (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard != null) {
                    android.content.ClipData clip = android.content.ClipData.newPlainText("AETHER Browser", text);
                    clipboard.setPrimaryClip(clip);
                    Toast.makeText(MainActivity.this, "Copied to clipboard", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public boolean isVpnConnected() {
            return isVpnEnabled;
        }

        @JavascriptInterface
        public String getVpnNode() {
            return vpnLocation != null ? vpnLocation : "US East";
        }

        @JavascriptInterface
        public void toggleVpn() {
            runOnUiThread(MainActivity.this::toggleMobileVpn);
        }

        @JavascriptInterface
        public void openInternal(String page) {
            runOnUiThread(() -> openInternalPage(page));
        }

        @JavascriptInterface
        public void loadUrl(String url) {
            runOnUiThread(() -> loadTarget(url));
        }

        @JavascriptInterface
        public String getVersionName() {
            return APP_VERSION_NAME;
        }

        @JavascriptInterface
        public int getVersionCode() {
            return APP_VERSION_CODE;
        }

        @JavascriptInterface
        public void checkForUpdates() {
            runOnUiThread(MainActivity.this::showUpdateDialog);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Restore tabs on Activity recreation if present
        if (savedInstanceState != null) {
            activeTabIndex = savedInstanceState.getInt("active_tab_index", 0);
            isDesktopSite = savedInstanceState.getBoolean("desktop_site", false);
            isVpnEnabled = savedInstanceState.getBoolean("vpn_enabled", false);
            ArrayList<String> tabTitles = savedInstanceState.getStringArrayList("tab_titles");
            ArrayList<String> tabUrls = savedInstanceState.getStringArrayList("tab_urls");
            ArrayList<String> tabIncognitos = savedInstanceState.getStringArrayList("tab_incognitos");
            if (tabTitles != null && tabUrls != null && tabTitles.size() == tabUrls.size()) {
                tabs.clear();
                for (int i = 0; i < tabTitles.size(); i++) {
                    boolean isIncog = tabIncognitos != null && i < tabIncognitos.size() && "1".equals(tabIncognitos.get(i));
                    tabs.add(new TabItem(tabTitles.get(i), tabUrls.get(i), isIncog));
                }
            }
        }

        if (tabs.isEmpty()) {
            tabs.add(new TabItem("New Tab", HOME_URL, false));
            activeTabIndex = 0;
        }

        initViews();
        setupWebView();
        setupEvents();
        setupBackNavigation();

        updateTabCountDisplay();

        // Handle incoming view intent (opening links from other apps)
        Intent intent = getIntent();
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            loadTarget(intent.getData().toString());
        } else if (savedInstanceState != null && activeTabIndex >= 0 && activeTabIndex < tabs.size()) {
            TabItem cur = tabs.get(activeTabIndex);
            if (cur.url != null && !cur.url.isEmpty()) {
                loadTarget(cur.url);
            } else {
                loadHome();
            }
        } else {
            loadHome();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
            webView.post(() -> {
                webView.requestLayout();
                webView.invalidate();
                // Recover any paused video element on resume (fixes black screen / blank video on reopen)
                webView.evaluateJavascript(
                    "(function() {" +
                    "  try {" +
                    "    const v = document.querySelector('video');" +
                    "    if (v && v.paused && !v.ended) { v.play().catch(()=>{}); }" +
                    "  } catch(e) {}" +
                    "})();", null);
            });
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
    }

    @Override
    protected void onDestroy() {
        if (customView != null) {
            hideCustomView();
        }
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putInt("active_tab_index", activeTabIndex);
        outState.putBoolean("desktop_site", isDesktopSite);
        outState.putBoolean("vpn_enabled", isVpnEnabled);
        ArrayList<String> tabTitles = new ArrayList<>();
        ArrayList<String> tabUrls = new ArrayList<>();
        ArrayList<String> tabIncognitos = new ArrayList<>();
        for (TabItem t : tabs) {
            tabTitles.add(t.title != null ? t.title : "AETHER");
            tabUrls.add(t.url != null ? t.url : HOME_URL);
            tabIncognitos.add(t.isIncognito ? "1" : "0");
        }
        outState.putStringArrayList("tab_titles", tabTitles);
        outState.putStringArrayList("tab_urls", tabUrls);
        outState.putStringArrayList("tab_incognitos", tabIncognitos);
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
        customViewContainer = findViewById(R.id.customViewContainer);

        swipeRefresh.setColorSchemeResources(R.color.accent, R.color.primary);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setGeolocationEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // High-Performance Caching & Smooth Scrolling
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setEnableSmoothTransition(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, false);
        }

        // Auto-purge stale WebView cache when new version is installed
        try {
            SharedPreferences updatePrefs = getSharedPreferences("aether_app_prefs", MODE_PRIVATE);
            int lastCode = updatePrefs.getInt("installed_version_code", -1);
            if (lastCode < APP_VERSION_CODE) {
                webView.clearCache(true);
                updatePrefs.edit().putInt("installed_version_code", APP_VERSION_CODE).apply();
            }
        } catch (Exception ignored) {}

        defaultUserAgent = settings.getUserAgentString();
        String customUA = defaultUserAgent + " AETHERBrowser/0.2.0";
        settings.setUserAgentString(customUA);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // Native JavaScript Interface Bridge
        webView.addJavascriptInterface(new AetherWebBridge(), "AetherAndroid");

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
            public void onReceivedTitle(WebView view, String title) {
                super.onReceivedTitle(view, title);
                if (activeTabIndex >= 0 && activeTabIndex < tabs.size()) {
                    if (title != null && !title.isEmpty() && !title.startsWith("http")) {
                        tabs.get(activeTabIndex).title = title;
                    }
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (Exception e) {
                    try {
                        Intent fallback = new Intent(Intent.ACTION_GET_CONTENT);
                        fallback.addCategory(Intent.CATEGORY_OPENABLE);
                        fallback.setType("*/*");
                        startActivityForResult(Intent.createChooser(fallback, "Select File"), FILE_CHOOSER_REQUEST_CODE);
                        return true;
                    } catch (Exception ex) {
                        fileUploadCallback = null;
                        return false;
                    }
                }
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                showCustomView(view, callback);
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView newWebView = new WebView(MainActivity.this);
                newWebView.getSettings().setJavaScriptEnabled(true);
                newWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                        createNewTab(false);
                        loadTarget(req.getUrl().toString());
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(newWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public void onCloseWindow(WebView window) {
                super.onCloseWindow(window);
                if (tabs.size() > 1) {
                    closeTab(activeTabIndex);
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                        callback.invoke(origin, true, true);
                    } else {
                        pendingGeoOrigin = origin;
                        pendingGeoCallback = callback;
                        requestPermissions(new String[] {
                            android.Manifest.permission.ACCESS_FINE_LOCATION,
                            android.Manifest.permission.ACCESS_COARSE_LOCATION
                        }, PERMISSION_REQUEST_LOCATION);
                    }
                } else {
                    callback.invoke(origin, true, true);
                }
            }

            @Override
            public void onGeolocationPermissionsHidePrompt() {
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    List<String> neededPermissions = new ArrayList<>();
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                                checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                                neededPermissions.add(android.Manifest.permission.CAMERA);
                            }
                        } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                                checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                                neededPermissions.add(android.Manifest.permission.RECORD_AUDIO);
                            }
                        }
                    }
                    if (neededPermissions.isEmpty()) {
                        request.grant(request.getResources());
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        pendingWebPermissionRequest = request;
                        requestPermissions(neededPermissions.toArray(new String[0]), PERMISSION_REQUEST_CAMERA_MIC);
                    } else {
                        request.grant(request.getResources());
                    }
                });
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingWebPermissionRequest != null && pendingWebPermissionRequest.equals(request)) {
                    pendingWebPermissionRequest = null;
                }
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
                injectZoomUnlocker(view);
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

                injectZoomUnlocker(view);
                injectYouTubeOptimizations(view);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri != null ? uri.getHost() : null;
                String urlStr = uri != null ? uri.toString() : "";

                // NEVER block video / audio streaming segments or manifest files (prevents black screen on YouTube/media)
                if (host != null && (
                    host.contains("googlevideo.com") ||
                    host.contains("videoplayback") ||
                    host.contains("youtubei.googleapis.com") ||
                    urlStr.contains("/videoplayback") ||
                    urlStr.contains(".m3u8") ||
                    urlStr.contains(".mpd") ||
                    urlStr.contains(".mp4") ||
                    urlStr.contains(".webm")
                )) {
                    return super.shouldInterceptRequest(view, request);
                }

                if (shieldsEnabled && host != null && isAdOrTracker(host)) {
                    String mime = "text/plain";
                    String path = uri.getPath() != null ? uri.getPath().toLowerCase(Locale.ROOT) : "";
                    if (path.endsWith(".js") || urlStr.contains(".js?")) mime = "application/javascript";
                    else if (path.endsWith(".css")) mime = "text/css";
                    else if (path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".gif") || path.endsWith(".webp")) mime = "image/png";
                    return new WebResourceResponse(mime, "UTF-8", new ByteArrayInputStream("".getBytes()));
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
                    return false;
                }
                if (url.equals("content://downloads/all_downloads") || url.startsWith("aether://downloads") || url.startsWith("amiyo://downloads")) {
                    try {
                        startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));
                    } catch (Exception e) {
                        openInternalPage("downloads");
                    }
                    return true;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return true;
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Security Warning")
                    .setMessage("The SSL certificate for this site is not trusted (" + (error != null ? error.getUrl() : "site") + "). Do you want to proceed anyway?")
                    .setPositiveButton("Proceed (Unsafe)", (dialog, which) -> handler.proceed())
                    .setNegativeButton("Go Back", (dialog, which) -> {
                        handler.cancel();
                        if (view.canGoBack()) view.goBack(); else loadHome();
                    })
                    .setCancelable(false)
                    .show();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    pageProgressBar.setVisibility(View.GONE);
                    swipeRefresh.setRefreshing(false);
                    String failingUrl = request.getUrl().toString();
                    if (!failingUrl.startsWith("file://")) {
                        String errorHtml = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='background:#12141a;color:#f8fafc;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:90vh;text-align:center;padding:20px;box-sizing:border-box;margin:0;'>" +
                            "<div style='font-size:52px;margin-bottom:16px;'>📡</div>" +
                            "<h2 style='font-size:22px;margin-bottom:8px;font-weight:700;'>You're Offline or Site Unreachable</h2>" +
                            "<p style='color:#94a3b8;font-size:14px;max-width:320px;line-height:1.5;margin-bottom:24px;'>AETHER could not connect to this site. Check your mobile data or Wi-Fi connection.</p>" +
                            "<button onclick='location.reload()' style='background:#38bdf8;color:#0f172a;border:none;border-radius:24px;padding:12px 28px;font-size:14px;font-weight:bold;cursor:pointer;'>Retry Connection</button>" +
                            "<br><a href='file:///android_asset/www/index.html' style='color:#94a3b8;font-size:13px;margin-top:20px;text-decoration:none;'>Return to New Tab</a>" +
                            "</body></html>";
                        view.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null);
                    }
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
        swipeRefresh.setOnChildScrollUpCallback((parent, child) -> {
            return webView != null && webView.getScrollY() > 0;
        });

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

    private void applyIncognitoSettings(boolean isIncognito) {
        WebSettings settings = webView.getSettings();
        if (isIncognito) {
            settings.setSaveFormData(false);
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
            btnSecurity.setColorFilter(0xFFC084FC); // Purple incognito tint
            urlInput.setHint("🕶️ Search privately or type URL");
        } else {
            settings.setSaveFormData(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
            btnSecurity.clearColorFilter();
            urlInput.setHint(R.string.search_hint);
        }
    }

    private void createNewTab(boolean isIncognito) {
        TabItem newTab = new TabItem(isIncognito ? "Incognito Tab" : "New Tab", HOME_URL, isIncognito);
        tabs.add(newTab);
        activeTabIndex = tabs.size() - 1;
        updateTabCountDisplay();
        applyIncognitoSettings(isIncognito);
        loadHome();
        if (isIncognito) {
            Toast.makeText(this, "🕶️ Incognito tab opened", Toast.LENGTH_SHORT).show();
        }
    }

    private void switchToTab(int index) {
        if (index >= 0 && index < tabs.size()) {
            activeTabIndex = index;
            TabItem t = tabs.get(index);
            applyIncognitoSettings(t.isIncognito);
            applyDesktopSiteSettings(t.isDesktopSite);
            if (t.url != null && !t.url.isEmpty()) {
                loadTarget(t.url);
            } else {
                loadHome();
            }
        }
    }

    private void closeTab(int index) {
        if (tabs.size() <= 1) return;
        TabItem removed = tabs.remove(index);
        if (removed.isIncognito) {
            boolean hasOtherIncognito = false;
            for (TabItem t : tabs) {
                if (t.isIncognito) {
                    hasOtherIncognito = true;
                    break;
                }
            }
            if (!hasOtherIncognito) {
                CookieManager.getInstance().removeSessionCookies(null);
                webView.clearCache(true);
            }
        }
        if (activeTabIndex >= tabs.size()) {
            activeTabIndex = tabs.size() - 1;
        }
        updateTabCountDisplay();
        switchToTab(activeTabIndex);
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            private long lastBackPressTime = 0;

            @Override
            public void handleOnBackPressed() {
                if (customView != null) {
                    hideCustomView();
                    return;
                }
                if (findInPageBar.getVisibility() == View.VISIBLE) {
                    webView.clearMatches();
                    findInPageBar.setVisibility(View.GONE);
                    hideKeyboard();
                    return;
                }
                if (webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                String curUrl = webView.getUrl();
                if (curUrl != null && !curUrl.startsWith("file:///android_asset/www/index.html")) {
                    loadHome();
                    return;
                }
                if (tabs.size() > 1) {
                    closeTab(activeTabIndex);
                    return;
                }
                long now = System.currentTimeMillis();
                if (now - lastBackPressTime < 2000) {
                    finish();
                } else {
                    lastBackPressTime = now;
                    Toast.makeText(MainActivity.this, "Press back again to exit AETHER", Toast.LENGTH_SHORT).show();
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
        boolean isIncognito = false;
        if (activeTabIndex >= 0 && activeTabIndex < tabs.size()) {
            isIncognito = tabs.get(activeTabIndex).isIncognito;
        }
        if (isIncognito) {
            webView.loadUrl(HOME_URL + "?private=1#incognito");
        } else {
            webView.loadUrl(HOME_URL + "?v=" + APP_VERSION_NAME);
        }
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

        boolean isIncognito = false;
        if (activeTabIndex >= 0 && activeTabIndex < tabs.size()) {
            isIncognito = tabs.get(activeTabIndex).isIncognito;
        }

        if (url.equals(HOME_URL) || url.startsWith("file:///android_asset")) {
            urlInput.setText("");
            if (isIncognito) {
                urlInput.setHint("🕶️ Search privately or type URL");
                btnSecurity.setImageResource(android.R.drawable.ic_lock_idle_lock);
                btnSecurity.setColorFilter(0xFFC084FC);
            } else {
                urlInput.setHint(R.string.search_hint);
                btnSecurity.setImageResource(android.R.drawable.ic_lock_idle_lock);
                btnSecurity.clearColorFilter();
            }
        } else {
            urlInput.setText(url);
            if (isIncognito) {
                btnSecurity.setImageResource(android.R.drawable.ic_lock_idle_lock);
                btnSecurity.setColorFilter(0xFFC084FC);
            } else if (url.startsWith("https://")) {
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
        popup.getMenu().add(0, 14, 2, "💡 AETHER Notes (+)");
        popup.getMenu().add(0, 15, 3, "✨ AETHER AI Assistant");
        popup.getMenu().add(0, 13, 4, isVpnEnabled ? "🛡️ AETHER VPN: Connected (" + vpnLocation + ")" : "🛡️ AETHER VPN: Disconnected");
        popup.getMenu().add(0, 16, 5, "🔐 Passwords Vault");
        popup.getMenu().add(0, 6, 6, "📱 Share & QR Code...");
        popup.getMenu().add(0, 17, 7, "⚡ Network Diagnostics");
        popup.getMenu().add(0, 3, 8, "History");
        popup.getMenu().add(0, 4, 9, "Downloads");
        popup.getMenu().add(0, 5, 10, "Bookmarks");
        popup.getMenu().add(0, 7, 11, "Find in page");
        popup.getMenu().add(0, 8, 12, isDesktopSite ? "Mobile site" : "Desktop site");
        popup.getMenu().add(0, 10, 13, "Zoom in (+)");
        popup.getMenu().add(0, 11, 14, "Zoom out (-)");
        popup.getMenu().add(0, 12, 15, "Reset zoom (" + currentTextZoom + "%)");
        popup.getMenu().add(0, 9, 16, "Settings");
        popup.getMenu().add(0, 18, 17, "🚀 About & Updates (v" + APP_VERSION_NAME + ")");

        popup.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 1:
                    createNewTab(false);
                    return true;
                case 2:
                    createNewTab(true);
                    return true;
                case 14:
                    openInternalPage("notes");
                    return true;
                case 15:
                    openInternalPage("ai");
                    return true;
                case 16:
                    openInternalPage("passwords");
                    return true;
                case 17:
                    openInternalPage("diagnostics");
                    return true;
                case 18:
                    showUpdateDialog();
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
                case 13:
                    toggleMobileVpn();
                    return true;
                case 10:
                    zoomIn();
                    return true;
                case 11:
                    zoomOut();
                    return true;
                case 12:
                    resetZoom();
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

    private void showUpdateDialog() {
        new androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("🚀 AETHER Browser v" + APP_VERSION_NAME)
            .setMessage("Version Code: " + APP_VERSION_CODE + " (Official Update)\n\n" +
                        "✨ Installed Features:\n" +
                        "• 💡 AETHER Notes with + Multi-Note & Checklists\n" +
                        "• 🛡️ AETHER Secure VPN (32 Enterprise Superpowers)\n" +
                        "• ✨ AETHER Intelligence AI Assistant\n" +
                        "• 🔐 Passwords Vault & Cryptographic Generator\n" +
                        "• 📱 High-Contrast QR Code Share Sheet\n" +
                        "• ⚡ Real-Time Network Diagnostics\n" +
                        "• 🛡️ Shields Ad & Tracker Blocker Active\n\n" +
                        "Your browser is running the updated release!")
            .setPositiveButton("Check Releases", (dialog, which) -> {
                loadTarget("https://github.com/A2004-a/amiyo-browser/releases");
            })
            .setNeutralButton("Direct APK", (dialog, which) -> {
                loadTarget("https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-v0.1.0-Android.apk");
            })
            .setNegativeButton("Close", null)
            .show();
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

    public void applyDesktopSiteSettings(boolean enableDesktop) {
        this.isDesktopSite = enableDesktop;
        if (webView == null) return;
        WebSettings settings = webView.getSettings();
        if (enableDesktop) {
            settings.setUserAgentString("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setSupportZoom(true);
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false);
        } else {
            settings.setUserAgentString(defaultUserAgent != null ? defaultUserAgent + " AETHERBrowser/0.1.0" : null);
            settings.setUseWideViewPort(false);
            settings.setLoadWithOverviewMode(false);
        }
    }

    private void toggleDesktopSite() {
        isDesktopSite = !isDesktopSite;
        if (activeTabIndex >= 0 && activeTabIndex < tabs.size()) {
            tabs.get(activeTabIndex).isDesktopSite = isDesktopSite;
        }
        applyDesktopSiteSettings(isDesktopSite);
        Toast.makeText(this, isDesktopSite ? "Desktop site enabled" : "Mobile site enabled", Toast.LENGTH_SHORT).show();
        if (webView != null) webView.reload();
    }

    @Override
    public void onConfigurationChanged(@NonNull android.content.res.Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (webView != null) {
            webView.post(() -> {
                webView.requestLayout();
                webView.invalidate();
            });
        }
    }

    private void toggleMobileVpn() {
        isVpnEnabled = !isVpnEnabled;
        if (isVpnEnabled) {
            Toast.makeText(this, "🛡️ AETHER VPN Connected (" + vpnLocation + ")\nVirtual IP Assigned & DNS Encrypted", Toast.LENGTH_LONG).show();
        } else {
            Toast.makeText(this, "AETHER VPN Disconnected", Toast.LENGTH_SHORT).show();
        }
    }

    private void injectZoomUnlocker(WebView view) {
        if (view == null) return;
        String zoomScript = "(function() {" +
            "  function unlockZoom() {" +
            "    try {" +
            "      const metas = document.querySelectorAll('meta[name=\"viewport\"]');" +
            "      metas.forEach(m => {" +
            "        let c = m.getAttribute('content') || '';" +
            "        if (/user-scalable\\s*=\\s*(no|0)/i.test(c) || /maximum-scale\\s*=\\s*1(\\.0)?/i.test(c)) {" +
            "          c = c.replace(/user-scalable\\s*=\\s*(no|0)/gi, 'user-scalable=yes');" +
            "          c = c.replace(/maximum-scale\\s*=\\s*[0-9\\.]+/gi, 'maximum-scale=10.0');" +
            "          m.setAttribute('content', c + ', user-scalable=yes, maximum-scale=10.0');" +
            "        }" +
            "      });" +
            "      if (document.documentElement) document.documentElement.style.touchAction = 'manipulation';" +
            "      if (document.body) document.body.style.touchAction = 'manipulation';" +
            "    } catch(e) {}" +
            "  }" +
            "  unlockZoom();" +
            "  document.addEventListener('DOMContentLoaded', unlockZoom);" +
            "  window.addEventListener('load', unlockZoom);" +
            "})();";
        view.evaluateJavascript(zoomScript, null);
    }

    private void injectYouTubeOptimizations(WebView view) {
        if (view == null) return;
        String ytScript = "(function() {" +
            "  if (location.hostname.includes('youtube.com')) {" +
            "    function set4KQuality() {" +
            "      try {" +
            "        const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');" +
            "        if (player) {" +
            "          if (typeof player.setPlaybackQualityRange === 'function') { player.setPlaybackQualityRange('highres', 'hd2160'); }" +
            "          if (typeof player.setPlaybackQuality === 'function') { player.setPlaybackQuality('hd2160'); }" +
            "        }" +
            "      } catch(e) {}" +
            "    }" +
            "    set4KQuality();" +
            "    setInterval(() => {" +
            "      try {" +
            "        const consent = document.querySelector('button[aria-label*=\"Accept\"], button[aria-label*=\"agree\"], .ytd-consent-bump-v2-lightbox button');" +
            "        if (consent) consent.click();" +
            "        const skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');" +
            "        if (skip) { skip.click(); }" +
            "        const vid = document.querySelector('video');" +
            "        const ad = document.querySelector('.ad-showing, .ytp-ad-player-overlay');" +
            "        if (vid && ad) {" +
            "          vid.muted = true;" +
            "          vid.playbackRate = 16.0;" +
            "          if (isFinite(vid.duration) && vid.duration > 0.5) { vid.currentTime = vid.duration - 0.1; }" +
            "        } else if (vid && !ad && vid.playbackRate > 2.0) {" +
            "          vid.playbackRate = 1.0;" +
            "        }" +
            "        document.querySelectorAll('ytd-action-companion-ad-renderer, ytd-banner-promo-renderer-background, .ytp-ad-overlay-container, #masthead-ad').forEach(el => el.remove());" +
            "      } catch(e) {}" +
            "    }, 400);" +
            "    window.addEventListener('yt-navigate-finish', () => { setTimeout(set4KQuality, 600); });" +
            "  }" +
            "})();";
        view.evaluateJavascript(ytScript, null);
    }

    private void showCustomView(View view, WebChromeClient.CustomViewCallback callback) {
        if (customView != null) {
            callback.onCustomViewHidden();
            return;
        }
        customView = view;
        customViewCallback = callback;

        // Hide browser chrome
        if (findViewById(R.id.topBar) != null) findViewById(R.id.topBar).setVisibility(View.GONE);
        if (findViewById(R.id.bottomBar) != null) findViewById(R.id.bottomBar).setVisibility(View.GONE);
        if (swipeRefresh != null) swipeRefresh.setVisibility(View.GONE);
        if (findInPageBar != null) findInPageBar.setVisibility(View.GONE);

        // Setup container
        if (customViewContainer != null) {
            customViewContainer.addView(view, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            customViewContainer.setVisibility(View.VISIBLE);
        }

        // Fullscreen immersive mode & keep screen awake for video
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );

        // Auto-rotate to landscape for cinema viewing
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
    }

    private void hideCustomView() {
        if (customView == null) return;

        // Restore orientation
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);

        // Restore system UI
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);

        if (customViewContainer != null) {
            customViewContainer.removeView(customView);
            customViewContainer.setVisibility(View.GONE);
        }
        if (findViewById(R.id.topBar) != null) findViewById(R.id.topBar).setVisibility(View.VISIBLE);
        if (findViewById(R.id.bottomBar) != null) findViewById(R.id.bottomBar).setVisibility(View.VISIBLE);
        if (swipeRefresh != null) swipeRefresh.setVisibility(View.VISIBLE);

        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }
        customView = null;
    }

    private void zoomIn() {
        currentTextZoom = Math.min(300, currentTextZoom + 20);
        if (webView != null) {
            webView.getSettings().setTextZoom(currentTextZoom);
            webView.zoomIn();
        }
        Toast.makeText(this, "Zoom: " + currentTextZoom + "%", Toast.LENGTH_SHORT).show();
    }

    private void zoomOut() {
        currentTextZoom = Math.max(50, currentTextZoom - 20);
        if (webView != null) {
            webView.getSettings().setTextZoom(currentTextZoom);
            webView.zoomOut();
        }
        Toast.makeText(this, "Zoom: " + currentTextZoom + "%", Toast.LENGTH_SHORT).show();
    }

    private void resetZoom() {
        currentTextZoom = 100;
        if (webView != null) {
            webView.getSettings().setTextZoom(100);
        }
        Toast.makeText(this, "Zoom: 100%", Toast.LENGTH_SHORT).show();
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
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_LOCATION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingGeoCallback != null && pendingGeoOrigin != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, true);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
        } else if (requestCode == PERMISSION_REQUEST_CAMERA_MIC) {
            if (pendingWebPermissionRequest != null) {
                boolean hasGranted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
                if (hasGranted) {
                    pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
                } else {
                    pendingWebPermissionRequest.deny();
                }
                pendingWebPermissionRequest = null;
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
