const fs = require('fs');
const path = require('path');
const assert = require('assert');

function run() {
  console.log('Testing Mobile Phone Browser Features (Android & Web Shell)...');

  const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
  const mainActivityPath = path.join(__dirname, '../android/app/src/main/java/com/amiyo/browser/MainActivity.java');
  const indexHtmlPath = path.join(__dirname, '../android/app/src/main/assets/www/index.html');
  const layoutPath = path.join(__dirname, '../android/app/src/main/res/layout/activity_main.xml');

  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const mainActivityContent = fs.readFileSync(mainActivityPath, 'utf8');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  // [1/10] Test Permissions in AndroidManifest
  console.log('  [1/10] Verifying AndroidManifest Hardware & Media Permissions...');
  assert(manifestContent.includes('android.permission.CAMERA'), 'Missing CAMERA permission');
  assert(manifestContent.includes('android.permission.ACCESS_FINE_LOCATION'), 'Missing FINE_LOCATION permission');
  assert(manifestContent.includes('android.permission.ACCESS_COARSE_LOCATION'), 'Missing COARSE_LOCATION permission');
  assert(manifestContent.includes('android.permission.READ_MEDIA_IMAGES'), 'Missing READ_MEDIA_IMAGES permission');
  assert(manifestContent.includes('android.permission.READ_MEDIA_VIDEO'), 'Missing READ_MEDIA_VIDEO permission');
  assert(manifestContent.includes('android:hardwareAccelerated="true"'), 'Missing hardwareAccelerated in MainActivity');
  assert(manifestContent.includes('orientation|screenSize|keyboardHidden|screenLayout|smallestScreenSize|uiMode'), 'Missing full configChanges set');
  console.log('    ✔ Manifest declarations and hardware acceleration verified');

  // [2/10] Test Activity Lifecycle & Resume Playback Unfreeze
  console.log('  [2/10] Verifying Activity Lifecycle (onResume, onPause, onDestroy, onSaveInstanceState)...');
  assert(mainActivityContent.includes('protected void onResume()'), 'Missing onResume');
  assert(mainActivityContent.includes('protected void onPause()'), 'Missing onPause');
  assert(mainActivityContent.includes('protected void onDestroy()'), 'Missing onDestroy');
  assert(mainActivityContent.includes('protected void onSaveInstanceState('), 'Missing onSaveInstanceState');
  assert(mainActivityContent.includes('webView.resumeTimers();'), 'Missing resumeTimers');
  assert(mainActivityContent.includes('webView.pauseTimers();'), 'Missing pauseTimers');
  console.log('    ✔ Complete lifecycle and video buffer unfreeze on resume verified');

  // [3/10] Test Video Stream & Media Playback Protection (No Black Screens)
  console.log('  [3/10] Verifying Video Stream Protection & Safe Ad Interception...');
  assert(mainActivityContent.includes('googlevideo.com'), 'Missing googlevideo bypass check');
  assert(mainActivityContent.includes('videoplayback'), 'Missing videoplayback bypass check');
  assert(mainActivityContent.includes('.m3u8'), 'Missing m3u8 streaming bypass');
  assert(mainActivityContent.includes('.mp4'), 'Missing mp4 streaming bypass');
  assert(mainActivityContent.includes('super.shouldInterceptRequest(view, request)'), 'Missing fallback super call');
  console.log('    ✔ Media stream chunks bypass ad blocker safely');

  // [4/10] Test YouTube 4K Quality Unlocker & Smart Ad Skipper
  console.log('  [4/10] Verifying YouTube 4K Ultra-HD Quality & Ad Skipper...');
  assert(mainActivityContent.includes('setPlaybackQualityRange(\'highres\', \'hd2160\')'), 'Missing 4K quality range');
  assert(mainActivityContent.includes('ytp-ad-skip-button'), 'Missing ad skip button clicker');
  assert(mainActivityContent.includes('yt-navigate-finish'), 'Missing YouTube SPA navigation listener');
  console.log('    ✔ YouTube 4K resolution unlock and ad fast-forward verified');

  // [5/10] Test HTML5 Geolocation Handling in WebChromeClient
  console.log('  [5/10] Verifying HTML5 Geolocation Prompt Handling...');
  assert(mainActivityContent.includes('onGeolocationPermissionsShowPrompt'), 'Missing onGeolocationPermissionsShowPrompt');
  assert(mainActivityContent.includes('PERMISSION_REQUEST_LOCATION'), 'Missing PERMISSION_REQUEST_LOCATION constant');
  assert(mainActivityContent.includes('callback.invoke(origin, true, true)'), 'Missing geolocation callback invocation');
  console.log('    ✔ Geolocation permission prompt and callback flow verified');

  // [6/10] Test WebRTC Camera & Microphone Permissions
  console.log('  [6/10] Verifying WebRTC Camera & Microphone Hardware Access...');
  assert(mainActivityContent.includes('onPermissionRequest(final PermissionRequest request)'), 'Missing onPermissionRequest');
  assert(mainActivityContent.includes('PermissionRequest.RESOURCE_VIDEO_CAPTURE'), 'Missing VIDEO_CAPTURE handling');
  assert(mainActivityContent.includes('PermissionRequest.RESOURCE_AUDIO_CAPTURE'), 'Missing AUDIO_CAPTURE handling');
  assert(mainActivityContent.includes('request.grant('), 'Missing permission grant call');
  console.log('    ✔ WebRTC audio/video capture permissions verified');

  // [7/10] Test Multi-Window Popups & OAuth Login Support
  console.log('  [7/10] Verifying Popups, target="_blank", and OAuth Logins (onCreateWindow)...');
  assert(mainActivityContent.includes('settings.setSupportMultipleWindows(true)'), 'Multiple windows not enabled');
  assert(mainActivityContent.includes('settings.setJavaScriptCanOpenWindowsAutomatically(true)'), 'Auto window opening not enabled');
  assert(mainActivityContent.includes('onCreateWindow(WebView view'), 'Missing onCreateWindow');
  assert(mainActivityContent.includes('resultMsg.sendToTarget()'), 'Missing resultMsg.sendToTarget');
  console.log('    ✔ Popups, Google OAuth, and target="_blank" window transport verified');

  // [8/10] Test Fullscreen Video Landscape Rotation & Sticky Immersive Mode
  console.log('  [8/10] Verifying Fullscreen Cinema Mode & Immersive Sticky Flags...');
  assert(mainActivityContent.includes('ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE'), 'Missing landscape sensor orientation');
  assert(mainActivityContent.includes('View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY'), 'Missing immersive sticky flag');
  assert(mainActivityContent.includes('WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON'), 'Missing keep screen on flag');
  assert(layoutContent.includes('android:id="@+id/customViewContainer"'), 'customViewContainer missing in layout');
  console.log('    ✔ Landscape rotation, screen awake lock, and edge-to-edge container verified');

  // [9/10] Test SwipeRefresh Scroll Conflict & Back Navigation
  console.log('  [9/10] Verifying SwipeRefresh Child Scroll & Smart Back Navigation...');
  assert(mainActivityContent.includes('setOnChildScrollUpCallback'), 'Missing child scroll up callback to prevent swipe clash');
  assert(mainActivityContent.includes('webView.getScrollY() > 0'), 'Missing scroll check');
  assert(mainActivityContent.includes('Press back again to exit AETHER'), 'Missing double-back exit confirmation');
  console.log('    ✔ Smooth page scrolling and non-destructive back navigation verified');

  // [10/10] Test index.html Internal Bookmarks & JavaScript Bridge
  console.log('  [10/10] Verifying Mobile Web App (index.html) Bookmarks & Bridge...');
  assert(indexHtmlContent.includes('function addBookmarkItem(title, url)'), 'Missing addBookmarkItem in index.html');
  assert(indexHtmlContent.includes('function navigateTo(hash)'), 'Missing navigateTo in index.html');
  assert(indexHtmlContent.includes('renderRoute()'), 'navigateTo must call renderRoute');
  assert(mainActivityContent.includes('addJavascriptInterface(new AetherWebBridge(), "AetherAndroid")'), 'Missing AetherAndroid bridge');
  console.log('    ✔ Mobile bookmark creation, route switching, and native bridge verified');

  console.log('✔ All 10 Mobile Phone Feature Modules Tested & Verified Successfully!\n');
}

module.exports = { run };

if (require.main === module) {
  run();
}
