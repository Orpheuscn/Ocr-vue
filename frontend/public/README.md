Hi, welcome to Obsidian!

---

## I’m interested in Obsidian

First of all, tell me a little bit about what's your experience with note-taking apps like?

- [[No prior experience|I have no prior experience]]

- [[From standard note-taking|I’ve used note-taking apps like Evernote and OneNote]]

- [[From plain-text note-taking|I have used plain-text based apps]]

---

## Official Help Site
Check out the complete [Obsidian documentation](https://help.obsidian.md/) online, available in multiple languages.

---

## What is this place?

This is a sandbox vault in which you can test various functionality of Obsidian. 

> [!Warning]
> Your changes will not be saved, so please don't take actual notes in this vault.

> [!Note] Beta vault - contributions are welcome!
> This sandbox vault is in beta!
> 
> If you spot a typo or a mistake, feel free to submit a pull request [here](https://github.com/obsidianmd/obsidian-docs/tree/master/Sandbox).




```bash
# 链接：http://www.nietzschesource.org/DFGAapi/api/page/download/D-1,2et3

perl -e 'for (my $i = 2; $i <= 14; $i += 2) { my $end = $i + 1; print "http://www.nietzschesource.org/DFGAapi/api/page/download/D-1,${i}et${end}\n"; }' > urls.txt
# 正常从1到14

perl -e 'for (my $i = 2; $i <= 14; $i += 2) { my $end = $i + 1; print "http://www.nietzschesource.org/DFGAapi/api/page/download/D-1,%02det%02d\n", $i, $end; }' > urls.txt
#在数字前面补0

# my $i = 2 表示从2开始数
# $i <= 14 表示遍历到第14
# $i += 2 表示每次加2
# my $end = $i + 1 表示结尾的数字在i的基础上加1
# \n表示在打印完之后换行

# %02dto%02d\n", $i, $end; %02d的意思是：
# %：格式说明符开始，
# 0：位数不足时用0填充，
# 2：总宽度至少为2位，结果会补成01，02等等
# d:按十进制整数格式化，如果按16进制小写，则用x，若用16进制大写，则用X


aria2c -x2 -i urls.txt

perl -e 'for my $i (1..100) { printf "https://www.example.com/taberd-%04d.jpg\n", $i; }' > url_list.txt

# 从1循环到100，四位数补0

```

Perl脚本
```perl
#!/usr/bin/env perl

use strict;

use warnings;

use utf8; # 推荐加上，以支持可能的非ASCII字符

# --- 配置 ---

my $start_num = 7;      # 起始编号

my $end_num   = 71;      # 结束编号 (你可以根据需要修改这个值)

my $base_url  = "https://gallica.bnf.fr/iiif/ark:/12148/btv1b525185706";

my $command   = "dezoomify-rs";

# --- 配置结束 ---

my @command_parts; # 用于存储每个单独的命令片段


# 循环生成每个命令片段

for my $i ($start_num .. $end_num) {

    my $url      = "$base_url/f$i/info.json/";

    my $filename = "f$i.jpg";

    my $part     = "$command $url $filename";

    push @command_parts, $part; # 将生成的片段添加到数组中

}

# 使用 " | " 将所有命令片段连接成一个字符串

my $final_line = join(" && ", @command_parts);

# 打印最终生成的单行文本

print $final_line . "\n"; # 输出结果，末尾加换行符以便在终端清晰显示

# 如果你绝对不想要末尾的换行符（比如要直接管道给其他程序）

# 可以用下面这行替换上面的 print 语句：

# print $final_line;

perl -e 'for (my $i = 2; $i <= 14; $i += 2) { my $end = $i + 1; print "http://www.nietzschesource.org/DFGAapi/api/page/download/D-1,%02det%02d\n", $i, $end; }' > urls.txt

```

```bash
chmod +x generate_commands.pl
./generate_commands.pl
```


好的，没问题！我们来一步步用 Node.js 和 Express 框架创建一个简单的网站。这个网站允许用户注册、登录、发表文章，并查看自己发表的文章。

**核心技术栈：**

* **后端框架:** Express.js (Node.js 最流行的框架)
* **数据库:** SQLite (一个轻量级的文件数据库，非常适合学习和小型项目，无需单独安装数据库服务)
* **模板引擎:** EJS (Embedded JavaScript templates，允许你在 HTML 中嵌入 JavaScript 代码，易于上手)
* **密码处理:** bcryptjs (用于安全地哈希密码)
* **会话管理:** express-session (用于跟踪用户的登录状态)

**项目结构（完成后大致如下）：**

```
simple-blog/
├── node_modules/      # npm 安装的依赖包
├── views/             # EJS 模板文件 (前端页面)
│   ├── index.ejs
│   ├── register.ejs
│   ├── login.ejs
│   ├── dashboard.ejs
│   └── new-article.ejs
├── database.db        # SQLite 数据库文件 (会自动创建)
├── package.json       # 项目配置和依赖信息
├── package-lock.json  # 锁定依赖版本
└── server.js          # 主要的服务器代码
```

---

**步骤 1: 初始化项目和安装依赖**

1.  **创建项目文件夹:** 打开你的终端（命令行工具），创建一个新的文件夹并进入：
    ```bash
    mkdir simple-blog
    cd simple-blog
    ```
2.  **初始化 npm:** 这会创建一个 `package.json` 文件，用来管理项目依赖。
    ```bash
    npm init -y
    ```
    (`-y` 表示接受所有默认设置)
3.  **安装依赖包:** 我们需要安装 express、ejs、sqlite3、bcryptjs 和 express-session。
    ```bash
    npm install express ejs sqlite3 bcryptjs express-session
    ```
    这会将这些库下载到 `node_modules` 文件夹，并将它们添加到 `package.json` 的依赖列表里。

---

**步骤 2: 创建基础的 Express 服务器**

1.  在 `simple-blog` 文件夹中，创建一个名为 `server.js` 的文件。
2.  编辑 `server.js`，输入以下基础代码：

    ```javascript
    // server.js

    const express = require('express');
    const path = require('path'); // Node.js 内置模块，用于处理文件路径

    const app = express();
    const port = 3000; // 网站运行的端口号

    // 设置模板引擎为 EJS
    app.set('view engine', 'ejs');
    // 设置视图文件的存放目录 (告诉 Express 去哪里找 .ejs 文件)
    app.set('views', path.join(__dirname, 'views'));

    // 中间件：解析 POST 请求中的表单数据 (比如登录、注册提交的数据)
    app.use(express.urlencoded({ extended: true }));

    // --- 路由将在这里添加 ---

    // 定义一个最简单的首页路由 (GET 请求)
    app.get('/', (req, res) => {
      // res.send('欢迎来到我的博客!'); // 暂时发送简单文本
      res.render('index'); // 渲染 views/index.ejs 文件
    });

    // 启动服务器，监听指定端口
    app.listen(port, () => {
      console.log(`服务器运行在 http://localhost:${port}`);
    });
    ```

3.  **创建视图文件夹和首页模板:**
    * 在 `simple-blog` 文件夹下创建 `views` 文件夹。
    * 在 `views` 文件夹里创建 `index.ejs` 文件，内容如下：

        ```html
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>我的简单博客</title>
        </head>
        <body>
            <h1>欢迎来到我的简单博客</h1>
            <p>
                <a href="/register">注册</a> |
                <a href="/login">登录</a>
            </p>
        </body>
        </html>
        ```

4.  **运行服务器:** 在终端中，确保你在 `simple-blog` 目录下，然后运行：
    ```bash
    node server.js
    ```
    打开浏览器访问 `http://localhost:3000`，你应该能看到 "欢迎来到我的简单博客" 和注册/登录链接。按 `Ctrl+C` 可以停止服务器。

---

**步骤 3: 设置数据库 (SQLite)**

1.  回到 `server.js` 文件顶部，引入 `sqlite3` 模块并连接/创建数据库文件：

    ```javascript
    // server.js (顶部)
    const express = require('express');
    const path = require('path');
    const sqlite3 = require('sqlite3').verbose(); // .verbose() 提供更详细的错误输出

    // 连接到 SQLite 数据库 (如果文件不存在，则会自动创建)
    const db = new sqlite3.Database('./database.db', (err) => {
      if (err) {
        console.error('数据库连接错误:', err.message);
      } else {
        console.log('成功连接到 SQLite 数据库.');
        // 创建表 (如果它们不存在)
        db.serialize(() => { // serialize 确保 SQL 按顺序执行
          db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
          )`);
          db.run(`CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`);
          console.log('用户表和文章表已检查/创建。');
        });
      }
    });

    const app = express();
    // ... (后面的代码保持不变) ...
    ```

    * 我们创建了两个表：`users` (存储用户信息) 和 `articles` (存储文章信息)。
    * `users` 表包含 `id` (主键，自增长)，`username` (唯一，不能为空)，`password_hash` (存储哈希后的密码，不能为空)。
    * `articles` 表包含 `id`, `title`, `content`, `user_id` (外键，关联到 `users` 表的 `id`)，`created_at` (创建时间)。
    * 每次启动服务器时，这段代码会检查表是否存在，如果不存在则创建它们。

---

**步骤 4: 用户注册功能**

1.  **创建注册页面视图 (`views/register.ejs`):**

    ```html
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>注册</title>
    </head>
    <body>
        <h1>用户注册</h1>
        <% if (typeof error !== 'undefined' && error) { %>
            <p style="color:red;"><%= error %></p>
        <% } %>
        <form action="/register" method="POST">
            <div>
                <label for="username">用户名:</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div>
                <label for="password">密码:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">注册</button>
        </form>
        <p>已有账号? <a href="/login">登录</a></p>
        <p><a href="/">返回首页</a></p>
    </body>
    </html>
    ```
    * 这是一个标准的 HTML 表单，`action="/register"` 表示提交到 `/register` 路径，`method="POST"` 表示使用 POST 方法。
    * 我们添加了简单的错误信息显示（如果后端传递了 `error` 变量）。

2.  **添加注册页面的 GET 路由 (`server.js`):**

    ```javascript
    // server.js (在 app.get('/') 之后添加)

    // 显示注册页面的路由 (GET 请求)
    app.get('/register', (req, res) => {
      res.render('register', { error: null }); // 初始加载时没有错误
    });
    ```

3.  **添加处理注册的 POST 路由 (`server.js`):**
    * 首先，在文件顶部引入 `bcryptjs`：
        ```javascript
        const bcrypt = require('bcryptjs');
        ```
    * 然后，添加 POST 路由：
        ```javascript
        // server.js (在 app.get('/register') 之后添加)

        // 处理注册表单提交的路由 (POST 请求)
        app.post('/register', (req, res) => {
          const { username, password } = req.body; // 从请求体中获取表单数据

          // 基本验证
          if (!username || !password) {
            return res.render('register', { error: '用户名和密码不能为空！' });
          }

          // 检查用户名是否已存在
          const checkUserSql = "SELECT * FROM users WHERE username = ?";
          db.get(checkUserSql, [username], (err, row) => {
            if (err) {
              console.error('查询用户错误:', err.message);
              return res.render('register', { error: '注册过程中发生错误，请稍后重试。' });
            }
            if (row) {
              // 用户名已存在
              return res.render('register', { error: '用户名已被注册！' });
            } else {
              // 用户名可用，哈希密码并插入新用户
              bcrypt.hash(password, 10, (err, hash) => { // 10 是 salt rounds，数字越大越安全但也越慢
                if (err) {
                  console.error('密码哈希错误:', err.message);
                  return res.render('register', { error: '注册过程中发生错误，请稍后重试。' });
                }

                const insertSql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
                db.run(insertSql, [username, hash], function(err) { // 使用 function 获取 this.lastID
                  if (err) {
                    console.error('插入用户错误:', err.message);
                    return res.render('register', { error: '注册过程中发生错误，请稍后重试。' });
                  }
                  console.log(`新用户注册成功，ID: ${this.lastID}, 用户名: ${username}`);
                  // 注册成功，重定向到登录页面
                  res.redirect('/login');
                });
              });
            }
          });
        });
        ```
        * 这段代码首先检查用户名和密码是否为空。
        * 然后查询数据库看用户名是否已存在。
        * 如果用户名可用，使用 `bcrypt.hash` 对密码进行哈希处理。**永远不要直接存储明文密码！**
        * 最后，将用户名和哈希后的密码插入 `users` 表。
        * 成功后重定向到登录页面。

---

**步骤 5: 用户登录与会话管理**

1.  **设置 Session 中间件 (`server.js`):**
    * 在文件顶部引入 `express-session`：
        ```javascript
        const session = require('express-session');
        ```
    * 在 `app.use(express.urlencoded...)` 下面添加 session 中间件的配置：
        ```javascript
        // server.js (在 app.use(express.urlencoded...) 之后)

        // 配置 Session 中间件
        app.use(session({
          secret: 'a_very_secret_key_change_it_later', // 用于签名 session ID cookie 的密钥，请务必修改成一个复杂的随机字符串！
          resave: false, // 强制 session 即使没有变动也保存回 session store
          saveUninitialized: false, // 强制将未初始化的 session 保存
          // 可以配置 cookie 的属性，比如有效期
          // cookie: { secure: true } // 仅在 HTTPS 连接下发送 cookie，本地开发时可以注释掉
        }));

        // 添加一个中间件，将 session 信息注入到所有视图的本地变量中
        // 这样 EJS 模板就能方便地访问用户信息了
        app.use((req, res, next) => {
          res.locals.session = req.session; // 将 session 挂载到 res.locals 上
          next(); // 继续处理请求
        });
        ```
        * `secret` 非常重要，必须保密且复杂。
        * `resave` 和 `saveUninitialized` 通常设为 `false`。
        * 我们添加了一个小中间件，使得在 EJS 模板中可以直接通过 `session.userId` 或 `session.username` 访问会话数据。

2.  **创建登录页面视图 (`views/login.ejs`):**

    ```html
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>登录</title>
    </head>
    <body>
        <h1>用户登录</h1>
        <% if (typeof error !== 'undefined' && error) { %>
            <p style="color:red;"><%= error %></p>
        <% } %>
        <form action="/login" method="POST">
            <div>
                <label for="username">用户名:</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div>
                <label for="password">密码:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">登录</button>
        </form>
        <p>没有账号? <a href="/register">注册</a></p>
        <p><a href="/">返回首页</a></p>
    </body>
    </html>
    ```

3.  **添加登录页面的 GET 路由 (`server.js`):**

    ```javascript
    // server.js (在注册路由后面添加)

    // 显示登录页面的路由 (GET 请求)
    app.get('/login', (req, res) => {
      res.render('login', { error: null });
    });
    ```

4.  **添加处理登录的 POST 路由 (`server.js`):**

    ```javascript
    // server.js (在 app.get('/login') 之后添加)

    // 处理登录表单提交的路由 (POST 请求)
    app.post('/login', (req, res) => {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.render('login', { error: '用户名和密码不能为空！' });
      }

      const sql = "SELECT * FROM users WHERE username = ?";
      db.get(sql, [username], (err, user) => {
        if (err) {
          console.error('查询用户错误:', err.message);
          return res.render('login', { error: '登录过程中发生错误，请稍后重试。' });
        }
        if (!user) {
          // 用户不存在
          return res.render('login', { error: '用户名或密码错误！' });
        }

        // 用户存在，比较密码哈希值
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
          if (err) {
            console.error('密码比较错误:', err.message);
            return res.render('login', { error: '登录过程中发生错误，请稍后重试。' });
          }
          if (isMatch) {
            // 密码匹配，登录成功！设置 session
            req.session.userId = user.id; // 在 session 中存储用户 ID
            req.session.username = user.username; // 也可以存储用户名
            console.log(`用户 ${user.username} 登录成功。`);
            // 重定向到用户仪表盘或其他登录后页面
            res.redirect('/dashboard');
          } else {
            // 密码不匹配
            return res.render('login', { error: '用户名或密码错误！' });
          }
        });
      });
    });
    ```
    * 查询用户。
    * 如果用户存在，使用 `bcrypt.compare` 比较用户输入的密码和数据库中存储的哈希值。
    * 如果匹配，将用户的 `id` 和 `username` 存储在 `req.session` 对象中。`express-session` 会自动处理 cookie，将用户标记为已登录。
    * 登录成功后重定向到 `/dashboard` 页面（我们稍后创建）。

5.  **添加登出路由 (`server.js`):**

    ```javascript
    // server.js (在登录路由后面添加)

    // 处理登出的路由 (GET 请求)
    app.get('/logout', (req, res) => {
      req.session.destroy((err) => { // 销毁 session
        if (err) {
          console.error('登出错误:', err.message);
          return res.redirect('/'); // 或者重定向到错误页
        }
        res.clearCookie('connect.sid'); // 清除 session cookie (connect.sid 是默认名称)
        console.log('用户已登出。');
        res.redirect('/login'); // 重定向到登录页面
      });
    });
    ```
    * 调用 `req.session.destroy()` 来清除服务器端的 session 数据。
    * 重定向到登录页。

6.  **修改首页视图 (`views/index.ejs`) 以显示登录状态:**

    ```html
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>我的简单博客</title>
    </head>
    <body>
        <h1>欢迎来到我的简单博客</h1>

        <% if (session && session.userId) { %>
            <p>欢迎, <%= session.username %>!</p>
            <p>
                <a href="/dashboard">我的文章</a> |
                <a href="/articles/new">发表新文章</a> |
                <a href="/logout">登出</a>
            </p>
        <% } else { %>
            <p>
                <a href="/register">注册</a> |
                <a href="/login">登录</a>
            </p>
        <% } %>

    </body>
    </html>
    ```
    * 使用 EJS 的 `<% if (...) { %> ... <% } else { %> ... <% } %>` 结构。
    * 检查 `session.userId` 是否存在来判断用户是否登录。
    * 根据登录状态显示不同的链接。

---

**步骤 6: 创建文章和查看文章**

1.  **创建 “仪表盘” 页面 (显示用户文章) (`views/dashboard.ejs`):**

    ```html
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>我的文章</title>
    </head>
    <body>
        <h1>我的文章</h1>
        <p>欢迎, <%= session.username %>!</p>

        <% if (articles.length > 0) { %>
            <ul>
                <% articles.forEach(article => { %>
                    <li>
                        <h2><%= article.title %></h2>
                        <p><%= article.content %></p>
                        <small>发表于: <%= new Date(article.created_at).toLocaleString() %></small>
                    </li>
                    <hr>
                <% }); %>
            </ul>
        <% } else { %>
            <p>你还没有发表任何文章。</p>
        <% } %>

        <p>
            <a href="/articles/new">发表新文章</a> |
            <a href="/logout">登出</a> |
            <a href="/">返回首页</a>
        </p>
    </body>
    </html>
    ```
    * 显示欢迎信息。
    * 使用 `forEach` 遍历传递过来的 `articles` 数组并显示每篇文章的标题、内容和时间。
    * 如果文章列表为空，则显示提示信息。

2.  **创建 “发表新文章” 页面 (`views/new-article.ejs`):**

    ```html
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>发表新文章</title>
    </head>
    <body>
        <h1>发表新文章</h1>
        <% if (typeof error !== 'undefined' && error) { %>
            <p style="color:red;"><%= error %></p>
        <% } %>
        <form action="/articles" method="POST">
            <div>
                <label for="title">标题:</label><br>
                <input type="text" id="title" name="title" required style="width: 90%;">
            </div>
            <div>
                <label for="content">内容:</label><br>
                <textarea id="content" name="content" rows="10" required style="width: 90%;"></textarea>
            </div>
            <button type="submit">发表</button>
        </form>
        <p>
            <a href="/dashboard">返回我的文章</a> |
            <a href="/">返回首页</a>
        </p>
    </body>
    </html>
    ```

3.  **创建保护路由的中间件 (`server.js`):** 我们需要一个中间件来确保只有登录用户才能访问某些页面（如仪表盘、发表文章）。

    ```javascript
    // server.js (可以放在 session 配置之后)

    // 中间件：检查用户是否已登录
    function requireAuth(req, res, next) {
      if (req.session && req.session.userId) {
        // 用户已登录，继续处理请求
        return next();
      } else {
        // 用户未登录，重定向到登录页面
        console.log('未授权访问，重定向到登录页。');
        res.redirect('/login');
      }
    }
    ```

4.  **添加仪表盘路由 (GET `/dashboard`) (`server.js`):**

    ```javascript
    // server.js (在登出路由后面添加)

    // 显示用户仪表盘（文章列表）的路由 (GET 请求)，需要登录
    app.get('/dashboard', requireAuth, (req, res) => {
      const userId = req.session.userId; // 从 session 获取当前登录用户的 ID
      const sql = "SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC";

      db.all(sql, [userId], (err, articles) => { // db.all 获取所有匹配的行
        if (err) {
          console.error('查询用户文章错误:', err.message);
          // 可以渲染一个错误页面或重定向
          return res.status(500).send("无法加载您的文章，请稍后重试。");
        }
        // 渲染 dashboard 视图，并将查询到的文章传递给它
        res.render('dashboard', { articles: articles });
      });
    });
    ```
    * 使用了 `requireAuth` 中间件，只有登录用户能访问。
    * 从 session 获取 `userId`。
    * 查询该用户的所有文章，并按时间倒序排列。
    * 将查询结果 `articles` 传递给 `dashboard.ejs` 模板。

5.  **添加显示 “发表新文章” 页面的路由 (GET `/articles/new`) (`server.js`):**

    ```javascript
    // server.js (在 dashboard 路由后面添加)

    // 显示发表新文章页面的路由 (GET 请求)，需要登录
    app.get('/articles/new', requireAuth, (req, res) => {
      res.render('new-article', { error: null }); // 初始加载时没有错误
    });
    ```
    * 同样使用 `requireAuth` 保护。

6.  **添加处理新文章提交的路由 (POST `/articles`) (`server.js`):**

    ```javascript
    // server.js (在 GET /articles/new 路由后面添加)

    // 处理新文章提交的路由 (POST 请求)，需要登录
    app.post('/articles', requireAuth, (req, res) => {
      const { title, content } = req.body;
      const userId = req.session.userId;

      if (!title || !content) {
        return res.render('new-article', { error: '标题和内容不能为空！' });
      }

      const sql = "INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)";
      db.run(sql, [title, content, userId], function(err) {
        if (err) {
          console.error('插入文章错误:', err.message);
          return res.render('new-article', { error: '发表文章时出错，请稍后重试。' });
        }
        console.log(`用户 ${req.session.username} 发表了新文章，ID: ${this.lastID}`);
        // 发表成功，重定向到仪表盘查看文章
        res.redirect('/dashboard');
      });
    });
    ```
    * 使用 `requireAuth` 保护。
    * 从 `req.body` 获取标题和内容，从 `req.session` 获取用户 ID。
    * 将文章数据插入 `articles` 表。
    * 成功后重定向回 `/dashboard`。

---

**步骤 7: 最终检查和运行**

1.  **检查代码:** 仔细检查 `server.js` 和各个 `.ejs` 文件，确保没有明显的拼写错误或逻辑错误。
2.  **停止旧服务器:** 如果你的服务器还在运行，按 `Ctrl+C` 停止它。
3.  **重新启动服务器:**
    ```bash
    node server.js
    ```
4.  **测试:**
    * 访问 `http://localhost:3000`。
    * 点击 "注册"，创建一个新用户。
    * 注册成功后，会被重定向到登录页面。
    * 使用刚才注册的用户名和密码登录。
    * 登录成功后，会被重定向到 `/dashboard`（现在应该是空的）。
    * 点击 "发表新文章"，输入标题和内容，然后提交。
    * 提交成功后，应该会回到 `/dashboard`，并能看到你刚刚发表的文章。
    * 尝试再次发表几篇文章。
    * 点击 "登出"。
    * 尝试直接访问 `/dashboard` 或 `/articles/new`，应该会被重定向回登录页面。
    * 再次登录，确认能看到之前发表的所有文章。

---

**总结与后续**

恭喜！你已经用 Node.js、Express、SQLite 和 EJS 构建了一个包含基本用户认证和内容发布功能的简单网站。

**关键点回顾:**

* **Node.js:** JavaScript 运行时环境。
* **Express:** Web 框架，简化了路由、中间件等的处理。
* **路由 (Routing):** 定义了不同 URL 路径 (`/`, `/login`, `/register`, `/dashboard` 等) 如何响应不同的 HTTP 请求 (GET, POST)。
* **数据库 (SQLite):** 用于持久化存储用户和文章数据。我们使用了 `sqlite3` 库来与数据库交互 (执行 SQL 查询)。
* **API (隐式):** 虽然我们没有明确创建供外部调用的 RESTful API，但 Express 的路由实际上就是在处理来自浏览器的 HTTP 请求，并返回 HTML 页面或进行重定向。这些路由就是这个 Web 应用内部的 "API"。如果你想创建给 JavaScript 前端或其他应用调用的 API，通常会返回 JSON 数据而不是渲染 HTML 页面。
* **模板引擎 (EJS):** 用于在服务器端动态生成 HTML 页面，可以将数据库中的数据嵌入到 HTML 中。
* **中间件 (Middleware):** 如 `express.urlencoded`, `session`, `requireAuth`，它们是在请求到达最终处理函数之前执行的函数，用于处理通用任务（解析数据、验证身份等）。
* **会话管理 (Session):** 使用 `express-session` 跟踪用户的登录状态。
* **密码哈希 (bcryptjs):** 保证密码安全存储。

**可以进一步学习和改进的方向:**

* **错误处理:** 添加更健壮的错误处理逻辑。
* **输入验证:** 对用户输入进行更严格的验证（例如，密码复杂度、内容长度限制等）。
* **前端样式:** 添加 CSS 来美化页面。可以将 CSS 文件放在 `public` 目录下，并在 `server.js` 中配置静态文件服务 `app.use(express.static('public'));`。
* **编辑和删除文章:** 添加相应的功能和路由。
* **RESTful API:** 将后端改造成提供 JSON API，然后使用现代前端框架（如 React, Vue, Angular）或纯 JavaScript 来构建用户界面，通过 AJAX/Fetch 与后端 API 交互。
* **数据库迁移:** 使用工具管理数据库结构的变化。
* **环境变量:** 将敏感信息（如 session secret, 数据库连接字符串等）存储在环境变量中，而不是硬编码在代码里（例如使用 `dotenv` 包）。
* **部署:** 将你的应用部署到云服务器（如 Heroku, AWS, Google Cloud, Vercel 等）。
* **测试:** 学习编写单元测试和集成测试。

希望这个详细的步骤对你有帮助！这是一个很好的起点，动手实践是学习编程最好的方式。如果在过程中遇到任何问题，随时可以提问。
