export type CourseSlideType = 'image' | 'pdf' | 'video'

export type CourseSlide = {
  id: string
  type: CourseSlideType
  url: string
  title?: string
}
