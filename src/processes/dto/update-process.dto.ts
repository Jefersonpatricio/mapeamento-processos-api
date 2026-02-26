export class UpdateProcessDto {
  name?: string;
  description?: string;
  type?: string;
  criticality?: string;
  departmentId?: string;
  parentId?: string;
  tools?: string[];
  responsibles?: string[];
  documentLink?: string | null;
  positionX?: number;
  positionY?: number;
}
