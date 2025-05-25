// UI组件统一导出文件

import FloatingButton from './FloatingButton.vue'
import FloatingButtonIcons from './FloatingButtonIcons.vue'

export {
  FloatingButton,
  FloatingButtonIcons
}

// 默认导出
export default {
  FloatingButton,
  FloatingButtonIcons
}

// 组件安装函数（用于全局注册）
export const install = (app) => {
  app.component('FloatingButton', FloatingButton)
  app.component('FloatingButtonIcons', FloatingButtonIcons)
}
