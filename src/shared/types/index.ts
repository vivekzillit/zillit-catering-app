// Shared domain types — thin wrappers around the backend wire format after
// toCamelCase conversion. Mirrors the iOS SendMessageObject / HomeRecord /
// MenuItemResponse shapes.

export type ModuleId = 'catering' | 'craftservice';
export const MODULE_IDS: readonly ModuleId[] = ['catering', 'craftservice'] as const;

// ---------- Auth ----------

export type UserRole = 'admin' | 'caterer' | 'member';

export interface User {
  _id: string;
  name: string;
  email?: string;
  role: UserRole;
  adminAccess?: boolean;
  department?: string;
  deviceId?: string;
  projectId?: string;
  avatar?: string;
  phone?: string;       // Zillit internal phone
  gsmPhone?: string;    // personal GSM number
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ---------- Units ----------

export interface Unit {
  _id: string;
  module: ModuleId;
  unitName: string;
  identifier?: string;
  enabled?: boolean;
  privateUnit?: boolean;
  isUnitHead?: boolean;
  systemDefined?: boolean;
  projectId?: string;
  startTime?: string;          // "08:00"
  endTime?: string;            // "09:00"
  servingLocation?: string;    // "Car/Catering Base"
  teamMembers?: { userId: string; enabled: boolean }[];
}

// ---------- Menu ----------

export const DIETARY_TAGS = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'kosher',
  'keto',
  'paleo',
] as const;

export type DietaryTag = (typeof DIETARY_TAGS)[number];

export const DIETARY_TAG_LABELS: Record<DietaryTag, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  'gluten-free': 'Gluten-Free',
  'dairy-free': 'Dairy-Free',
  'nut-free': 'Nut-Free',
  halal: 'Halal',
  kosher: 'Kosher',
  keto: 'Keto',
  paleo: 'Paleo',
};

export const COMMON_ALLERGENS = [
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soybeans',
  'Sesame',
] as const;

export interface CustomNutritionField {
  id: string;
  name: string;
  value: string;
  unit: string;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitamins?: string[];
  customFields?: CustomNutritionField[];
}

export interface MenuImage {
  key?: string;
  thumbnail?: string;
  url?: string;
  bucket?: string;
  region?: string;
  contentType?: string;
  fileSize?: string;
}

export interface MenuItem {
  _id: string;
  module?: ModuleId;
  unitId: string;
  projectId?: string;
  name: string;
  description?: string;
  category?: string;
  available: boolean;
  servingSize?: string;
  nutrition?: NutritionInfo | null;
  dietaryTags?: DietaryTag[];
  allergenWarnings?: string[];
  images?: MenuImage[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMenuItemRequest {
  unitId: string;
  name: string;
  description?: string;
  category?: string;
  available: boolean;
  servingSize?: string;
  nutrition?: NutritionInfo | null;
  dietaryTags?: DietaryTag[];
  allergenWarnings?: string[];
  images?: MenuImage[];
}

export type UpdateMenuItemRequest = Partial<CreateMenuItemRequest>;

// ---------- Poll structured messages ----------

export interface MenuPollItem {
  menuItemId: string;
  name: string;
  description?: string;
  category?: string;
  thumbnailKey?: string;
  unitId?: string;
}

export interface MenuPollPayload {
  pollId: string;
  unitId: string;
  mealType: string;
  title: string;
  items: MenuPollItem[];
  createdBy: string;
  createdAt: number;
}

export interface PollVotePayload {
  pollId: string;
  pollMessageUniqueId: string;
  unitId: string;
  voterUserId: string;
  voterName: string;
  selections: Record<string, number>;
  notes?: string;
  votedAt: number;
}

// ---------- Chat ----------

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';

export interface Attachment {
  key?: string;
  url?: string;           // for image/video/audio/document playback
  thumbnail?: string;
  media?: string;         // iOS alias for url
  name?: string;
  caption?: string;
  contentType?: string;
  contentSubtype?: string;
  fileSize?: string;
  width?: number;
  height?: number;
  duration?: number;
  bucket?: string;
  region?: string;
  uniqueId?: string;
  assetType?: 'image' | 'video' | 'audio' | 'file' | 'document' | 'location';
}

export interface MessageComment {
  _id?: string;
  id: string;
  sender?: string;
  userId: string;
  userName: string;
  comment: string;
  messageTranslation?: string;
  isTranslated?: boolean;
  created?: number;
  updated?: number;
  deleted?: number;
  attachment?: Attachment | null;
  messageType?: MessageType;
}

export interface ChatMessage {
  _id: string;
  module?: ModuleId;
  unitId: string;
  uniqueId?: string;
  projectId?: string;
  message: string;           // plaintext AFTER decryption
  messageTranslation?: string;
  messageType?: MessageType | string;
  sender?: string;
  receiver?: string | null;
  pinned?: number;
  messageGroup?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  attachment?: Attachment | null;
  comments?: MessageComment[];
  isDeleted?: boolean;
}

export interface SendMessageRequest {
  unitId: string;
  message: string;           // plaintext — API layer encrypts
  uniqueId: string;
  messageGroup: number;
  messageType: MessageType;
  receiver?: string | null;
  pinned?: number;
  dateTime?: number;
  attachment?: Attachment;
}

export interface PostCommentRequest {
  unitId: string;
  message: string;
  messageType: MessageType;
  attachment?: Attachment;
}

// ---------- Orders ----------

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderPriority = 'normal' | 'vip';

export interface OrderItem {
  menuItemId: string;
  name: string;
  category?: string;
}

export interface Order {
  _id: string;
  module?: ModuleId;
  unitId: string;
  projectId?: string;
  userId: string;
  userName: string;
  userDepartment?: string;
  userRole?: string;
  items: OrderItem[];
  notes?: string;
  status: OrderStatus;
  priority: OrderPriority;
  notifiedReadyAt?: number;
  servedAt?: number;
  created?: number;
  updated?: number;
}

export interface PlaceOrderRequest {
  unitId: string;
  items: OrderItem[];
  notes?: string;
}

export interface OrderSummary {
  perItem: { name: string; category: string; count: number; users: string[] }[];
  perPerson: {
    _id: string;
    userId: string;
    userName: string;
    userDepartment: string;
    userRole: string;
    priority: OrderPriority;
    items: OrderItem[];
    notes: string;
    status: OrderStatus;
    created: number;
    servedAt: number;
  }[];
  totalOrders: number;
}

export interface OrderStats {
  totalReceived: number;
  totalServed: number;
  remaining: number;
  lastServedAt: number;
  lastServedUserName: string;
}

// ---------- Upload ----------

export interface UploadResponse {
  key: string;
  url: string;
  thumbnail?: string;
  contentType?: string;
  fileSize?: string;
}
