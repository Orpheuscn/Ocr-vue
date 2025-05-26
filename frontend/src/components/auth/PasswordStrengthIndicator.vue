<template>
  <div class="password-strength-indicator">
    <!-- 密码强度条 -->
    <div class="flex items-center gap-2 mt-2">
      <span class="text-sm text-base-content/70">密码强度:</span>
      <div class="flex-1 bg-base-300 rounded-full h-2">
        <div 
          class="h-2 rounded-full transition-all duration-300"
          :class="strengthBarClass"
          :style="{ width: `${strengthPercentage}%` }"
        ></div>
      </div>
      <span class="text-sm font-medium" :class="strengthTextClass">
        {{ strengthText }}
      </span>
    </div>

    <!-- 密码要求列表 -->
    <div v-if="showRequirements" class="mt-3">
      <div class="text-sm text-base-content/70 mb-2">密码要求:</div>
      <div class="space-y-1">
        <div 
          v-for="requirement in requirements" 
          :key="requirement.key"
          class="flex items-center gap-2 text-sm"
        >
          <div 
            class="w-4 h-4 rounded-full flex items-center justify-center"
            :class="requirement.met ? 'bg-success text-success-content' : 'bg-base-300'"
          >
            <svg v-if="requirement.met" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <span :class="requirement.met ? 'text-success' : 'text-base-content/50'">
            {{ requirement.text }}
          </span>
        </div>
      </div>
    </div>

    <!-- 密码提示 -->
    <div v-if="tips.length > 0" class="mt-3">
      <div class="text-sm text-base-content/70 mb-1">建议:</div>
      <ul class="text-sm text-base-content/60 space-y-1">
        <li v-for="tip in tips" :key="tip" class="flex items-start gap-1">
          <span class="text-warning mt-0.5">•</span>
          <span>{{ tip }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PasswordStrengthIndicator',
  props: {
    password: {
      type: String,
      default: ''
    },
    showRequirements: {
      type: Boolean,
      default: true
    },
    isProduction: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      strengthData: {
        score: 0,
        strength: 'very_weak',
        isValid: false,
        errors: [],
        tips: []
      }
    }
  },
  computed: {
    strengthPercentage() {
      return this.strengthData.score || 0
    },
    strengthText() {
      const strengthMap = {
        'very_weak': '很弱',
        'weak': '弱',
        'medium': '中等',
        'strong': '强',
        'very_strong': '很强'
      }
      return strengthMap[this.strengthData.strength] || '未知'
    },
    strengthBarClass() {
      const classMap = {
        'very_weak': 'bg-error',
        'weak': 'bg-warning',
        'medium': 'bg-info',
        'strong': 'bg-success',
        'very_strong': 'bg-success'
      }
      return classMap[this.strengthData.strength] || 'bg-base-300'
    },
    strengthTextClass() {
      const classMap = {
        'very_weak': 'text-error',
        'weak': 'text-warning',
        'medium': 'text-info',
        'strong': 'text-success',
        'very_strong': 'text-success'
      }
      return classMap[this.strengthData.strength] || 'text-base-content/50'
    },
    requirements() {
      if (!this.password) return []
      
      const baseRequirements = [
        {
          key: 'length',
          text: '至少6个字符',
          met: this.password.length >= 6
        }
      ]

      if (this.isProduction) {
        return [
          {
            key: 'length8',
            text: '至少8个字符',
            met: this.password.length >= 8
          },
          {
            key: 'lowercase',
            text: '包含小写字母',
            met: /[a-z]/.test(this.password)
          },
          {
            key: 'uppercase',
            text: '包含大写字母',
            met: /[A-Z]/.test(this.password)
          },
          {
            key: 'number',
            text: '包含数字',
            met: /\d/.test(this.password)
          },
          {
            key: 'special',
            text: '包含特殊字符',
            met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password)
          }
        ]
      }

      return baseRequirements
    },
    tips() {
      return this.strengthData.tips || []
    }
  },
  watch: {
    password: {
      handler: 'validatePassword',
      immediate: true
    }
  },
  methods: {
    async validatePassword() {
      if (!this.password) {
        this.strengthData = {
          score: 0,
          strength: 'very_weak',
          isValid: false,
          errors: [],
          tips: []
        }
        this.$emit('validation-change', this.strengthData)
        return
      }

      try {
        const response = await fetch('/api/auth/validate-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: this.password })
        })

        const data = await response.json()

        if (data.success) {
          this.strengthData = {
            score: data.data.score,
            strength: data.data.strength,
            isValid: data.data.isValid,
            errors: data.data.errors || [],
            tips: data.data.tips || []
          }
        } else {
          // 如果API调用失败，使用本地验证
          this.strengthData = this.calculateLocalStrength()
        }
      } catch (error) {
        console.warn('密码验证API调用失败，使用本地验证:', error)
        this.strengthData = this.calculateLocalStrength()
      }

      this.$emit('validation-change', this.strengthData)
    },
    calculateLocalStrength() {
      let score = 0
      let errors = []
      
      // 基本长度检查
      if (this.password.length < 6) {
        errors.push('密码至少需要6个字符')
      } else {
        score += 25
      }

      // 生产环境的额外要求
      if (this.isProduction) {
        if (this.password.length < 8) {
          errors.push('生产环境密码至少需要8个字符')
        }
        if (!/[a-z]/.test(this.password)) {
          errors.push('密码必须包含至少一个小写字母')
        } else {
          score += 15
        }
        if (!/[A-Z]/.test(this.password)) {
          errors.push('密码必须包含至少一个大写字母')
        } else {
          score += 15
        }
        if (!/\d/.test(this.password)) {
          errors.push('密码必须包含至少一个数字')
        } else {
          score += 15
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password)) {
          errors.push('密码必须包含至少一个特殊字符')
        } else {
          score += 20
        }
      } else {
        // 开发环境的宽松检查
        if (/[a-z]/.test(this.password)) score += 15
        if (/[A-Z]/.test(this.password)) score += 15
        if (/\d/.test(this.password)) score += 15
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password)) score += 20
      }

      // 长度奖励
      if (this.password.length >= 12) score += 10

      score = Math.min(score, 100)

      let strength = 'very_weak'
      if (score >= 80) strength = 'very_strong'
      else if (score >= 60) strength = 'strong'
      else if (score >= 40) strength = 'medium'
      else if (score >= 20) strength = 'weak'

      return {
        score,
        strength,
        isValid: errors.length === 0,
        errors,
        tips: errors.length > 0 ? ['请满足所有密码要求'] : []
      }
    }
  }
}
</script>

<style scoped>
.password-strength-indicator {
  @apply w-full;
}
</style>
