<template>
  <div class="min-h-screen bg-base-100">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <div class="prose lg:prose-xl mx-auto">
        <h1 class="text-4xl font-bold text-center mb-8">服务条款</h1>
        
        <div class="text-sm text-gray-600 mb-6">
          最后更新日期：{{ new Date().toLocaleDateString('zh-CN') }}
        </div>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">1. 服务说明</h2>
          <p class="mb-4">
            TextIsText OCR 是一个基于人工智能的文字识别服务，帮助用户从图像中提取文字内容。
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>支持多种图像格式的文字识别</li>
            <li>提供高精度的OCR识别结果</li>
            <li>支持多语言文字识别</li>
            <li>提供用户账户管理功能</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">2. 用户责任</h2>
          <p class="mb-4">
            使用本服务时，您同意：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>提供准确的注册信息</li>
            <li>保护您的账户安全</li>
            <li>不上传违法、有害或侵权的内容</li>
            <li>不滥用或过度使用服务资源</li>
            <li>遵守相关法律法规</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibent mb-4">3. 服务限制</h2>
          <p class="mb-4">
            为了保证服务质量，我们可能会实施以下限制：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>单次上传文件大小限制</li>
            <li>每日处理次数限制</li>
            <li>并发请求数量限制</li>
            <li>存储空间限制</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">4. 知识产权</h2>
          <p class="mb-4">
            关于知识产权的说明：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>您保留上传内容的所有权</li>
            <li>我们保留服务技术和软件的知识产权</li>
            <li>识别结果归您所有</li>
            <li>不得复制或盗用我们的技术</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">5. 免责声明</h2>
          <p class="mb-4">
            使用本服务时请注意：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>OCR识别结果可能存在误差</li>
            <li>服务可能因维护而暂时中断</li>
            <li>我们不对识别结果的准确性承担责任</li>
            <li>用户应自行验证识别结果</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">6. 数据处理</h2>
          <p class="mb-4">
            关于您的数据：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>上传的图像仅用于OCR处理</li>
            <li>处理完成后图像将被删除</li>
            <li>识别结果可能被保存用于改进服务</li>
            <li>您可以随时删除您的数据</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">7. 服务变更</h2>
          <p class="mb-4">
            我们保留以下权利：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>修改或更新服务功能</li>
            <li>调整服务条款</li>
            <li>暂停或终止服务</li>
            <li>变更收费标准（如适用）</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">8. 争议解决</h2>
          <p class="mb-4">
            如发生争议：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>优先通过友好协商解决</li>
            <li>适用中华人民共和国法律</li>
            <li>由服务提供方所在地法院管辖</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold mb-4">9. 联系我们</h2>
          <p class="mb-4">
            如果您对本服务条款有任何疑问，请联系我们：
          </p>
          <ul class="list-disc pl-6 mb-4">
            <li>邮箱：support@textistext.com</li>
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
  name: 'TermsPage',
  head() {
    return {
      title: '服务条款 - TextIsText OCR',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'TextIsText OCR应用的服务条款，了解使用我们服务的规则和条件。'
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
