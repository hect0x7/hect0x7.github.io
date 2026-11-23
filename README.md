# hect0x7.github.io

我的个人作品集主站，纯静态，托管在 GitHub Pages。首页「赤日奇点」用原生 WebGL 绘制日食和粒子，用 CSS 3D 展示作品。

访问：<https://hect0x7.github.io/>

## 结构

```
.
├── index.html      # 作品集首页
├── styles.css      # 首页排版、三态主题与静态降级
├── works.js        # 作品清单、三语言文案与主题设置
├── home.js         # 滚动分镜、作品轨道和场景交互
├── home3d/         # WebGL 渲染、着色器与作品粒子形状
└── works/          # 每个作品一个子目录
    └── sakura-momiji-flag/
```

## 加一个新作品

1. 把作品文件夹放进 `works/<slug>/`，入口为 `index.html`。
2. 在 `works.js` 的 `WORKS` 数组里加一项（slug / title / desc / cover / tags / year）。
3. 将变更合入站点发布分支，GitHub Pages 自动部署。

## 本地预览

在仓库根目录启动静态服务器，打开 `http://localhost:8000/`。

```powershell
python -m http.server 8000 --bind localhost
```

- 滚动从赤日进入作品轨道，也可在轨道区用左右方向键或编号切换作品。「触发日耀」可主动唤起日冕。
- 自动、夜间、浅色会记住上次选择。启用系统减少动态效果时使用静帧与普通作品网格，`/?nogl` 可直接预览无 WebGL 的版本。
