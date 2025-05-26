<template>
  <div class="min-h-screen bg-base-100">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <div class="prose lg:prose-xl mx-auto">
        <h1 class="text-4xl font-bold text-center mb-8">隐私政策</h1>
        
        <div class="text-sm text-gray-600 mb-6">
          最后更新日期：{{ new Date().toLocaleDateString('zh-CN') }}
        </div>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">1. 信息收集</h2>
          <p class="mb-4">
            TextIsText OCR 应用收集以下类型的信息：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>账户信息：邮箱地址、用户名</li>
            <li>OAuth信息：通过Google登录时的基本资料信息</li>
            <li>使用数据：OCR处理记录、上传的图像文件</li>
            <li>技术信息：IP地址、浏览器类型、设备信息</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">2. 信息使用</h2>
          <p class="mb-4">
            我们使用收集的信息用于：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>提供OCR文字识别服务</li>
            <li>维护和改进服务质量</li>
            <li>用户账户管理和身份验证</li>
            <li>技术支持和客户服务</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">3. 信息保护</h2>
          <p class="mb-4">
            我们采取以下措施保护您的信息：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>使用HTTPS加密传输</li>
            <li>安全的数据库存储</li>
            <li>定期安全审计</li>
            <li>访问权限控制</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">4. 信息共享</h2>
          <p class="mb-4">
            我们不会向第三方出售、交易或转让您的个人信息，除非：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>获得您的明确同意</li>
            <li>法律法规要求</li>
            <li>保护我们的权利和安全</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">5. Cookie使用</h2>
          <p class="mb-4">
            我们使用Cookie来：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>维持用户登录状态</li>
            <li>记住用户偏好设置</li>
            <li>分析网站使用情况</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">6. 用户权利</h2>
          <p class="mb-4">
            您有权：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>访问您的个人信息</li>
            <li>更正不准确的信息</li>
            <li>删除您的账户和数据</li>
            <li>导出您的数据</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">7. 联系我们</h2>
          <p class="mb-4">
            如果您对本隐私政策有任何疑问，请通过以下方式联系我们：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>邮箱：privacy@textistext.com</li>
            <li>网站：https://textistext.com</li>
          </ul>
        </section>

        <div class="text-center mt-12">
          <router-link to="/" class="btn btn-primary">
            返回首页
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PrivacyPage',
  head() {
    return {
      title: '隐私政策 - TextIsText OCR',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'TextIsText OCR应用的隐私政策，了解我们如何收集、使用和保护您的个人信息。'
        }
      ]
    }
  }
}
</script>

<style scoped>
.prose {
  max-width: none;
}

.prose h1,
.prose h2 {
  color: var(--fallback-bc, oklch(var(--bc) / 1));
}

.prose p,
.prose li {
  color: var(--fallback-bc, oklch(var(--bc) / 0.8));
}
</style>
