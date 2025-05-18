# MongoDB 认证配置

这个文档包含 MongoDB 数据库认证配置的相关信息。

## 认证信息

MongoDB 已配置为使用认证模式，需要用户名和密码才能访问数据库。

### 账号信息

| 用户类型 | 用户名 | 密码      | 数据库  | 权限                     |
| -------- | ------ | --------- | ------- | ------------------------ |
| 管理员   | admin  | admin123  | admin   | 所有数据库的管理员权限   |
| 应用程序 | ocrapp | ocr123456 | ocr_app | ocr_app 数据库的读写权限 |

> **注意**: 在生产环境中，应该使用更强的密码！

## 连接字符串

### 应用程序连接

```
mongodb://ocrapp:ocr123456@localhost:27017/ocr_app?authSource=ocr_app
```

这个连接字符串已经配置在所有环境变量文件中（`.env.local`, `.env.production`, `.env.test`）。

### 管理员连接

```
mongodb://admin:admin123@localhost:27017/admin?authSource=admin
```

使用这个连接字符串可以进行管理操作，如用户管理、数据库创建等。

## 直接连接到数据库

### 使用 mongosh 命令行

```bash
# 连接为应用用户
mongosh "mongodb://ocrapp:ocr123456@localhost:27017/ocr_app?authSource=ocr_app"

# 连接为管理员
mongosh "mongodb://admin:admin123@localhost:27017/admin?authSource=admin"
```

### 使用 GUI 工具（如 MongoDB Compass）

使用以下连接字符串：

```
mongodb://ocrapp:ocr123456@localhost:27017/ocr_app?authSource=ocr_app
```

或

```
mongodb://admin:admin123@localhost:27017/admin?authSource=admin
```

## 重要文件位置

- 配置文件: `/Users/patrick/Documents/应用开发/ocr-vue-app/database/mongodb/mongod.conf`
- 数据目录: `/Users/patrick/Documents/应用开发/ocr-vue-app/database/mongodb/data`
- 日志文件: `/Users/patrick/Documents/应用开发/ocr-vue-app/logs/mongodb/mongo.log`

## 禁用认证（不推荐）

如果需要临时禁用认证，可以修改配置文件`mongod.conf`，将以下部分注释掉或删除：

```yaml
security:
  authorization: enabled
```

然后重启 MongoDB 服务。
