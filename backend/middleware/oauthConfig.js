// middleware/oauthConfig.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as userService from "../services/userService.js";
import config from "../utils/envConfig.js";

/**
 * 获取OAuth回调URL
 */
function getCallbackURL() {
  if (config.nodeEnv === "production") {
    return "https://textistext.com/api/auth/google/callback";
  }
  return "http://localhost:3000/api/auth/google/callback";
}

/**
 * 配置Google OAuth策略
 * 只在生产环境或明确启用OAuth时才配置
 */
export const configureGoogleOAuth = () => {
  // 检查是否启用OAuth
  if (config.enableOAuth !== "true" && config.enableOAuth !== true) {
    console.log("OAuth未启用，跳过Google OAuth配置");
    return;
  }

  // 检查必要的环境变量
  if (!config.googleClientId || !config.googleClientSecret) {
    console.warn("Google OAuth配置不完整，跳过配置");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: getCallbackURL(),
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("Google OAuth回调处理", {
            profileId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
          });

          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const name = profile.displayName;
          const avatar = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error("无法从Google获取邮箱信息"), null);
          }

          // 查找现有用户
          let user = await userService.findUserByEmail(email);

          if (user) {
            // 用户已存在，更新Google ID（如果没有的话）
            if (!user.googleId) {
              user = await userService.updateUser(user.id, {
                googleId: googleId,
                avatar: avatar,
                lastLogin: new Date(),
              });
            } else {
              // 只更新最后登录时间
              user = await userService.updateUser(user.id, {
                lastLogin: new Date(),
              });
            }

            console.log("现有用户通过Google登录", { userId: user.id, email });
            return done(null, user);
          } else {
            // 创建新用户
            const newUserData = {
              username: name || email.split("@")[0], // 使用显示名称或邮箱前缀作为用户名
              email: email,
              password: "oauth_user_" + Date.now(), // OAuth用户设置临时密码
              googleId: googleId,
              avatar: avatar,
              isOAuthUser: true,
            };

            user = await userService.createUser(newUserData);
            console.log("新用户通过Google注册", { userId: user.id, email });
            return done(null, user);
          }
        } catch (error) {
          console.error("Google OAuth处理错误", error);
          return done(error, null);
        }
      }
    )
  );

  console.log("Google OAuth策略配置完成");
};

/**
 * 配置Apple OAuth策略
 * 注意：Apple OAuth比较复杂，需要特殊处理
 */
export const configureAppleOAuth = () => {
  // 检查是否启用OAuth
  if (config.enableOAuth !== "true" && config.enableOAuth !== true) {
    console.log("OAuth未启用，跳过Apple OAuth配置");
    return;
  }

  // Apple OAuth实现较复杂，这里先预留接口
  // 实际实现需要使用 passport-apple 或自定义实现
  console.log("Apple OAuth配置预留（待实现）");
};

/**
 * 初始化所有OAuth策略
 */
export const initializeOAuth = () => {
  try {
    configureGoogleOAuth();
    configureAppleOAuth();
    console.log("OAuth配置初始化完成");
  } catch (error) {
    console.error("OAuth配置初始化失败", error);
  }
};
