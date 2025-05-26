// services/emailService.js
import nodemailer from "nodemailer";
import crypto from "crypto";
import config from "../utils/envConfig.js";
import logger from "../utils/logger.js";

/**
 * 邮箱服务类
 * 负责发送验证邮件、密码重置邮件等
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isEnabled = config.enableEmailVerification === "true";

    if (this.isEnabled) {
      this.initializeTransporter();
    }
  }

  /**
   * 初始化邮件传输器
   */
  initializeTransporter() {
    try {
      // 临时保存代理设置
      const originalHttpProxy = process.env.HTTP_PROXY;
      const originalHttpsProxy = process.env.HTTPS_PROXY;

      // 临时禁用代理以连接Gmail SMTP
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;

      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
        tls: {
          rejectUnauthorized: false, // 允许自签名证书
        },
        // 明确禁用代理
        proxy: false,
      });

      // 恢复代理设置
      if (originalHttpProxy) process.env.HTTP_PROXY = originalHttpProxy;
      if (originalHttpsProxy) process.env.HTTPS_PROXY = originalHttpsProxy;

      logger.info("邮件服务初始化成功");
    } catch (error) {
      logger.error("邮件服务初始化失败", { error: error.message });
    }
  }

  /**
   * 生成验证令牌
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendVerificationEmail(email, username, verificationToken) {
    if (!this.isEnabled) {
      logger.info("邮箱验证未启用，跳过发送验证邮件");
      return { success: true, message: "开发环境跳过邮箱验证" };
    }

    if (!this.transporter) {
      throw new Error("邮件服务未初始化");
    }

    try {
      const verificationUrl = `${this.getBaseUrl()}/verify-email?token=${verificationToken}&email=${encodeURIComponent(
        email
      )}`;

      const mailOptions = {
        from: `"智能OCR识别系统" <${config.smtpUser}>`,
        to: email,
        subject: "验证您的邮箱地址",
        html: this.getVerificationEmailTemplate(username, verificationUrl),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info("验证邮件发送成功", { email, messageId: result.messageId });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error("发送验证邮件失败", { email, error: error.message });
      throw new Error("发送验证邮件失败");
    }
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email, username, resetToken) {
    if (!this.isEnabled) {
      logger.info("邮箱验证未启用，跳过发送密码重置邮件");
      return { success: true, message: "开发环境跳过密码重置邮件" };
    }

    if (!this.transporter) {
      throw new Error("邮件服务未初始化");
    }

    try {
      const resetUrl = `${this.getBaseUrl()}/reset-password?token=${resetToken}&email=${encodeURIComponent(
        email
      )}`;

      const mailOptions = {
        from: `"智能OCR识别系统" <${config.smtpUser}>`,
        to: email,
        subject: "重置您的密码",
        html: this.getPasswordResetEmailTemplate(username, resetUrl),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info("密码重置邮件发送成功", { email, messageId: result.messageId });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error("发送密码重置邮件失败", { email, error: error.message });
      throw new Error("发送密码重置邮件失败");
    }
  }

  /**
   * 获取基础URL
   */
  getBaseUrl() {
    if (config.nodeEnv === "production") {
      return "https://textistext.com";
    }
    return `http://localhost:${config.port}`;
  }

  /**
   * 邮箱验证邮件模板
   */
  getVerificationEmailTemplate(username, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>验证您的邮箱</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>智能OCR识别系统</h1>
          </div>
          <div class="content">
            <h2>欢迎，${username}！</h2>
            <p>感谢您注册我们的服务。请点击下面的按钮验证您的邮箱地址：</p>
            <a href="${verificationUrl}" class="button">验证邮箱</a>
            <p>如果按钮无法点击，请复制以下链接到浏览器中打开：</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>此链接将在24小时后过期。</p>
          </div>
          <div class="footer">
            <p>如果您没有注册此账号，请忽略此邮件。</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 密码重置邮件模板
   */
  getPasswordResetEmailTemplate(username, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>重置您的密码</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>密码重置</h1>
          </div>
          <div class="content">
            <h2>您好，${username}！</h2>
            <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>
            <a href="${resetUrl}" class="button">重置密码</a>
            <p>如果按钮无法点击，请复制以下链接到浏览器中打开：</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>此链接将在1小时后过期。</p>
          </div>
          <div class="footer">
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// 创建单例实例
const emailService = new EmailService();

export default emailService;
