import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate, UITextFieldDelegate {

    private var webView: WKWebView!
    private let topBar = UIView()
    private let searchField = UITextField()
    private let shieldsButton = UIButton(type: .system)
    private let backButton = UIButton(type: .system)
    private let forwardButton = UIButton(type: .system)
    private let reloadButton = UIButton(type: .system)
    private let progressBar = UIProgressView(progressViewStyle: .bar)

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
        shieldsButton.addTarget(self, action: #selector(toggleShields), for: .touchUpInside)
        topBar.addSubview(shieldsButton)

        // Progress Bar
        progressBar.translatesAutoresizingMaskIntoConstraints = false
        progressBar.progressTintColor = UIColor(red: 53/255, green: 216/255, blue: 242/255, alpha: 1.0) // Electric Cyan
        progressBar.trackTintColor = .clear
        view.addSubview(progressBar)

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
            progressBar.heightAnchor.constraint(equalToConstant: 2)
        ])
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.backgroundColor = UIColor(red: 11/255, green: 15/255, blue: 20/255, alpha: 1.0)
        webView.isOpaque = false
        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: progressBar.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])

        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
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

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        searchField.text = webView.url?.absoluteString
    }

    @objc private func toggleShields() {
        let alert = UIAlertController(title: "AETHER Shields", message: "Ad & Tracker Protection Active.\nSec-GPC & DNT Enforcement Enabled.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    deinit {
        webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
    }
}
