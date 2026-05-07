# marisa

> SyncTV 是一个允许远程一起看视频的项目，支持同步观看进度、在线聊天、弹幕发送、主流媒体流挂载等功能；synctv-web 是配套的 web 前端界面；marisa 的作用是通过 tampermonkey 的方式，实现一些增强效果

-   synctv 项目仓库，[synctv-org/synctv](https://github.com/synctv-org/synctv.git)；web ui，[synctv-org/synctv-web](https://github.com/synctv-org/synctv-web.git)
-   synctv 项目文档，[doc](https://synctv.wiki/)

原项目做得已经很完善了，这边主要就是做点插件上的补充。基于 Tampermonkey 的 SyncTV 增强插件，通过浏览器用户脚本的形式为 SyncTV 提供弹幕、自动化等扩展功能

marisa：不修改 SyncTV 源代码，通过 Tampermonkey 注入功能，单个 `.user.js` 文件分发，可选的代理服务器处理 API 密钥

## ex-features

-   提供一个手动集成开关，主要规划以下新增内容：
    -   弹幕；参考 dplayer，结合 [弹弹 play api v2](https://api.dandanplay.net/swagger/ui/index)，为视频内容装载原生弹幕
        -   [ ] 哔哩哔哩平台
            -   [ ] 普通视频，直接获取弹幕
            -   [ ] 番剧，可供选择的其他源弹幕
        -   [ ] 其他平台，在播放视频时，尝试通过文件名信息自动获取弹幕、手动装载弹幕
        -   [ ] 原生弹幕和影院模式下聊天弹幕应当有效区分开
-   百度网盘 ua：在播放百度网盘源的视频时，自动改 ua，离开百度网盘源后修改回来
-   哔哩哔哩源的视频自动化
    -   [ ] 提供自动勾选 shared、proxy 模式的开关
    -   [ ] 当视频 bv 下只有 1p 时，自动勾选该视频
-   一些修改
    -   [ ] 改变访问控制行为
        -   [ ] 默认不允许普通用户删除添加的视频
        -   [ ] 在房间存在 admin+ 组员的情况下，在聊天栏发出信息，提醒 admin+ 删除
    -   [ ] 播放行为
        -   [ ] 只有在前台的情况下，播放视频时保持音频大小；页面在后台时，如果有一方播放了内容，则其他人自动静音
        -   [ ] 获取更高高清度的哔哩哔哩视频链接？[参考](https://github.com/SocialSisterYi/bilibili-API-collect/docs/video/videostream_url.md)
        -   [ ] 新增视频源；各自添加本地视频，匹配文件 hash
-   插件联动
    -   [ ] 参考 "稍后再看" 功能；在哔哩哔哩页面中，右键将当前页面的视频 bv、title、url 等信息发送到 synctv server；在 synctv 的房间中，新增一个视频源选项，其内容是当前账号发送过的视频列表，点击即可添加，；鉴权采用 synctv 的 cookie？账密
