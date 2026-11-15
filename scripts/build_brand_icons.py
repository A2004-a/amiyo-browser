import os
import subprocess
from PIL import Image

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(root_dir, 'assets', 'branding')
    build_dir = os.path.join(root_dir, 'build')
    icons_dir = os.path.join(build_dir, 'icons')
    android_res_dir = os.path.join(root_dir, 'android', 'app', 'src', 'main', 'res')
    ios_icons_dir = os.path.join(root_dir, 'ios', 'AetherBrowser', 'Assets.xcassets', 'AppIcon.appiconset')

    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(ios_icons_dir, exist_ok=True)

    # 1. Define the 100% Transparent 3D A Logo SVG
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Chrome Left Facet (Direct Light) -->
    <linearGradient id="chromeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="25%" stop-color="#F1F5F9" />
      <stop offset="60%" stop-color="#CBD5E1" />
      <stop offset="100%" stop-color="#94A3B8" />
    </linearGradient>

    <!-- Chrome Right Facet (Shadow &amp; Reflect) -->
    <linearGradient id="chromeRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#CBD5E1" />
      <stop offset="30%" stop-color="#94A3B8" />
      <stop offset="70%" stop-color="#64748B" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>

    <!-- Inner Cut Facet Left (Deep Shadow) -->
    <linearGradient id="innerCutLeft" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="70%" stop-color="#334155" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>

    <!-- Inner Cut Facet Right (Secondary Light) -->
    <linearGradient id="innerCutRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#475569" />
      <stop offset="50%" stop-color="#64748B" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>

    <!-- Electric Cyan Orbital Neon Glow Gradient -->
    <linearGradient id="orbitGlow" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00D4FF" stop-opacity="0" />
      <stop offset="20%" stop-color="#00D4FF" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#35D8F2" />
      <stop offset="80%" stop-color="#7AAEFF" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>

    <!-- Front Silver Blade Orbit Gradient -->
    <linearGradient id="orbitBlade" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#35D8F2" stop-opacity="0.8" />
      <stop offset="25%" stop-color="#FFFFFF" />
      <stop offset="65%" stop-color="#E2E8F0" />
      <stop offset="100%" stop-color="#94A3B8" />
    </linearGradient>

    <!-- Celestial Orbiter Sphere Gradient -->
    <radialGradient id="satelliteOrb" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="25%" stop-color="#38BDF8" />
      <stop offset="70%" stop-color="#0284C7" />
      <stop offset="100%" stop-color="#0369A1" />
    </radialGradient>

    <!-- High Intensity Glow Filters -->
    <filter id="intenseCyanGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur1" />
      <feGaussianBlur stdDeviation="16" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- ================= LOGO EMBLEM GROUP (100% TRANSPARENT BACKGROUND) ================= -->
  <g transform="translate(0, 32)">
    <!-- 1. Rear Neon Glow of Orbital Ring (Behind Left Stem) -->
    <path d="M 125 315 C 80 300 85 245 155 200 C 190 178 240 155 305 130" 
          fill="none" 
          stroke="url(#orbitGlow)" 
          stroke-width="14" 
          stroke-linecap="round" 
          opacity="0.95" 
          filter="url(#intenseCyanGlow)" />

    <path d="M 125 315 C 80 300 85 245 155 200 C 190 178 240 155 305 130" 
          fill="none" 
          stroke="#FFFFFF" 
          stroke-width="3" 
          stroke-linecap="round" 
          opacity="0.8" />

    <!-- 2. The Infinite A: Left Outer Leg (Chrome Light Facet) -->
    <path d="M 256 68 L 108 340 L 168 340 L 256 168 Z" fill="url(#chromeLeft)" />

    <!-- 3. The Infinite A: Left Outer Edge Bevel (Crisp Chamfer) -->
    <path d="M 256 68 L 244 88 L 128 340 L 108 340 Z" fill="#E2E8F0" opacity="0.6" />

    <!-- 4. The Infinite A: Right Outer Leg (Chrome Shadow Facet) -->
    <path d="M 256 68 L 256 168 L 344 340 L 404 340 Z" fill="url(#chromeRight)" />

    <!-- 5. The Infinite A: Right Outer Edge Bevel (Dark Ridge) -->
    <path d="M 256 68 L 268 88 L 384 340 L 404 340 Z" fill="#1E293B" opacity="0.75" />

    <!-- 6. Inner Triangular Void Chamfers -->
    <!-- Left Inner Facet -->
    <path d="M 256 168 L 168 340 L 230 300 L 256 220 Z" fill="url(#innerCutLeft)" />
    <!-- Right Inner Facet -->
    <path d="M 256 168 L 256 220 L 282 300 L 344 340 Z" fill="url(#innerCutRight)" />

    <!-- 7. Apex Diamond Highlight Flare -->
    <circle cx="256" cy="68" r="5" fill="#FFFFFF" filter="url(#intenseCyanGlow)" />

    <!-- 8. Front Sweeping Metallic Blade of Orbit (Over Left Leg &amp; Right Leg) -->
    <path d="M 118 316 
             C 170 330 250 320 330 260 
             C 380 220 415 170 435 125 
             C 420 135 385 175 320 225 
             C 245 285 175 295 118 316 Z" 
          fill="url(#orbitBlade)" />

    <!-- Front Blade Upper Chrome Ridge Highlight -->
    <path d="M 118 316 
             C 170 330 250 320 330 260 
             C 380 220 415 170 435 125" 
          fill="none" 
          stroke="#FFFFFF" 
          stroke-width="3" 
          opacity="0.9" />

    <!-- Front Blade Underside Neon Flare -->
    <path d="M 140 318 
             C 200 325 270 305 340 250 
             C 385 210 415 165 430 130" 
          fill="none" 
          stroke="#00D4FF" 
          stroke-width="3" 
          opacity="0.8" 
          filter="url(#intenseCyanGlow)" />

    <!-- Lens Flare at Intersection of Orbit &amp; Left Stem -->
    <ellipse cx="196" cy="254" rx="28" ry="12" fill="#35D8F2" opacity="0.6" transform="rotate(-30 196 254)" filter="url(#intenseCyanGlow)" />
    <circle cx="196" cy="254" r="6" fill="#FFFFFF" />

    <!-- 9. Celestial Satellite Orb (Top Right of Orbit Track) -->
    <!-- Glow Aura -->
    <circle cx="438" cy="122" r="26" fill="#00D4FF" opacity="0.45" filter="url(#intenseCyanGlow)" />
    <!-- Outer Rim -->
    <circle cx="438" cy="122" r="14" fill="url(#satelliteOrb)" />
    <!-- Specular Flare on Sphere -->
    <circle cx="434" cy="118" r="4.5" fill="#FFFFFF" opacity="0.9" />
  </g>
</svg>'''

    svg_path = os.path.join(assets_dir, 'icon.svg')
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f'Wrote transparent SVG to {svg_path}')

    # 2. Render SVG to 1024x1024 Transparent PNG via headless Edge
    html_render = f'''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body {{
      margin: 0;
      padding: 0;
      width: 1024px;
      height: 1024px;
      background: transparent !important;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    svg {{
      width: 960px;
      height: 960px;
    }}
  </style>
</head>
<body>
  {svg_content}
</body>
</html>'''

    temp_html = os.path.join(root_dir, 'temp_render_icon.html')
    temp_png = os.path.join(root_dir, 'temp_render_icon.png')
    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(html_render)

    edge_bin = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    if not os.path.exists(edge_bin):
        edge_bin = r'C:\Program Files\Microsoft\Edge\Application\msedge.exe'

    cmd = [
        edge_bin,
        '--headless=new',
        '--disable-gpu',
        '--default-background-color=00000000',
        '--window-size=1024,1024',
        f'--screenshot={temp_png}',
        temp_html
    ]

    print('Rendering 1024x1024 transparent logo via Chromium...')
    subprocess.run(cmd, check=True)

    master_img = Image.open(temp_png).convert('RGBA')
    print(f'Master image size: {master_img.size}, mode: {master_img.mode}')

    # Verify transparency
    corners = [master_img.getpixel((0,0)), master_img.getpixel((1023,0)), master_img.getpixel((0,1023)), master_img.getpixel((1023,1023))]
    print('Corner pixels alpha check:', [c[3] for c in corners])

    # 3. Export Windows & Linux icons
    # assets/branding/icon.png (512x512)
    img_512 = master_img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(assets_dir, 'icon.png'), 'PNG')
    img_512.save(os.path.join(build_dir, 'icon.png'), 'PNG')
    img_512.save(os.path.join(icons_dir, '512x512.png'), 'PNG')

    # build/icons/ for linux & mac
    sizes = [16, 24, 32, 48, 64, 128, 256]
    for s in sizes:
        resized = master_img.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(icons_dir, f'{s}x{s}.png'), 'PNG')

    # Windows .ico containing multi-resolutions with transparency
    ico_path = os.path.join(assets_dir, 'icon.ico')
    master_img.save(
        ico_path,
        format='ICO',
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    )
    print(f'Saved transparent multi-size Windows ICO to {ico_path}')

    # 4. Android Mipmap Icons
    mipmap_densities = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }

    # For Android launcher, create both transparent icon and a sleek circular icon
    for folder, size in mipmap_densities.items():
        folder_path = os.path.join(android_res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Standard icon: 3D logo with subtle dark obsidian backing circle for system launcher contrast
        bg_circle = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(bg_circle)
        draw.ellipse([0, 0, size - 1, size - 1], fill=(15, 17, 23, 255), outline=(30, 41, 59, 255), width=max(1, size // 48))

        logo_scaled = master_img.resize((int(size * 0.82), int(size * 0.82)), Image.Resampling.LANCZOS)
        offset = (size - logo_scaled.width) // 2
        bg_circle.paste(logo_scaled, (offset, offset), logo_scaled)

        # Save launcher icons
        bg_circle.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
        bg_circle.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')

        # Also save pure transparent foreground
        pure_fg = master_img.resize((size, size), Image.Resampling.LANCZOS)
        pure_fg.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')

    print('Exported Android mipmap icons across all densities (mdpi to xxxhdpi)!')

    # 5. iOS AppIcon set
    ios_sizes = {
        'AppIcon-1024.png': 1024,
        'AppIcon-180.png': 180,
        'AppIcon-120.png': 120,
        'AppIcon-87.png': 87,
        'AppIcon-80.png': 80,
        'AppIcon-60.png': 60,
        'AppIcon-58.png': 58,
        'AppIcon-40.png': 40,
        'AppIcon-29.png': 29,
        'AppIcon-20.png': 20
    }
    for filename, size in ios_sizes.items():
        # iOS requires opaque background or dark obsidian backing
        ios_canvas = Image.new('RGBA', (size, size), (15, 17, 23, 255))
        logo_ios = master_img.resize((int(size * 0.80), int(size * 0.80)), Image.Resampling.LANCZOS)
        off = (size - logo_ios.width) // 2
        ios_canvas.paste(logo_ios, (off, off), logo_ios)
        ios_canvas.convert('RGB').save(os.path.join(ios_icons_dir, filename), 'PNG')

    import json
    contents_json = {
        "images": [
            {
                "size": "1024x1024",
                "idiom": "universal",
                "platform": "ios",
                "filename": "AppIcon-1024.png"
            }
        ],
        "info": {
            "version": 1,
            "author": "xcode"
        }
    }
    with open(os.path.join(ios_icons_dir, 'Contents.json'), 'w') as f:
        json.dump(contents_json, f, indent=2)

    print('Exported iOS AppIcon set!')

    # Cleanup temp files
    try:
        os.remove(temp_html)
        os.remove(temp_png)
    except Exception:
        pass

    print('ALL BRAND ICONS GENERATED SUCCESSFULLY!')

if __name__ == '__main__':
    main()
