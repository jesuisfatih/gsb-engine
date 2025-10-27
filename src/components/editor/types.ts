export type ItemType = 'IMAGE' | 'TEXT' | 'RECT' | 'CIRCLE' | 'LINE'

export interface LayerItemBase {
  id: string
  type: ItemType
  name: string
  visible: boolean
  locked: boolean
  x: number
  y: number
  rotation?: number
  opacity?: number
  draggable?: boolean
  selected?: boolean
  // çizgiler/gölgeler
  stroke?: string
  strokeWidth?: number
  dash?: number[]
  shadowColor?: string
  shadowBlur?: number
}

export interface ImageItem extends LayerItemBase {
  type: 'IMAGE'
  src: string
  width: number
  height: number
}

export interface TextItem extends LayerItemBase {
  type: 'TEXT'
  text: string
  width?: number
  height?: number
  fontSize?: number
  fontFamily?: string
  align?: 'left' | 'center' | 'right'
  fill?: string
}

export interface RectItem extends LayerItemBase {
  type: 'RECT'
  width: number
  height: number
  fill?: string
  cornerRadius?: number
}

export interface CircleItem extends LayerItemBase {
  type: 'CIRCLE'
  radius: number
  fill?: string
}

export interface LineItem extends LayerItemBase {
  type: 'LINE'
  points: number[] // [x1,y1,x2,y2,...]
}

export type LayerItem = ImageItem | TextItem | RectItem | CircleItem | LineItem

export type Tool = 'SELECT' | 'RECT' | 'CIRCLE' | 'LINE' | 'TEXT'
