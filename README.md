# hect0x7.github.io

我的个人作品集主站，纯静态，托管在 GitHub Pages。

访问：<https://hect0x7.github.io/>

## 结构

```
.
├── index.html      # 作品集首页
├── styles.css      # 首页样式
├── works.js        # 作品清单（数据驱动，加作品改这里）
└── works/          # 每个作品一个子目录
    └── sakura-momiji-flag/
```

## 加一个新作品

1. 把作品文件夹放进 `works/<slug>/`，入口为 `index.html`。
2. 在 `works.js` 的 `WORKS` 数组里加一项（slug / title / desc / cover / tags / year）。
3. commit + push，GitHub Pages 自动部署。

## 本地预览

任意静态服务器即可，例如：

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```
