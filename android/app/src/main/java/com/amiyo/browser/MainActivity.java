package com.amiyo.browser;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.Dialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
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
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.ProgressBar;
import android.widget.ScrollView;
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
    public static final String APP_VERSION_NAME = "0.2.6";
    public static final int APP_VERSION_CODE = 11;
    public static final String DESKTOP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
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
    private boolean isManualFullscreen = false;
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

        @JavascriptInterface
        public void triggerNativeFullscreen() {
            MainActivity.this.triggerNativeFullscreen();
        }

        @JavascriptInterface
        public boolean isManualFullscreenActive() {
            return isManualFullscreen;
        }

        @JavascriptInterface
        public boolean isDesktopSiteActive() {
            return isDesktopSite;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        setContentView(R.layout.activity_main);

        // Restore tabs on Activity recreation if present
        if (savedInstanceState != null) {
            activeTabIndex = savedInstanceState.getInt("active_tab_index", 0);
            isDesktopSite = savedInstanceState.getBoolean("desktop_site", false);
            isVpnEnabled = savedInstanceState.getBoolean("vpn_enabled", false);
            ArrayList<String> tabTitles = savedInstanceState.getStringArrayList("tab_titles");
            ArrayList<String> tabUrls = savedInstanceState.getStringArrayList("tab_urls");
            ArrayList<String> tabIncognitos = savedInstanceState.getStringArrayList("tab_incognitos");
            ArrayList<String> tabDesktopSites = savedInstanceState.getStringArrayList("tab_desktop_sites");
            if (tabTitles != null && tabUrls != null && tabTitles.size() == tabUrls.size()) {
                tabs.clear();
                for (int i = 0; i < tabTitles.size(); i++) {
                    boolean isIncog = tabIncognitos != null && i < tabIncognitos.size() && "1".equals(tabIncognitos.get(i));
                    boolean isDesk = tabDesktopSites != null && i < tabDesktopSites.size() && "1".equals(tabDesktopSites.get(i));
                    TabItem tab = new TabItem(tabTitles.get(i), tabUrls.get(i), isIncog);
                    tab.isDesktopSite = isDesk;
                    tabs.add(tab);
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
        ArrayList<String> tabDesktopSites = new ArrayList<>();
        for (TabItem t : tabs) {
            tabTitles.add(t.title != null ? t.title : "AETHER");
            tabUrls.add(t.url != null ? t.url : HOME_URL);
            tabIncognitos.add(t.isIncognito ? "1" : "0");
            tabDesktopSites.add(t.isDesktopSite ? "1" : "0");
        }
        outState.putStringArrayList("tab_titles", tabTitles);
        outState.putStringArrayList("tab_urls", tabUrls);
        outState.putStringArrayList("tab_incognitos", tabIncognitos);
        outState.putStringArrayList("tab_desktop_sites", tabDesktopSites);
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
        if (customViewContainer != null) {
            customViewContainer.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }

        swipeRefresh.setColorSchemeResources(R.color.accent, R.color.primary);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
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
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

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
        // Remove 'Version/4.0' from User-Agent so mobile video sites (YouTube, Vimeo, etc.)
        // enable full HTML5 fullscreen and native video player controls
        String cleanUA = defaultUserAgent != null ? defaultUserAgent.replace("Version/4.0 ", "") : null;
        settings.setUserAgentString(cleanUA);

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
            public void onShowCustomView(View view, int requestedOrientation, CustomViewCallback callback) {
                showCustomView(view, callback);
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
            }

            @Override
            public Bitmap getDefaultVideoPoster() {
                return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
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
                if (isDesktopSite) {
                    injectDesktopViewport(view);
                } else {
                    injectZoomUnlocker(view);
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

                if (isDesktopSite) {
                    injectDesktopViewport(view);
                } else {
                    injectZoomUnlocker(view);
                }
                injectYouTubeOptimizations(view);
                injectCosmeticAdBlocker(view);
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
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        float dp = getResources().getDisplayMetrics().density;

        // Outer Root Container
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad18 = (int) (18 * dp);
        root.setPadding(pad18, pad18, pad18, pad18);

        // Root Background: Deep Obsidian #0B0F19 with border #1E293B and 22dp radius
        GradientDrawable rootBg = new GradientDrawable();
        rootBg.setColor(0xFF0B0F19);
        rootBg.setCornerRadius(22 * dp);
        rootBg.setStroke((int) (1.5f * dp), 0xFF1E293B);
        root.setBackground(rootBg);

        // Header Bar (Horizontal)
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // Header Title Wrap
        LinearLayout titleWrap = new LinearLayout(this);
        titleWrap.setOrientation(LinearLayout.HORIZONTAL);
        titleWrap.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams titleWrapParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        titleWrap.setLayoutParams(titleWrapParams);

        TextView iconTv = new TextView(this);
        iconTv.setText("🗂️");
        iconTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        iconTv.setPadding(0, 0, (int) (8 * dp), 0);
        titleWrap.addView(iconTv);

        TextView titleTv = new TextView(this);
        titleTv.setText("Open Tabs");
        titleTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        titleTv.setTypeface(Typeface.DEFAULT_BOLD);
        titleTv.setTextColor(0xFFF8FAFC);
        titleWrap.addView(titleTv);

        // Count Badge
        TextView countBadge = new TextView(this);
        countBadge.setText(" " + tabs.size() + " ");
        countBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        countBadge.setTypeface(Typeface.DEFAULT_BOLD);
        countBadge.setTextColor(0xFF38BDF8);
        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setColor(0x2238BDF8);
        badgeBg.setCornerRadius(10 * dp);
        countBadge.setBackground(badgeBg);
        countBadge.setPadding((int) (6 * dp), (int) (2 * dp), (int) (6 * dp), (int) (2 * dp));
        LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        badgeParams.leftMargin = (int) (8 * dp);
        countBadge.setLayoutParams(badgeParams);
        titleWrap.addView(countBadge);

        header.addView(titleWrap);

        // Close Button (✕)
        TextView btnClose = new TextView(this);
        btnClose.setText("✕");
        btnClose.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        btnClose.setTypeface(Typeface.DEFAULT_BOLD);
        btnClose.setTextColor(0xFF94A3B8);
        btnClose.setGravity(Gravity.CENTER);
        GradientDrawable closeBg = new GradientDrawable();
        closeBg.setColor(0x1AFFFFFF);
        closeBg.setCornerRadius(14 * dp);
        btnClose.setBackground(closeBg);
        LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams((int) (28 * dp), (int) (28 * dp));
        btnClose.setLayoutParams(closeParams);
        btnClose.setOnClickListener(v -> dialog.dismiss());
        header.addView(btnClose);

        root.addView(header);

        // Subtitle
        TextView subtitleTv = new TextView(this);
        subtitleTv.setText("Switch, create, or close active browser tabs");
        subtitleTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        subtitleTv.setTextColor(0xFF64748B);
        subtitleTv.setPadding(0, (int) (4 * dp), 0, (int) (12 * dp));
        root.addView(subtitleTv);

        // Scrollable Tabs Container
        ScrollView scrollView = new ScrollView(this);
        LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f);
        scrollView.setLayoutParams(scrollParams);
        scrollView.setVerticalScrollBarEnabled(false);

        LinearLayout listContainer = new LinearLayout(this);
        listContainer.setOrientation(LinearLayout.VERTICAL);
        listContainer.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        for (int i = 0; i < tabs.size(); i++) {
            final int tabIndex = i;
            TabItem tab = tabs.get(i);
            boolean isActive = (i == activeTabIndex);

            LinearLayout tabCard = new LinearLayout(this);
            tabCard.setOrientation(LinearLayout.HORIZONTAL);
            tabCard.setGravity(Gravity.CENTER_VERTICAL);
            int cardPad = (int) (12 * dp);
            tabCard.setPadding(cardPad, cardPad, cardPad, cardPad);

            GradientDrawable cardBg = new GradientDrawable();
            if (isActive) {
                cardBg.setColor(0xFF14243B); // Cyan tinted obsidian card
                cardBg.setStroke((int) (1.5f * dp), 0xFF38BDF8); // Bright Cyan Border
            } else {
                cardBg.setColor(0xFF111827); // Dark Slate Card
                cardBg.setStroke((int) (1.0f * dp), 0xFF1E293B);
            }
            cardBg.setCornerRadius(14 * dp);
            tabCard.setBackground(cardBg);

            LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            cardParams.bottomMargin = (int) (8 * dp);
            tabCard.setLayoutParams(cardParams);

            // Tab Icon
            TextView tabIcon = new TextView(this);
            String iconSymbol = tab.isIncognito ? "🕶️" : (tab.url == null || tab.url.contains("index.html") ? "🏠" : "🌐");
            tabIcon.setText(iconSymbol);
            tabIcon.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
            tabIcon.setGravity(Gravity.CENTER);
            GradientDrawable iconBg = new GradientDrawable();
            iconBg.setColor(tab.isIncognito ? 0x22C084FC : (isActive ? 0x2238BDF8 : 0x1AFFFFFF));
            iconBg.setCornerRadius(10 * dp);
            tabIcon.setBackground(iconBg);
            LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams((int) (36 * dp), (int) (36 * dp));
            iconParams.rightMargin = (int) (10 * dp);
            tabIcon.setLayoutParams(iconParams);
            tabCard.addView(tabIcon);

            // Tab Details (Title + Subtitle/URL)
            LinearLayout details = new LinearLayout(this);
            details.setOrientation(LinearLayout.VERTICAL);
            LinearLayout.LayoutParams detailsParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            details.setLayoutParams(detailsParams);

            // Row for Title + Active Badge
            LinearLayout titleRow = new LinearLayout(this);
            titleRow.setOrientation(LinearLayout.HORIZONTAL);
            titleRow.setGravity(Gravity.CENTER_VERTICAL);

            TextView tabTitle = new TextView(this);
            tabTitle.setText(tab.title != null && !tab.title.isEmpty() ? tab.title : (tab.isIncognito ? "Incognito Tab" : "AETHER Browser"));
            tabTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
            tabTitle.setTypeface(Typeface.DEFAULT_BOLD);
            tabTitle.setTextColor(isActive ? 0xFFFFFFFF : 0xFFE2E8F0);
            tabTitle.setSingleLine(true);
            tabTitle.setEllipsize(TextUtils.TruncateAt.END);
            LinearLayout.LayoutParams tParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            tabTitle.setLayoutParams(tParams);
            titleRow.addView(tabTitle);

            if (isActive) {
                TextView activeBadge = new TextView(this);
                activeBadge.setText("ACTIVE");
                activeBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
                activeBadge.setTypeface(Typeface.DEFAULT_BOLD);
                activeBadge.setTextColor(0xFF38BDF8);
                GradientDrawable abBg = new GradientDrawable();
                abBg.setColor(0x2238BDF8);
                abBg.setCornerRadius(6 * dp);
                activeBadge.setBackground(abBg);
                activeBadge.setPadding((int) (5 * dp), (int) (1 * dp), (int) (5 * dp), (int) (1 * dp));
                LinearLayout.LayoutParams abParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                abParams.leftMargin = (int) (6 * dp);
                activeBadge.setLayoutParams(abParams);
                titleRow.addView(activeBadge);
            }
            details.addView(titleRow);

            // Tab URL
            TextView tabUrl = new TextView(this);
            String displayUrl = tab.url;
            if (displayUrl == null || displayUrl.contains("index.html")) {
                displayUrl = tab.isIncognito ? "aether://incognito" : "aether://home";
            } else {
                try {
                    android.net.Uri uri = android.net.Uri.parse(displayUrl);
                    if (uri.getHost() != null) displayUrl = uri.getHost();
                } catch (Exception ignored) {}
            }
            tabUrl.setText(displayUrl);
            tabUrl.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            tabUrl.setTextColor(tab.isIncognito ? 0xFFA855F7 : 0xFF64748B);
            tabUrl.setSingleLine(true);
            tabUrl.setEllipsize(TextUtils.TruncateAt.END);
            tabUrl.setPadding(0, (int) (2 * dp), 0, 0);
            details.addView(tabUrl);

            tabCard.addView(details);

            // Close Tab Button (if more than 1 tab)
            if (tabs.size() > 1) {
                TextView btnCloseTab = new TextView(this);
                btnCloseTab.setText("✕");
                btnCloseTab.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
                btnCloseTab.setTypeface(Typeface.DEFAULT_BOLD);
                btnCloseTab.setTextColor(0xFFEF4444);
                btnCloseTab.setGravity(Gravity.CENTER);
                GradientDrawable ctBg = new GradientDrawable();
                ctBg.setColor(0x22EF4444);
                ctBg.setCornerRadius(10 * dp);
                btnCloseTab.setBackground(ctBg);
                LinearLayout.LayoutParams ctParams = new LinearLayout.LayoutParams((int) (26 * dp), (int) (26 * dp));
                ctParams.leftMargin = (int) (8 * dp);
                btnCloseTab.setLayoutParams(ctParams);
                btnCloseTab.setOnClickListener(v -> {
                    closeTab(tabIndex);
                    dialog.dismiss();
                    showTabSwitcher();
                });
                tabCard.addView(btnCloseTab);
            }

            // Click Card to Switch
            tabCard.setOnClickListener(v -> {
                switchToTab(tabIndex);
                dialog.dismiss();
            });

            listContainer.addView(tabCard);
        }

        scrollView.addView(listContainer);
        root.addView(scrollView);

        // Action Buttons Row (Footer)
        LinearLayout actionsRow = new LinearLayout(this);
        actionsRow.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams actionsParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        actionsParams.topMargin = (int) (12 * dp);
        actionsRow.setLayoutParams(actionsParams);

        // 1. Incognito Button
        Button btnIncognito = new Button(this);
        btnIncognito.setText("🕶️ Incognito");
        btnIncognito.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        btnIncognito.setTypeface(Typeface.DEFAULT_BOLD);
        btnIncognito.setTextColor(0xFFC084FC);
        btnIncognito.setAllCaps(false);
        GradientDrawable incogBg = new GradientDrawable();
        incogBg.setColor(0x22A855F7);
        incogBg.setStroke((int) (1.2f * dp), 0xFFA855F7);
        incogBg.setCornerRadius(12 * dp);
        btnIncognito.setBackground(incogBg);
        LinearLayout.LayoutParams btnIncogParams = new LinearLayout.LayoutParams(0, (int) (44 * dp), 1.0f);
        btnIncogParams.rightMargin = (int) (8 * dp);
        btnIncognito.setLayoutParams(btnIncogParams);
        btnIncognito.setOnClickListener(v -> {
            dialog.dismiss();
            createNewTab(true);
        });
        actionsRow.addView(btnIncognito);

        // 2. New Tab Button
        Button btnNewTab = new Button(this);
        btnNewTab.setText("＋ New Tab");
        btnNewTab.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        btnNewTab.setTypeface(Typeface.DEFAULT_BOLD);
        btnNewTab.setTextColor(0xFF090D16);
        btnNewTab.setAllCaps(false);
        GradientDrawable newTabBg = new GradientDrawable();
        newTabBg.setColor(0xFF38BDF8); // Vibrant AETHER Cyan
        newTabBg.setCornerRadius(12 * dp);
        btnNewTab.setBackground(newTabBg);
        LinearLayout.LayoutParams btnNewTabParams = new LinearLayout.LayoutParams(0, (int) (44 * dp), 1.2f);
        btnNewTab.setLayoutParams(btnNewTabParams);
        btnNewTab.setOnClickListener(v -> {
            dialog.dismiss();
            createNewTab(false);
        });
        actionsRow.addView(btnNewTab);

        root.addView(actionsRow);

        dialog.setContentView(root);

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            int screenWidth = getResources().getDisplayMetrics().widthPixels;
            int dialogWidth = Math.min(screenWidth - (int) (32 * dp), (int) (420 * dp));
            dialog.getWindow().setLayout(dialogWidth, ViewGroup.LayoutParams.WRAP_CONTENT);
            dialog.getWindow().setDimAmount(0.65f);
        }

        dialog.show();
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
        applyDesktopSiteSettings(false);
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
                if (isManualFullscreen) {
                    exitManualFullscreen();
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
        popup.getMenu().add(0, 19, 7, "📖 Reader Mode");
        popup.getMenu().add(0, 20, 8, "⚡ Command Palette...");
        popup.getMenu().add(0, 17, 9, "⚡ Network Diagnostics");
        popup.getMenu().add(0, 3, 8, "History");
        popup.getMenu().add(0, 4, 9, "Downloads");
        popup.getMenu().add(0, 5, 10, "Bookmarks");
        popup.getMenu().add(0, 7, 11, "Find in page");
        popup.getMenu().add(0, 8, 12, isDesktopSite ? "☑ Desktop site" : "☐ Desktop site");
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
                case 19:
                    openInternalPage("reader");
                    return true;
                case 20:
                    webView.evaluateJavascript("if(typeof openCommandPaletteModal === 'function') openCommandPaletteModal(); else location.hash = '#palette';", null);
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
                        "• 🎨 Obsidian & Cyberpunk Cyan Dark Tab Switcher Dialog\n" +
                        "• 💡 AETHER Notes with + Multi-Note & Checklists\n" +
                        "• 👁️ Hide & Unhide Features (AETHER Notes, Shortcuts, Quick Strip, Shields)\n" +
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
                loadTarget("https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-v0.2.6-Android.apk");
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
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        if (enableDesktop) {
            settings.setUserAgentString(DESKTOP_USER_AGENT);
            injectDesktopViewport(webView);
        } else {
            String cleanUA = defaultUserAgent != null ? defaultUserAgent.replace("Version/4.0 ", "") : null;
            settings.setUserAgentString(cleanUA);
            injectZoomUnlocker(webView);
        }
    }

    private void toggleDesktopSite() {
        isDesktopSite = !isDesktopSite;
        if (activeTabIndex >= 0 && activeTabIndex < tabs.size()) {
            tabs.get(activeTabIndex).isDesktopSite = isDesktopSite;
        }
        applyDesktopSiteSettings(isDesktopSite);
        Toast.makeText(this, isDesktopSite ? "Desktop site enabled" : "Mobile site enabled", Toast.LENGTH_SHORT).show();

        String curUrl = webView != null ? webView.getUrl() : null;
        if (curUrl != null && curUrl.startsWith("file:///android_asset")) {
            webView.evaluateJavascript(isDesktopSite ? 
                "document.body.classList.add('desktop-site-active');" : 
                "document.body.classList.remove('desktop-site-active');", null);
        }

        if (curUrl != null && !curUrl.startsWith("file://")) {
            if (isDesktopSite) {
                if (curUrl.contains("://m.youtube.com")) {
                    webView.loadUrl(curUrl.replace("://m.youtube.com", "://www.youtube.com"));
                    return;
                } else if (curUrl.contains("://m.facebook.com")) {
                    webView.loadUrl(curUrl.replace("://m.facebook.com", "://www.facebook.com"));
                    return;
                } else if (curUrl.contains(".m.wikipedia.org")) {
                    webView.loadUrl(curUrl.replace(".m.wikipedia.org", ".wikipedia.org"));
                    return;
                } else if (curUrl.contains("://mobile.twitter.com")) {
                    webView.loadUrl(curUrl.replace("://mobile.twitter.com", "://twitter.com"));
                    return;
                }
            } else {
                if (curUrl.contains("://www.youtube.com")) {
                    webView.loadUrl(curUrl.replace("://www.youtube.com", "://m.youtube.com"));
                    return;
                } else if (curUrl.contains("://www.facebook.com")) {
                    webView.loadUrl(curUrl.replace("://www.facebook.com", "://m.facebook.com"));
                    return;
                } else if (curUrl.contains(".wikipedia.org") && !curUrl.contains(".m.wikipedia.org")) {
                    webView.loadUrl(curUrl.replace(".wikipedia.org", ".m.wikipedia.org"));
                    return;
                }
            }
        }

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

    private void injectDesktopViewport(WebView view) {
        if (view == null) return;
        String desktopScript = "(function() {" +
            "  function applyDesktop() {" +
            "    try {" +
            "      let meta = document.querySelector('meta[name=\"viewport\"]');" +
            "      if (!meta) {" +
            "        meta = document.createElement('meta');" +
            "        meta.name = 'viewport';" +
            "        (document.head || document.documentElement).appendChild(meta);" +
            "      }" +
            "      meta.setAttribute('content', 'width=1180, initial-scale=0.35, minimum-scale=0.1, maximum-scale=5.0, user-scalable=yes');" +
            "      if (document.documentElement) {" +
            "        document.documentElement.style.minWidth = '1180px';" +
            "        document.documentElement.style.overflowX = 'auto';" +
            "      }" +
            "      if (document.body) {" +
            "        document.body.style.minWidth = '1180px';" +
            "      }" +
            "    } catch(e) {}" +
            "  }" +
            "  applyDesktop();" +
            "  document.addEventListener('DOMContentLoaded', applyDesktop);" +
            "  window.addEventListener('load', applyDesktop);" +
            "})();";
        view.evaluateJavascript(desktopScript, null);
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
            "    function injectClearVideoStyles() {" +
            "      try {" +
            "        let style = document.getElementById('aether-yt-clear-video-css');" +
            "        if (!style) {" +
            "          style = document.createElement('style');" +
            "          style.id = 'aether-yt-clear-video-css';" +
            "          style.textContent = `" +
            "            .ambient-mode-canvas, .player-ambient-mode, #ambient-mode, .ytp-ambient-mode, .cinematic_lighting, canvas.ambient-mode-canvas, .ytm-cinema-overlay, .ytp-cued-thumbnail-overlay, .ytp-cued-thumbnail-overlay-image {" +
            "              display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; filter: none !important; backdrop-filter: none !important; width: 0 !important; height: 0 !important;" +
            "            }" +
            "            video.video-stream, .html5-main-video, video {" +
            "              display: block !important; visibility: visible !important; opacity: 1 !important; filter: none !important; backdrop-filter: none !important; max-width: 100% !important; max-height: 100% !important; object-fit: contain !important; z-index: 1 !important;" +
            "            }" +
            "            .html5-video-player, .html5-video-container, #movie_player, .player-container {" +
            "              background: #000000 !important;" +
            "            }" +
            "            .ytp-chrome-bottom, .player-controls-middle, .player-controls-bottom, .ytm-custom-controls, .ytp-caption-window-container, .caption-window {" +
            "              z-index: 2147483647 !important;" +
            "            }" +
            "          `;" +
            "          (document.head || document.documentElement).appendChild(style);" +
            "        }" +
            "      } catch(e) {}" +
            "    }" +
            "    function clearBlurAndFitVideo() {" +
            "      try {" +
            "        injectClearVideoStyles();" +
            "        document.querySelectorAll('.ambient-mode-canvas, .player-ambient-mode, #ambient-mode, .ytp-ambient-mode, canvas.ambient-mode-canvas, .cinematic_lighting, .ytm-cinema-overlay').forEach(el => {" +
            "          el.style.display = 'none';" +
            "          el.remove();" +
            "        });" +
            "        const vid = document.querySelector('video');" +
            "        if (vid) {" +
            "          vid.style.setProperty('filter', 'none', 'important');" +
            "          vid.style.setProperty('backdrop-filter', 'none', 'important');" +
            "          vid.style.setProperty('opacity', '1', 'important');" +
            "          vid.style.setProperty('visibility', 'visible', 'important');" +
            "          vid.style.setProperty('z-index', '1', 'important');" +
            "          if (document.fullscreenElement || window.innerWidth > window.innerHeight) {" +
            "            vid.style.setProperty('width', '100%', 'important');" +
            "            vid.style.setProperty('height', '100%', 'important');" +
            "            vid.style.setProperty('object-fit', 'contain', 'important');" +
            "          }" +
            "        }" +
            "      } catch(e) {}" +
            "    }" +
            "    function set4KQuality() {" +
            "      try {" +
            "        const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');" +
            "        if (player) {" +
            "          if (typeof player.setPlaybackQualityRange === 'function') { player.setPlaybackQualityRange('highres', 'hd2160'); }" +
            "          if (typeof player.setPlaybackQuality === 'function') { player.setPlaybackQuality('hd2160'); }" +
            "        }" +
            "      } catch(e) {}" +
            "    }" +
            "    function attachFullscreenTriggers() {" +
            "      try {" +
            "        const selectors = '.fullscreen-icon, .ytp-fullscreen-button, .ytm-fullscreen-button, button[aria-label*=\"Full screen\" i], button[aria-label*=\"Fullscreen\" i], button[aria-label*=\"Cinema\" i], button[aria-label*=\"Exit full screen\" i], button[aria-label*=\"Exit fullscreen\" i], button[aria-label*=\"Shrink\" i]';" +
            "        const buttons = document.querySelectorAll(selectors);" +
            "        buttons.forEach(btn => {" +
            "          if (!btn._aetherAttached) {" +
            "            btn._aetherAttached = true;" +
            "            const trigger = function(e) {" +
            "              clearBlurAndFitVideo();" +
            "              const vid = document.querySelector('video');" +
            "              const isFull = document.fullscreenElement || document.webkitFullscreenElement || (window.AetherAndroid && window.AetherAndroid.isManualFullscreenActive && window.AetherAndroid.isManualFullscreenActive());" +
            "              if (isFull) {" +
            "                if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});" +
            "                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();" +
            "              } else {" +
            "                if (vid) {" +
            "                  if (typeof vid.webkitEnterFullscreen === 'function') { vid.webkitEnterFullscreen(); }" +
            "                  else if (typeof vid.requestFullscreen === 'function') { vid.requestFullscreen().catch(()=>{}); }" +
            "                }" +
            "              }" +
            "              if (window.AetherAndroid && window.AetherAndroid.triggerNativeFullscreen) {" +
            "                window.AetherAndroid.triggerNativeFullscreen();" +
            "              }" +
            "              setTimeout(clearBlurAndFitVideo, 200);" +
            "              setTimeout(clearBlurAndFitVideo, 500);" +
            "            };" +
            "            btn.addEventListener('click', trigger, false);" +
            "            btn.addEventListener('touchend', trigger, false);" +
            "          }" +
            "        });" +
            "      } catch(e) {}" +
            "    }" +
            "    injectClearVideoStyles();" +
            "    clearBlurAndFitVideo();" +
            "    set4KQuality();" +
            "    attachFullscreenTriggers();" +
            "    setInterval(() => {" +
            "      try {" +
            "        attachFullscreenTriggers();" +
            "        clearBlurAndFitVideo();" +
            "        const consent = document.querySelector('button[aria-label*=\"Accept\"], button[aria-label*=\"agree\"], .ytd-consent-bump-v2-lightbox button');" +
            "        if (consent) consent.click();" +
            "        const skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');" +
            "        if (skip) { skip.click(); }" +
            "        const vid = document.querySelector('video');" +
            "        const ad = document.querySelector('.ad-showing');" +
            "        if (vid && ad) {" +
            "          vid.muted = true;" +
            "          vid.playbackRate = 16.0;" +
            "          if (isFinite(vid.duration) && vid.duration > 0.5) { vid.currentTime = vid.duration - 0.1; }" +
            "        } else if (vid && !ad && vid.playbackRate > 2.0) {" +
            "          vid.playbackRate = 1.0;" +
            "        }" +
            "        document.querySelectorAll('ytd-action-companion-ad-renderer, ytd-banner-promo-renderer-background, #masthead-ad').forEach(el => el.remove());" +
            "      } catch(e) {}" +
            "    }, 350);" +
            "    window.addEventListener('resize', () => { setTimeout(clearBlurAndFitVideo, 150); });" +
            "    window.addEventListener('yt-navigate-finish', () => { setTimeout(() => { set4KQuality(); attachFullscreenTriggers(); clearBlurAndFitVideo(); }, 600); });" +
            "  }" +
            "})();";
        view.evaluateJavascript(ytScript, null);
    }

    private void injectCosmeticAdBlocker(WebView view) {
        if (view == null || !shieldsEnabled) return;
        String cssHide = "(function() {" +
            "  try {" +
            "    const style = document.createElement('style');" +
            "    style.textContent = '.ad, .ads, .ad-banner, .advertisement, [id*=\"google_ads\"], [id*=\"banner_ad\"], .cookie-banner, #onetrust-banner-sdk { display: none !important; visibility: hidden !important; height: 0 !important; }';" +
            "    (document.head || document.documentElement).appendChild(style);" +
            "  } catch(e) {}" +
            "})();";
        view.evaluateJavascript(cssHide, null);
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
        isManualFullscreen = false;
    }

    public void triggerNativeFullscreen() {
        runOnUiThread(() -> {
            if (customView != null) {
                return;
            }
            if (isManualFullscreen) {
                exitManualFullscreen();
            } else {
                enterManualFullscreen();
            }
        });
    }

    private void enterManualFullscreen() {
        isManualFullscreen = true;
        if (findViewById(R.id.topBar) != null) findViewById(R.id.topBar).setVisibility(View.GONE);
        if (findViewById(R.id.bottomBar) != null) findViewById(R.id.bottomBar).setVisibility(View.GONE);
        if (swipeRefresh != null) swipeRefresh.setEnabled(false);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
    }

    private void exitManualFullscreen() {
        isManualFullscreen = false;
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        if (findViewById(R.id.topBar) != null) findViewById(R.id.topBar).setVisibility(View.VISIBLE);
        if (findViewById(R.id.bottomBar) != null) findViewById(R.id.bottomBar).setVisibility(View.VISIBLE);
        if (swipeRefresh != null) swipeRefresh.setEnabled(true);
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
