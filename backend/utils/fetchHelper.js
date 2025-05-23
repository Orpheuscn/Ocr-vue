import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { promisify } from "util";
import dns from "dns";

const dnsLookup = promisify(dns.lookup);

// 缓存检测结果，避免重复检测
let directConnectionAvailable = null;
let isGoogleCloudEnvironment = null;

/**
 * 检测是否在Google Cloud环境中
 * Google Cloud环境会设置一些特定的环境变量
 *
 * @returns {boolean} 是否在Google Cloud环境中
 */
export async function detectGoogleCloudEnvironment() {
  // 如果已经检测过，直接返回结果
  if (isGoogleCloudEnvironment !== null) {
    return isGoogleCloudEnvironment;
  }

  // 检查特定于Google Cloud的环境变量
  const gcpEnvVars = [
    "GOOGLE_CLOUD_PROJECT",
    "GCLOUD_PROJECT",
    "GCP_PROJECT",
    "GOOGLE_COMPUTE_REGION",
    "GAE_APPLICATION",
    "GAE_ENV",
    "CLOUD_RUN_JOB",
    "K_SERVICE",
  ];

  for (const envVar of gcpEnvVars) {
    if (process.env[envVar]) {
      console.log(`[环境检测] 检测到Google Cloud环境: ${envVar}=${process.env[envVar]}`);
      isGoogleCloudEnvironment = true;
      return true;
    }
  }

  // 其他检测方法...

  console.log("[环境检测] 未检测到Google Cloud环境");
  isGoogleCloudEnvironment = false;
  return false;
}

/**
 * 检测能否直接连接到Google API
 * 通过DNS查询和简单的连接测试来确定
 *
 * @returns {Promise<boolean>} 能否直接连接
 */
export async function canConnectDirectly() {
  // 如果已经检测过，直接返回结果
  if (directConnectionAvailable !== null) {
    return directConnectionAvailable;
  }

  try {
    // 首先检查是否在Google Cloud环境
    const isGCP = await detectGoogleCloudEnvironment();
    if (isGCP) {
      console.log("[连接检测] 在Google Cloud环境中，假定可以直接连接");
      directConnectionAvailable = true;
      return true;
    }

    // 尝试DNS查询Google API域名
    console.log("[连接检测] 正在测试DNS解析...");
    const startTime = Date.now();
    try {
      await dnsLookup("vision.googleapis.com");
      const resolutionTime = Date.now() - startTime;
      console.log(`[连接检测] DNS解析成功，耗时: ${resolutionTime}ms`);

      // 如果DNS解析速度很快，可能表示网络良好
      if (resolutionTime < 200) {
        console.log("[连接检测] DNS解析速度快，可能可以直接连接");
        directConnectionAvailable = true;
        return true;
      }
    } catch (dnsError) {
      console.log("[连接检测] DNS解析失败:", dnsError.message);
    }

    // 尝试简单的HTTP请求测试
    console.log("[连接检测] 尝试直接连接测试...");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

      const response = await fetch("https://vision.googleapis.com/v1", {
        signal: controller.signal,
        method: "HEAD",
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 404) {
        // 404也表示可以连接，只是路径不存在
        console.log("[连接检测] 直接连接测试成功");
        directConnectionAvailable = true;
        return true;
      }
    } catch (fetchError) {
      console.log("[连接检测] 直接连接测试失败:", fetchError.message);
    }

    console.log("[连接检测] 无法直接连接，将使用代理");
    directConnectionAvailable = false;
    return false;
  } catch (error) {
    console.error("[连接检测] 检测过程出错:", error);
    // 出错时默认使用代理
    directConnectionAvailable = false;
    return false;
  }
}

/**
 * 获取代理配置
 * 根据环境变量和连接测试结果决定是否使用代理
 *
 * @returns {Promise<Object|null>} 代理配置对象或null
 */
export async function getProxySettings() {
  // 强制关闭代理的环境变量
  if (process.env.DISABLE_PROXY === "true") {
    console.log("[代理设置] 由环境变量指定不使用代理");
    return null;
  }

  // 强制使用代理的环境变量
  if (process.env.FORCE_PROXY === "true") {
    const proxyUrl =
      process.env.HTTP_PROXY ||
      process.env.HTTPS_PROXY ||
      process.env.ALL_PROXY ||
      "http://127.0.0.1:7890";
    console.log(`[代理设置] 由环境变量强制使用代理: ${proxyUrl}`);
    return createProxyAgent(proxyUrl);
  }

  // 检测是否在Google Cloud环境中
  const isGCP = await detectGoogleCloudEnvironment();
  if (isGCP) {
    console.log("[代理设置] 在Google Cloud环境中，不使用代理");
    return null;
  }

  // 检查当前环境
  const nodeEnv = process.env.NODE_ENV || "development";

  // 在生产环境中检测是否可以直接连接
  if (nodeEnv === "production") {
    const canDirect = await canConnectDirectly();
    if (canDirect) {
      console.log("[代理设置] 生产环境中可以直接连接，不使用代理");
      return null;
    }
    console.log("[代理设置] 生产环境中无法直接连接，使用代理");
  }

  // 获取代理URL
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY;

  // 如果环境变量中没有设置代理，使用默认代理
  const defaultProxyUrl = "http://127.0.0.1:7890"; // 默认代理地址
  const effectiveProxyUrl = proxyUrl || defaultProxyUrl;

  console.log(`[代理设置] 使用代理: ${effectiveProxyUrl}`);

  return createProxyAgent(effectiveProxyUrl);
}

/**
 * 根据代理URL创建适当的代理代理
 *
 * @param {string} proxyUrl - 代理服务器URL
 * @returns {Object} 代理配置
 */
function createProxyAgent(proxyUrl) {
  // 根据代理URL类型创建合适的代理代理
  let agent;
  if (proxyUrl.startsWith("socks")) {
    // SOCKS代理
    agent = new SocksProxyAgent(proxyUrl);
  } else {
    // HTTP/HTTPS代理
    agent = new HttpsProxyAgent(proxyUrl);
  }

  // 返回代理配置
  return {
    agent,
    proxyUrl,
  };
}

/**
 * 封装的fetch函数，根据环境自动添加代理
 *
 * @param {string} url - 请求URL
 * @param {Object} options - fetch请求选项
 * @returns {Promise<Response>} - fetch响应
 */
export async function fetchWithProxy(url, options = {}) {
  const proxySettings = await getProxySettings();

  // 如果有代理设置，添加代理代理
  if (proxySettings) {
    console.log(`[fetchWithProxy] 使用代理发送请求到: ${url}`);
    console.log(`[fetchWithProxy] 代理地址: ${proxySettings.proxyUrl}`);
    console.log(`[fetchWithProxy] 代理类型: ${proxySettings.agent.constructor.name}`);

    try {
      const response = await fetch(url, { ...options, agent: proxySettings.agent });
      console.log(`[fetchWithProxy] 代理请求成功，状态码: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`[fetchWithProxy] 代理请求失败:`, error.message);
      console.error(`[fetchWithProxy] 错误类型: ${error.constructor.name}`);
      throw error;
    }
  }

  // 否则直接使用fetch
  console.log(`[fetchWithProxy] 直接发送请求到: ${url}`);
  try {
    const response = await fetch(url, options);
    console.log(`[fetchWithProxy] 直接请求成功，状态码: ${response.status}`);
    return response;
  } catch (error) {
    console.error(`[fetchWithProxy] 直接请求失败:`, error.message);
    console.error(`[fetchWithProxy] 错误类型: ${error.constructor.name}`);
    throw error;
  }
}

// 导出默认的fetch函数
export default fetchWithProxy;
