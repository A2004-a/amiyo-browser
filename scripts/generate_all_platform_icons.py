import os
from PIL import Image, ImageDraw

def generate():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(root_dir, 'assets', 'branding')
    build_dir = os.path.join(root_dir, 'build')
    icons_dir = os.path.join(build_dir, 'icons')
    android_res = os.path.join(root_dir, 'android', 'app', 'src', 'main', 'res')
    ios_icons_dir = os.path.join(root_dir, 'ios', 'AetherBrowser', 'Assets.xcassets', 'AppIcon.appiconset')

    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(ios_icons_dir, exist_ok=True)

    master = Image.open(os.path.join(root_dir, 'test_canvas_1024.png')).convert('RGBA')

    # 1. Desktop Transparent Icons (Windows, macOS, Linux)
    # 512x512 PNG
    img_512 = master.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(assets_dir, 'icon.png'), 'PNG')
    img_512.save(os.path.join(build_dir, 'icon.png'), 'PNG')
    img_512.save(os.path.join(icons_dir, '512x512.png'), 'PNG')

    # Multi-resolution PNGs for Linux / macOS
    for s in [16, 24, 32, 48, 64, 128, 256]:
        resized = master.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(icons_dir, f'{s}x{s}.png'), 'PNG')

    # Windows .ico with 100% transparency
    ico_path = os.path.join(assets_dir, 'icon.ico')
    master.save(
        ico_path,
        format='ICO',
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    )
    print(f'Generated Windows multi-size transparent ICO: {ico_path}')

    # 2. Android Icons
    # Mipmap densities: mdpi (48), hdpi (72), xhdpi (96), xxhdpi (144), xxxhdpi (192)
    densities = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }

    for folder, size in densities.items():
        folder_path = os.path.join(android_res, folder)
        os.makedirs(folder_path, exist_ok=True)

        # A) Round / Standard launcher icon with dark obsidian background disc
        # so it looks stunning on any Android phone launcher wallpaper
        bg_circle = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(bg_circle)
        # Deep obsidian circle with electric cyan/slate rim
        margin = max(1, size // 32)
        draw.ellipse([margin, margin, size - 1 - margin, size - 1 - margin],
                     fill=(15, 17, 23, 255),
                     outline=(30, 41, 59, 255),
                     width=max(1, size // 48))

        # Scale 3D emblem inside the circle
        emblem_size = int(size * 0.76)
        scaled_emblem = master.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
        off_x = (size - emblem_size) // 2
        off_y = (size - emblem_size) // 2
        bg_circle.paste(scaled_emblem, (off_x, off_y), scaled_emblem)

        bg_circle.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
        bg_circle.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')

        # B) Pure transparent icon
        pure_transparent = master.resize((size, size), Image.Resampling.LANCZOS)
        pure_transparent.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')

    # Also put high-res foreground in drawable
    drawable_dir = os.path.join(android_res, 'drawable')
    os.makedirs(drawable_dir, exist_ok=True)
    master.resize((432, 432), Image.Resampling.LANCZOS).save(
        os.path.join(drawable_dir, 'ic_launcher_foreground.png'), 'PNG'
    )
    print('Generated Android mipmap & drawable launcher icons!')

    # 3. iOS Icons
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
    for filename, s in ios_sizes.items():
        ios_canvas = Image.new('RGBA', (s, s), (15, 17, 23, 255))
        logo_ios = master.resize((int(s * 0.82), int(s * 0.82)), Image.Resampling.LANCZOS)
        off = (s - logo_ios.width) // 2
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

    print('Generated iOS AppIcon set!')

if __name__ == '__main__':
    generate()
