import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  // 全局忽略配置 - 从.eslintignore合并
  globalIgnores([
    // 忽略构建输出目录
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/node_modules/**',

    // 忽略各种JS文件
    '**/*.min.js',
    '**/*.chunk.js',
    '**/public/**',
    '**/vendors/**',

    // 忽略配置文件
    '**/tailwind.config.js',
    '**/postcss.config.js',
    '**/prettier.config.js',
    '**/vite.config.js',

    // 忽略大型文件
    '**/vendor/**',
    '**/*.pdf.worker.js',
    '**/pdf.js',
    '**/public/js/**',
    '**/index-*.js',

    // 忽略测试文件
    '**/test-*.js',
    '**/*.test.js',
    '**/*.spec.js',

    // 项目中的大文件
    '**/src/stores/ocrStore.js',
    '**/src/services/apiClient.js',
    '**/src/stores/i18nStore.js',
    '**/src/services/authService.js',
    '**/src/utils/pdfAdapter.js',
  ]),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // 加入Node.js全局变量
        process: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        define: 'readonly',
      },
    },
    rules: {
      // 把错误降级为警告或完全关闭
      'no-unused-vars': 'warn',
      'no-empty': 'warn',
      'no-undef': 'warn',
      'no-case-declarations': 'off',
      'no-prototype-builtins': 'off',
      'getter-return': 'warn',
      'no-control-regex': 'off',
      'no-fallthrough': 'off',
      'no-cond-assign': 'warn',
      'no-self-assign': 'warn',
      'no-sparse-arrays': 'warn',
      'no-dupe-keys': 'warn',
    },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  skipFormatting,

  // 针对vue文件的特殊配置
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'warn',
    },
  },
])
