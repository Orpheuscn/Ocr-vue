import express from "express";
import { isRtlLanguage, getLanguageName, getAllLanguages } from "../services/languageService.js";

const router = express.Router();

/**
 * @swagger
 * /api/languages:
 *   get:
 *     summary: 获取所有支持的语言列表
 *     description: 返回系统支持的所有语言代码和名称
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [zh, en]
 *         description: 返回语言名称的首选语言(zh或en)
 *     responses:
 *       200:
 *         description: 成功返回语言列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 */
router.get("/", (req, res) => {
  try {
    const preferredLang = req.query.lang || "zh";
    const languages = getAllLanguages(preferredLang);
    res.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    console.error("获取语言列表错误:", error);
    res.status(500).json({
      success: false,
      message: "获取语言列表失败",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/languages/info:
 *   get:
 *     summary: 获取特定语言的信息
 *     description: 根据语言代码返回语言的名称和方向信息
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: 语言代码
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [zh, en]
 *         description: 返回语言名称的首选语言(zh或en)
 *     responses:
 *       200:
 *         description: 成功返回语言信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     name:
 *                       type: string
 *                     isRtl:
 *                       type: boolean
 *       400:
 *         description: 缺少必要参数
 */
router.get("/info", (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "缺少语言代码参数",
      });
    }

    const preferredLang = req.query.lang || "zh";
    const name = getLanguageName(code, preferredLang);
    const isRtl = isRtlLanguage(code);

    res.json({
      success: true,
      data: {
        code,
        name,
        isRtl,
      },
    });
  } catch (error) {
    console.error("获取语言信息错误:", error);
    res.status(500).json({
      success: false,
      message: "获取语言信息失败",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/languages/rtl:
 *   get:
 *     summary: 检查语言是否为从右向左书写
 *     description: 根据语言代码返回该语言是否是RTL(从右向左)书写方向
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: 语言代码
 *     responses:
 *       200:
 *         description: 成功返回RTL信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isRtl:
 *                   type: boolean
 *       400:
 *         description: 缺少必要参数
 */
router.get("/rtl", (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "缺少语言代码参数",
      });
    }

    const isRtl = isRtlLanguage(code);

    res.json({
      success: true,
      isRtl,
    });
  } catch (error) {
    console.error("检查RTL语言错误:", error);
    res.status(500).json({
      success: false,
      message: "检查RTL语言失败",
      error: error.message,
    });
  }
});

export default router;
