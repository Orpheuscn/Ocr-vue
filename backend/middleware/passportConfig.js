// middleware/passportConfig.js
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User.js';
import * as userService from '../services/userService.js';
import config from '../utils/envConfig.js';

// 本地策略配置
const configureLocalStrategy = () => {
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // 根据邮箱查找用户
        const user = await userService.findUserByEmail(email);
        
        // 用户不存在
        if (!user) {
          return done(null, false, { message: '邮箱或密码不正确' });
        }
        
        // 验证密码
        const isPasswordValid = await userService.verifyPassword(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: '邮箱或密码不正确' });
        }
        
        // 验证通过，返回用户信息（不包含密码）
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
};

// JWT策略配置
const configureJwtStrategy = () => {
  const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwtSecret,
    algorithms: ['HS256']
  };
  
  passport.use(new JwtStrategy(options, async (payload, done) => {
    try {
      // 验证token中的用户ID
      const user = await userService.findUserById(payload.id);
      
      if (!user) {
        return done(null, false);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
};

// 用户序列化与反序列化
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userService.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// 初始化Passport配置
export const initializePassport = () => {
  configureLocalStrategy();
  configureJwtStrategy();
  
  return passport;
};

// 认证中间件
export const authenticateJwt = passport.authenticate('jwt', { session: false });

// 登录认证中间件
export const authenticateLocal = passport.authenticate('local', { session: false });

// 管理员权限中间件
export const isAdmin = (req, res, next) => {
  // 验证用户是否为管理员
  if (req.user && req.user.isAdmin) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: '权限不足，需要管理员权限'
  });
}; 