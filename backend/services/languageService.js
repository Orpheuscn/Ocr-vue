import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从右向左书写的RTL语言列表
const RTL_LANGUAGES = ["ar", "fa", "he", "iw", "ur", "dv", "ps"];

// 判断是否为RTL语言
export function isRtlLanguage(code) {
  if (!code) return false;
  // 处理可能的子标记，如 'ar-EG'
  const baseCode = code.split("-")[0].toLowerCase();
  return RTL_LANGUAGES.includes(baseCode);
}

// 获取语言名称
export function getLanguageName(code, preferredLang = "en") {
  // 改为默认英语
  try {
    // 获取语言数据文件的路径
    const langFilePath = resolve(__dirname, "..", "data", "languages.json");

    // 如果文件不存在，返回代码本身或'未知'
    if (!fs.existsSync(langFilePath)) {
      console.warn(`语言文件不存在: ${langFilePath}`);
      return code || "Undetermined"; // 移除硬编码的中文判断
    }

    // 读取JSON文件
    const languageData = JSON.parse(fs.readFileSync(langFilePath, "utf8"));

    if (languageData[code]) {
      return languageData[code][preferredLang] || languageData[code]["en"] || code;
    }

    const baseCode = code?.split("-")[0];
    return languageData[baseCode]
      ? languageData[baseCode][preferredLang] || languageData[baseCode]["en"]
      : code || "Undetermined"; // 移除硬编码的中文判断
  } catch (error) {
    console.error("获取语言名称错误:", error);
    return code || "Undetermined"; // 移除硬编码的中文判断
  }
}

// 获取所有可用语言的列表
export function getAllLanguages(preferredLang = "en") {
  // 改为默认英语
  try {
    // 获取语言数据文件的路径
    const langFilePath = resolve(__dirname, "..", "data", "languages.json");

    // 如果文件不存在，返回空数组
    if (!fs.existsSync(langFilePath)) {
      console.warn(`语言文件不存在: ${langFilePath}`);
      return [];
    }

    // 读取JSON文件
    const languageData = JSON.parse(fs.readFileSync(langFilePath, "utf8"));

    // 将语言数据转换为API友好的格式
    const result = [];

    for (const [code, names] of Object.entries(languageData)) {
      // 排除特殊值，如 'und'（未定义）和带有连字符的代码
      if (code !== "und" && !code.includes("-")) {
        result.push({
          code,
          name: names[preferredLang] || names["en"] || code,
        });
      }
    }

    // 按语言名称排序
    return result.sort(
      (a, b) => a.name.localeCompare(b.name, "en") // 移除硬编码的中文判断，统一使用英语排序
    );
  } catch (error) {
    console.error("获取语言列表错误:", error);
    return []; // 返回空数组作为备用
  }
}
