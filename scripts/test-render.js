const { app, BrowserWindow, WebContentsView } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 800, height: 600, show: false });
  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  
  const view = new WebContentsView();
  win.contentView.addChildView(view);
  view.setBounds({ x: 0, y: 100, width: 800, height: 500 });
  
  // Load a simple data URL or local HTML in view
  await view.webContents.loadURL('data:text/html,<html><body style="background:red;"><h1>HELLO WORLD FROM WEBCONTENTSVIEW</h1></body></html>');
  
  // Capture screenshot of win
  const image = await win.webContents.capturePage();
  fs.writeFileSync('win-screenshot.png', image.toPNG());
  console.log('win screenshot saved! size:', image.getSize());
  
  const viewImage = await view.webContents.capturePage();
  fs.writeFileSync('view-screenshot.png', viewImage.toPNG());
  console.log('view screenshot saved! size:', viewImage.getSize());
  
  app.quit();
});

