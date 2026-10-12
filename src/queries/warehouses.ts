import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { warehousesService } from '../services/warehouses'
import { queryKeys, type WarehousesListKey } from './keys'

export const warehousesQueries = {
  /** One page, filtered by owner on the server; the previous page stays on screen while the next one loads. */
  list: (filters: WarehousesListKey) =>
    queryOptions({
      queryKey: queryKeys.warehouses.list(filters),
      queryFn: ({ signal }) =>
        warehousesService.list(
          {
            unassigned: filters.owner === 'unassigned' ? true : filters.owner === 'assigned' ? false : undefined,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          },
          { signal },
        ),
      placeholderData: keepPreviousData,
    }),
}
