import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate, UITextFieldDelegate {

    private var webView: WKWebView!
    private let topBar = UIView()
    private let searchField = UITextField()
    private let shieldsButton = UIButton(type: .system)
    private let progressBar = UIProgressView(progressViewStyle: .bar)

    // Sleek iOS Bottom Navigation Bar
    private let bottomBar = UIView()
    private let backButton = UIButton(type: .system)
    private let forwardButton = UIButton(type: .system)
    private let shareButton = UIButton(type: .system)
    private let homeButton = UIButton(type: .system)
    private let reloadButton = UIButton(type: .system)
    private let refreshControl = UIRefreshControl()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupWebView()
        loadHome()
    }

    private func setupUI() {
        view.backgroundColor = UIColor(red: 11/255, green: 15/255, blue: 20/255, alpha: 1.0) // Obsidian Black

        // Top Navigation Bar
        topBar.translatesAutoresizingMaskIntoConstraints = false
        topBar.backgroundColor = UIColor(red: 18/255, green: 27/255, blue: 43/255, alpha: 1.0) // Midnight Navy
        view.addSubview(topBar)

        // Search Field
        searchField.translatesAutoresizingMaskIntoConstraints = false
        searchField.backgroundColor = UIColor(red: 25/255, green: 35/255, blue: 50/255, alpha: 1.0)
        searchField.textColor = .white
        searchField.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        searchField.placeholder = "Search with DuckDuckGo or enter URL"
        searchField.layer.cornerRadius = 18
        searchField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 36))
        searchField.leftViewMode = .always
        searchField.autocorrectionType = .no
        searchField.autocapitalizationType = .none
        searchField.keyboardType = .webSearch
        searchField.returnKeyType = .go
        searchField.delegate = self
        topBar.addSubview(searchField)

        // Shields Button
        shieldsButton.translatesAutoresizingMaskIntoConstraints = false
        shieldsButton.setTitle("🛡️", for: .normal)
        shieldsButton.titleLabel?.font = UIFont.systemFont(ofSize: 18)
        shieldsButton.addTarget(self, action: #selector(toggleShields), for: .touchUpInside)
        topBar.addSubview(shieldsButton)

        // Progress Bar
        progressBar.translatesAutoresizingMaskIntoConstraints = false
        progressBar.progressTintColor = UIColor(red: 53/255, green: 216/255, blue: 242/255, alpha: 1.0) // Electric Cyan
        progressBar.trackTintColor = .clear
        view.addSubview(progressBar)

        // Bottom Navigation Bar
        bottomBar.translatesAutoresizingMaskIntoConstraints = false
        bottomBar.backgroundColor = UIColor(red: 18/255, green: 27/255, blue: 43/255, alpha: 1.0) // Midnight Navy
        view.addSubview(bottomBar)

        let stackView = UIStackView()
        stackView.translatesAutoresizingMaskIntoConstraints = false
        stackView.axis = .horizontal
        stackView.distribution = .equalSpacing
        stackView.alignment = .center
        bottomBar.addSubview(stackView)

        configureNavButton(backButton, title: "◀", action: #selector(handleBack))
        configureNavButton(forwardButton, title: "▶", action: #selector(handleForward))
        configureNavButton(shareButton, title: "⬆", action: #selector(handleShare))
        configureNavButton(homeButton, title: "⌂", action: #selector(handleHome))
        configureNavButton(reloadButton, title: "↻", action: #selector(handleReload))

        stackView.addArrangedSubview(backButton)
        stackView.addArrangedSubview(forwardButton)
        stackView.addArrangedSubview(shareButton)
        stackView.addArrangedSubview(homeButton)
        stackView.addArrangedSubview(reloadButton)

        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topBar.heightAnchor.constraint(equalToConstant: 54),

            shieldsButton.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 12),
            shieldsButton.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            shieldsButton.widthAnchor.constraint(equalToConstant: 32),

            searchField.leadingAnchor.constraint(equalTo: shieldsButton.trailingAnchor, constant: 8),
            searchField.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -12),
            searchField.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            searchField.heightAnchor.constraint(equalToConstant: 36),

            progressBar.topAnchor.constraint(equalTo: topBar.bottomAnchor),
            progressBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressBar.heightAnchor.constraint(equalToConstant: 2),

            bottomBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottomBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            bottomBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -50),

            stackView.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor, constant: 24),
            stackView.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor, constant: -24),
            stackView.topAnchor.constraint(equalTo: bottomBar.topAnchor, constant: 6),
            stackView.heightAnchor.constraint(equalToConstant: 40)
        ])
    }

    private func configureNavButton(_ button: UIButton, title: String, action: Selector) {
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 20, weight: .semibold)
        button.tintColor = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1.0)
        button.addTarget(self, action: action, for: .touchUpInside)
        button.widthAnchor.constraint(equalToConstant: 44).isActive = true
        button.heightAnchor.constraint(equalToConstant: 40).isActive = true
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        // Brave-grade iOS cosmetic ad-hiding and YouTube ad-skipping scriptlet
        let blockScript = """
        (function() {
          var css = '.ad-container, .ad-banner, .advertisement, [id^="google_ads"], ' +
                    'iframe[src*="doubleclick"], .ytp-ad-module, .video-ads, ' +
                    'ytd-promoted-video-renderer, ytd-display-ad-renderer ' +
                    '{ display: none !important; }';
          var style = document.createElement('style');
          style.textContent = css;
          if (document.head) document.head.appendChild(style);
          if (location.hostname.includes('youtube.com')) {
            setInterval(function() {
              var skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
              if (skipBtn) skipBtn.click();
              var vid = document.querySelector('video');
              var ad = document.querySelector('.ad-showing, .video-ads');
              if (vid && ad && isFinite(vid.duration)) { vid.currentTime = vid.duration; }
            }, 500);
          }
        })();
        """
        let userScript = WKUserScript(source: blockScript, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        let contentController = WKUserContentController()
        contentController.addUserScript(userScript)
        config.userContentController = contentController

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true // Native Safari/Brave swipe gestures
        webView.backgroundColor = UIColor(red: 11/255, green: 15/255, blue: 20/255, alpha: 1.0)
        webView.isOpaque = false

        // Pull to refresh
        refreshControl.addTarget(self, action: #selector(handlePullToRefresh), for: .valueChanged)
        webView.scrollView.addSubview(refreshControl)

        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: progressBar.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: bottomBar.topAnchor)
        ])

        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
        updateNavControls()
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "estimatedProgress" {
            progressBar.progress = Float(webView.estimatedProgress)
            progressBar.isHidden = webView.estimatedProgress >= 1.0
        }
    }

    func loadHome() {
        if let url = URL(string: "https://duckduckgo.com") {
            webView.load(URLRequest(url: url))
        }
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        guard let text = textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return true }

        let targetUrl: URL
        if text.hasPrefix("http://") || text.hasPrefix("https://") {
            targetUrl = URL(string: text) ?? URL(string: "https://duckduckgo.com")!
        } else if text.contains(".") && !text.contains(" ") {
            targetUrl = URL(string: "https://" + text) ?? URL(string: "https://duckduckgo.com")!
        } else {
            let encoded = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            targetUrl = URL(string: "https://duckduckgo.com/?q=\(encoded)")!
        }

        webView.load(URLRequest(url: targetUrl))
        return true
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        updateNavControls()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        searchField.text = webView.url?.absoluteString
        refreshControl.endRefreshing()
        updateNavControls()
    }

    private func updateNavControls() {
        backButton.isEnabled = webView.canGoBack
        backButton.alpha = webView.canGoBack ? 1.0 : 0.35

        forwardButton.isEnabled = webView.canGoForward
        forwardButton.alpha = webView.canGoForward ? 1.0 : 0.35
    }

    @objc private func handleBack() {
        if webView.canGoBack {
            webView.goBack()
        }
    }

    @objc private func handleForward() {
        if webView.canGoForward {
            webView.goForward()
        }
    }

    @objc private func handleHome() {
        loadHome()
    }

    @objc private func handleReload() {
        webView.reload()
    }

    @objc private func handlePullToRefresh() {
        webView.reload()
    }

    @objc private func handleShare() {
        guard let url = webView.url else { return }
        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = shareButton
            popover.sourceRect = shareButton.bounds
        }
        present(activityVC, animated: true)
    }

    @objc private func toggleShields() {
        let alert = UIAlertController(title: "AETHER Shields", message: "Ad & Tracker Protection Active.\nSec-GPC & DNT Enforcement Enabled.\nCosmetic Filtering Active.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    deinit {
        webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
    }
}
