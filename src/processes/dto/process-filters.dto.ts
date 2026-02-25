export class ProcessFiltersDto {
  departmentId?: string;
  type?: string;
  documented?: string;
  status?: "active" | "inactive";
  search?: string;
}
