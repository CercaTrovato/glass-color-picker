# Glass Color Picker

Glass Color Picker is a Vite + React image color picker. Upload an image, inspect pixels with a magnifier, save sampled colors, copy color values, and generate simple palette recommendations.

Glass Color Picker 是一个基于 Vite + React 的图片取色工具。你可以上传图片，用放大镜查看像素颜色，保存取到的颜色，复制颜色值，并生成简单的配色推荐。

## Features / 功能

- Upload images or drag and drop an image into the app.
- Pick pixel colors directly from uploaded images.
- Use a magnifier with adjustable zoom for precise sampling.
- Save selected colors for later reference.
- Copy HEX and RGB color values.
- Generate monochromatic and matching palette suggestions.

- 支持上传图片或拖拽图片到应用中。
- 可以直接从上传图片中拾取像素颜色。
- 提供可调节缩放倍率的放大镜，便于精确取色。
- 可以保存已选择的颜色。
- 支持复制 HEX 和 RGB 颜色值。
- 支持生成单色系和匹配色配色建议。

## Requirements / 环境要求

- Node.js 22+
- npm 10+

## Quick Start / 快速开始

```bash
git clone https://github.com/CercaTrovato/glass-color-picker.git
cd glass-color-picker
npm ci
npm run dev
```

Then open:

```text
http://localhost:3000
```

然后在浏览器中打开：

```text
http://localhost:3000
```

## Development Commands / 开发命令

```bash
npm run dev
npm run desktop
npm run lint
npm run build
npm run package
npm run dist
npm run preview
```

- `npm run dev`: Start the local development server.
- `npm run desktop`: Start the app in Electron desktop development mode.
- `npm run lint`: Run the TypeScript check.
- `npm run build`: Build the production version.
- `npm run package`: Build an unpacked desktop app for local testing.
- `npm run dist`: Build Windows installer and portable `.exe` files.
- `npm run preview`: Preview the production build locally.

- `npm run dev`：启动本地开发服务器。
- `npm run desktop`：以 Electron 桌面开发模式启动应用。
- `npm run lint`：运行 TypeScript 检查。
- `npm run build`：构建生产版本。
- `npm run package`：构建用于本地测试的未打包桌面应用。
- `npm run dist`：构建 Windows 安装包和便携版 `.exe` 文件。
- `npm run preview`：本地预览生产构建结果。

## Desktop Icon / 桌面图标

The desktop app icon source is stored at `assets/icon.svg`. Windows builds use `assets/icon.ico`.

桌面应用图标源文件位于 `assets/icon.svg`，Windows 打包使用 `assets/icon.ico`。

## Notes / 说明

- No API key is required for the current app.
- `node_modules/` and `dist/` are not committed to Git.
- Use `npm ci` for reproducible installs from `package-lock.json`.
- Desktop builds are written to `release/`.

- 当前版本不需要任何 API key。
- `node_modules/` 和 `dist/` 不会提交到 Git。
- 建议使用 `npm ci`，它会根据 `package-lock.json` 安装一致的依赖版本。
- 桌面版构建产物会输出到 `release/`。

## Troubleshooting / 常见问题

- If installation fails, check that your Node.js version is 22 or newer.
- If port `3000` is already in use, stop the existing process or run Vite on another port.

- 如果依赖安装失败，请确认 Node.js 版本为 22 或更高。
- 如果 `3000` 端口已被占用，请停止占用该端口的进程，或使用其他端口启动 Vite。

## License / 许可证

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

本项目使用 MIT License 开源。详情请查看 [LICENSE](LICENSE)。
