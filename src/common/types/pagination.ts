export type PaginationRequest<FilterModel, OrderByModel = unknown> = {
  filters?: FilterModel;
  page: number;
  limit: number;
  orderBy?: OrderByModel;
};

export type PaginationResponse<DataModel, CountModel = { total: number }> = {
  data: DataModel[];
  page: number;
  count: CountModel;
  limit: number;
};
