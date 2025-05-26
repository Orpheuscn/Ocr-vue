// routes/authRoutes.js
import express from "express";
import passport from "passport";
import * as userService from "../services/userService.js";
import passwordValidationService from "../services/passwordValidationService.js";
import { generateAccessToken, generateRefreshToken } from "../middleware/authMiddleware.js";
import { setAccessTokenCookie, setRefreshTokenCookie } from "../middleware/cookieMiddleware.js";
import config from "../utils/envConfig.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("auth");

const router = express.Router();

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Google OAuth登录
 *     tags: [认证]
 *     responses:
 *       302:
 *         description: 重定向到Google OAuth
 */
router.get("/google", (req, res, next) => {
  if (config.enableOAuth !== "true" && config.enableOAuth !== true) {
    return res.status(404).json({
      success: false,
      message: "OAuth功能未启用",
    });
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth回调
 *     tags: [认证]
 *     responses:
 *       302:
 *         description: 重定向到前端
 */
router.get("/google/callback", (req, res, next) => {
  if (config.enableOAuth !== "true" && config.enableOAuth !== true) {
    return res.status(404).json({
      success: false,
      message: "OAuth功能未启用",
    });
  }

  passport.authenticate("google", { session: false }, async (err, user, info) => {
    try {
      if (err) {
        logger.error("Google OAuth错误", { error: err });
        return res.redirect(`${getFrontendUrl()}/login?error=oauth_error`);
      }

      if (!user) {
        logger.warn("Google OAuth失败", { info });
        return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
      }

      // 生成令牌
      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // 设置Cookie
      setAccessTokenCookie(res, token);
      setRefreshTokenCookie(res, refreshToken);

      logger.info("Google OAuth登录成功", { userId: user.id, email: user.email });

      // 重定向到前端
      res.redirect(`${getFrontendUrl()}/dashboard?oauth_success=true`);
    } catch (error) {
      logger.error("Google OAuth回调处理错误", { error });
      res.redirect(`${getFrontendUrl()}/login?error=server_error`);
    }
  })(req, res, next);
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: 验证邮箱
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 邮箱验证成功
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: "邮箱和验证令牌为必填项",
      });
    }

    const user = await userService.verifyEmail(email, token);

    logger.info("邮箱验证成功", { userId: user.id, email });

    res.json({
      success: true,
      message: "邮箱验证成功！您现在可以正常使用所有功能。",
      data: {
        emailVerified: true,
      },
    });
  } catch (error) {
    logger.error("邮箱验证失败", { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: 重新发送验证邮件
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: 验证邮件已发送
 */
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "邮箱为必填项",
      });
    }

    const result = await userService.resendVerificationEmail(email);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error("重新发送验证邮件失败", { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: 请求密码重置
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: 密码重置邮件已发送
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "邮箱为必填项",
      });
    }

    const result = await userService.requestPasswordReset(email);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error("密码重置请求失败", { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: 重置密码
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 密码重置成功
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      return res.status(400).json({
        success: false,
        message: "邮箱、令牌和新密码为必填项",
      });
    }

    const user = await userService.resetPassword(email, token, password);

    logger.info("密码重置成功", { userId: user.id, email });

    res.json({
      success: true,
      message: "密码重置成功！请使用新密码登录。",
    });
  } catch (error) {
    logger.error("密码重置失败", { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/auth/validate-password:
 *   post:
 *     summary: 验证密码强度
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 密码强度验证结果
 */
router.post("/validate-password", (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "密码为必填项",
      });
    }

    const validation = passwordValidationService.validatePassword(password);
    const tips = passwordValidationService.getPasswordStrengthTips(password);

    res.json({
      success: true,
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        strength: validation.strength,
        score: validation.score,
        tips: tips.tips,
      },
    });
  } catch (error) {
    logger.error("密码验证失败", { error: error.message });
    res.status(500).json({
      success: false,
      message: "密码验证失败",
    });
  }
});

// 获取前端URL的辅助函数
function getFrontendUrl() {
  if (config.nodeEnv === "production") {
    return "https://textistext.com";
  }
  return config.frontendUrl || "http://localhost:8082";
}

export default router;
