export const qk = {
  courses: ['courses'] as const,
  categories: ['categories'] as const,
  course: (slug: string) => ['course', slug] as const,
  adminCourses: ['admin', 'courses'] as const,
  adminMedia: ['admin', 'media'] as const,
  adminTests: ['admin', 'tests'] as const,
  adminAnnouncements: ['admin', 'announcements'] as const,
  adminOrders: ['admin', 'orders'] as const,
  adminDirectory: ['admin', 'directory'] as const,
  purchases: ['purchases'] as const,
  progress: (courseId: string) => ['progress', courseId] as const,
  certificates: ['certificates'] as const,
}
