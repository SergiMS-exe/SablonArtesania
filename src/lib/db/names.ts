export const DB_TABLES = {
  users: 'user',
  artisans: 'artisan',
  categories: 'category',
  products: 'product',
  productImages: 'product_image',
  inquiries: 'inquiry',
  markets: 'market',
  pageViews: 'page_view',
} as const;

export const DB_INDEXES = {
  marketsDateLocationUnique: 'market_date_location_unique',
  pageViewsDayPathUnique: 'page_view_day_path_unique',
} as const;

export const DB_COLUMNS = {
  users: {
    id: 'id', email: 'email', passwordHash: 'password_hash', role: 'role', createdAt: 'created_at', deletedAt: 'deleted_at',
  },
  artisans: {
    id: 'id', slug: 'slug', name: 'name', specialty: 'specialty', location: 'location',
    shortBio: 'short_bio', longBio: 'long_bio', imageUrl: 'image_url', instagram: 'instagram',
    active: 'active', sortOrder: 'sort_order', createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
  },
  categories: {
    id: 'id', slug: 'slug', name: 'name', active: 'active', sortOrder: 'sort_order', createdAt: 'created_at', deletedAt: 'deleted_at',
  },
  products: {
    id: 'id', slug: 'slug', artisanId: 'artisan_id', categoryId: 'category_id', name: 'name',
    shortDescription: 'short_description', longDescription: 'long_description',
    priceCents: 'price_cents', currency: 'currency', status: 'status', sortOrder: 'sort_order',
    active: 'active', createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
  },
  productImages: {
    id: 'id', productId: 'product_id', url: 'url', sortOrder: 'sort_order', altText: 'alt_text', deletedAt: 'deleted_at',
  },
  inquiries: {
    id: 'id', name: 'name', email: 'email', phone: 'phone', message: 'message',
    type: 'type', status: 'status', createdAt: 'created_at', deletedAt: 'deleted_at',
  },
  markets: {
    id: 'id', location: 'location', startDate: 'start_date', endDate: 'end_date',
    schedule: 'schedule', instagramUrl: 'instagram_url', active: 'active',
    sortOrder: 'sort_order', createdAt: 'created_at', updatedAt: 'updated_at',
  },
  pageViews: {
    id: 'id', day: 'day', path: 'path', views: 'views', deletedAt: 'deleted_at',
  },
} as const;
