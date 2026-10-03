// Every React Query key in the app, in one place.
//
// Rules that make invalidation predictable:
// - The first element is the resource (`weighings`, `inventory`...). `invalidateQueries` matches by
//   prefix, so invalidating a root reloads every list, stat and count under it.
// - Catalogs (materials, warehouses, document types) have their OWN root, apart from the data that
//   references them: validating a weighing must not refetch the list of materials.
// - Keys carry every input the request depends on (filters, page), so different inputs never share
//   a cache entry.

export interface WeighingsListKey {
  status: string
  materialCode: string
  /** '' means every kind. */
  affiliation: string
  /** Text typed in the search box, trimmed (name or document of who delivered); empty = no search. */
  search: string
  /** Period typed as calendar days ("YYYY-MM-DD"); '' = unbounded on that side. */
  dateFrom: string
  dateTo: string
  sort: string
  order: string
  page: number
  rowsPerPage: number
}

export interface InventoryListKey {
  status: string
  materialCode: string
  warehouseId: string
  page: number
  rowsPerPage: number
}

export interface RecyclersListKey {
  status: string
  /** Text typed in the search box, trimmed; empty means no search. */
  search: string
  page: number
  rowsPerPage: number
}

export interface StaffListKey {
  /** The organization's own kind of staff. */
  userType: 'eca' | 'association'
  search: string
  page: number
  rowsPerPage: number
}

export interface LinksListKey {
  /** '' means every state. */
  status: string
  page: number
  rowsPerPage: number
}

export interface DirectoryKey {
  search: string
  page: number
  rowsPerPage: number
}

export interface PageKey {
  page: number
  rowsPerPage: number
}

/** One page of a tab (purchases or sales), with the period and order the server applies. */
export interface TransactionsListKey extends PageKey {
  dateFrom: string
  dateTo: string
  sort: string
  order: string
}

export type TransactionKind = 'purchase' | 'sale'

export const queryKeys = {
  /** The signed-in user's profile. */
  me: ['me'] as const,

  catalogs: {
    all: ['catalogs'] as const,
    materials: ['catalogs', 'materials'] as const,
    warehouses: ['catalogs', 'warehouses'] as const,
    documentTypes: ['catalogs', 'document-types'] as const,
    roles: ['catalogs', 'roles'] as const,
    associations: ['catalogs', 'associations'] as const,
  },

  weighings: {
    all: ['weighings'] as const,
    list: (filters: WeighingsListKey) => ['weighings', 'list', filters] as const,
    stats: ['weighings', 'stats'] as const,
    recent: ['weighings', 'recent'] as const,
  },

  inventory: {
    all: ['inventory'] as const,
    list: (filters: InventoryListKey) => ['inventory', 'list', filters] as const,
    stats: ['inventory', 'stats'] as const,
    /** The reference price of one material in one warehouse (used by the weighing form). */
    priceSuggestion: (materialCode: string, warehouseId: string) =>
      ['inventory', 'price-suggestion', materialCode, warehouseId] as const,
  },

  transactions: {
    all: ['transactions'] as const,
    list: (kind: TransactionKind, filters: TransactionsListKey) => ['transactions', 'list', kind, filters] as const,
    pendingCount: (kind: TransactionKind) => ['transactions', 'count', kind, 'pending'] as const,
    stats: ['transactions', 'stats'] as const,
  },

  /** ECA <-> Association links and the directory of associations (which carries the link state). */
  links: {
    all: ['links'] as const,
    list: (filters: LinksListKey) => ['links', 'list', filters] as const,
    directory: (filters: DirectoryKey) => ['links', 'directory', filters] as const,
  },

  staff: {
    all: ['staff'] as const,
    list: (filters: StaffListKey) => ['staff', 'list', filters] as const,
  },

  recyclers: {
    all: ['recyclers'] as const,
    list: (filters: RecyclersListKey) => ['recyclers', 'list', filters] as const,
    count: (status: 'verified' | 'pending') => ['recyclers', 'count', status] as const,
  },
}
