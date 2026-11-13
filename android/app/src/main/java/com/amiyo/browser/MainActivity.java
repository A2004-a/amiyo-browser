package com.amiyo.browser;

import android.annotation.SuppressLint;
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
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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

    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupWebView();
        setupEvents();
        setupBackNavigation();

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
        txtTabCount = findViewById(R.id.txtTabCount);

        btnNavBack = findViewById(R.id.btnNavBack);
        btnNavForward = findViewById(R.id.btnNavForward);
        btnNavHome = findViewById(R.id.btnNavHome);
        btnNavBookmark = findViewById(R.id.btnNavBookmark);
        btnNavReload = findViewById(R.id.btnNavReload);

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

        // Standard modern mobile Chrome User-Agent
        String customUA = settings.getUserAgentString() + " AETHERBrowser/1.1.0";
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
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
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
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                updateOmnibox(url);
                updateNavButtons();
                swipeRefresh.setRefreshing(false);
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
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
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
                (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_DOWN)) {
                String target = urlInput.getText().toString().trim();
                loadTarget(target);
                hideKeyboard();
                webView.requestFocus();
                return true;
            }
            return false;
        });

        urlInput.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                btnClearUrl.setVisibility(s.length() > 0 && urlInput.hasFocus() ? View.VISIBLE : View.GONE);
            }
            @Override public void afterTextChanged(Editable s) {}
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
            if (webView.canGoBack()) webView.goBack();
        });

        btnNavForward.setOnClickListener(v -> {
            if (webView.canGoForward()) webView.goForward();
        });

        btnNavHome.setOnClickListener(v -> loadHome());

        btnNavReload.setOnClickListener(v -> webView.reload());

        btnNavBookmark.setOnClickListener(v -> {
            String title = webView.getTitle() != null ? webView.getTitle() : "Bookmark";
            Toast.makeText(this, "Bookmarked: " + title, Toast.LENGTH_SHORT).show();
        });

        btnMenu.setOnClickListener(this::showChromeMenu);
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });
    }

    public void loadTarget(String input) {
        if (input == null || input.isEmpty()) return;

        input = input.trim();
        if (input.equals("aether://newtab") || input.equals("amiyo://newtab") || input.equalsIgnoreCase("about:blank")) {
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

    private void updateOmnibox(String url) {
        if (url == null) return;

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
        popup.getMenu().add(0, 8, 7, "Desktop site");
        popup.getMenu().add(0, 9, 8, "Settings");

        popup.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 1:
                    loadHome();
                    return true;
                case 2:
                    Toast.makeText(this, "Opening Incognito tab", Toast.LENGTH_SHORT).show();
                    loadHome();
                    return true;
                case 6:
                    shareCurrentPage();
                    return true;
                case 8:
                    toggleDesktopSite();
                    return true;
                case 9:
                    Toast.makeText(this, "AETHER Browser v1.1.0 (Android)", Toast.LENGTH_SHORT).show();
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
        }
    }

    private void toggleDesktopSite() {
        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        if (ua.contains("Mobile")) {
            settings.setUserAgentString(ua.replace("Mobile", "X11"));
            settings.setUseWideViewPort(true);
            Toast.makeText(this, "Desktop site requested", Toast.LENGTH_SHORT).show();
        } else {
            settings.setUserAgentString(null);
            Toast.makeText(this, "Mobile site requested", Toast.LENGTH_SHORT).show();
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
                        results = new Uri[]{ data.getData() };
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

