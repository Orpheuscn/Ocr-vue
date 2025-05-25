// 浮动按钮组件类型定义

export type ButtonType = 
  | 'warning' 
  | 'info' 
  | 'secondary' 
  | 'primary' 
  | 'accent' 
  | 'success' 
  | 'error'

export type ButtonPosition = 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'top-left' 
  | 'top-right'
  | 'left-bottom' 
  | 'left-center' 
  | 'left-top'
  | 'right-bottom' 
  | 'right-center' 
  | 'right-top'

export type HoverEffect = 
  | 'lift' 
  | 'scale' 
  | 'glow' 
  | 'none'

export type IconType = 
  | 'masking' 
  | 'filter' 
  | 'coordinate' 
  | 'settings' 
  | 'close' 
  | 'fullscreen' 
  | 'exit-fullscreen' 
  | 'zoom-in' 
  | 'zoom-out'
  | 'plus' 
  | 'minus' 
  | 'check' 
  | 'cross'

export type IconSize = 
  | 'h-4 w-4' 
  | 'h-5 w-5' 
  | 'h-6 w-6' 
  | 'h-7 w-7' 
  | 'h-8 w-8'

export interface PositionOffset {
  x: number
  y: number
}

export interface FloatingButtonProps {
  type?: ButtonType
  position?: ButtonPosition
  offset?: PositionOffset
  stackOffset?: number
  visible?: boolean
  tooltip?: string
  disabled?: boolean
  customClass?: string
  hoverEffect?: HoverEffect
}

export interface FloatingButtonIconsProps {
  type: IconType
  size?: IconSize
}

export interface FloatingButtonEmits {
  click: []
}

// 组件实例类型
export interface FloatingButtonInstance {
  $props: FloatingButtonProps
  $emit: (event: 'click') => void
}

export interface FloatingButtonIconsInstance {
  $props: FloatingButtonIconsProps
}

// 工具函数类型
export interface ButtonStyleConfig {
  baseClasses: string[]
  hoverClasses: string[]
  positionClasses: string[]
}

export interface IconConfig {
  viewBox: string
  path: string
  strokeWidth?: number
  fill?: string
}

// 主题相关类型
export interface ThemeColors {
  warning: string
  info: string
  secondary: string
  primary: string
  accent: string
  success: string
  error: string
}

export interface HoverColors {
  warning: string
  info: string
  secondary: string
  primary: string
  accent: string
  success: string
  error: string
}

// 响应式配置类型
export interface ResponsiveConfig {
  mobile: {
    minWidth: string
    minHeight: string
  }
  tablet: {
    minWidth: string
    minHeight: string
  }
  desktop: {
    minWidth: string
    minHeight: string
  }
}

// 动画配置类型
export interface AnimationConfig {
  duration: string
  easing: string
  liftDistance: string
  scaleFactory: number
  glowRadius: string
}

// 可访问性配置类型
export interface AccessibilityConfig {
  focusOutlineWidth: string
  focusOutlineOffset: string
  minTouchTarget: string
  highContrastBorder: string
}

// 组件配置类型
export interface FloatingButtonConfig {
  theme: ThemeColors
  hoverColors: HoverColors
  responsive: ResponsiveConfig
  animation: AnimationConfig
  accessibility: AccessibilityConfig
}

// 事件处理器类型
export type ClickHandler = () => void
export type HoverHandler = (event: MouseEvent) => void
export type FocusHandler = (event: FocusEvent) => void

// 组件状态类型
export interface ButtonState {
  isHovered: boolean
  isFocused: boolean
  isPressed: boolean
  isDisabled: boolean
  isLoading: boolean
}

// 位置计算相关类型
export interface PositionCalculation {
  top?: string
  bottom?: string
  left?: string
  right?: string
  transform?: string
}

export interface StackCalculation {
  offset: number
  zIndex: number
}

// 工具函数返回类型
export type PositionClassCalculator = (
  position: ButtonPosition, 
  offset: PositionOffset, 
  stackOffset: number
) => string[]

export type ButtonClassCalculator = (
  type: ButtonType, 
  hoverEffect: HoverEffect, 
  customClass: string
) => string

// 插件安装类型
export interface FloatingButtonPlugin {
  install: (app: any) => void
}

// 导出所有类型的联合类型
export type AllFloatingButtonTypes = 
  | ButtonType 
  | ButtonPosition 
  | HoverEffect 
  | IconType 
  | IconSize
