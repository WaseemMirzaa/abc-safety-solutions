export type CourseSlideType = 'image' | 'pdf' | 'video' | 'pptx' | 'ppt'

export type CourseSlide = {
  id: string
  type: CourseSlideType
  url: string
  title?: string
  /** Internal slide count for a single .pptx deck. */
  deckSlideCount?: number
}
