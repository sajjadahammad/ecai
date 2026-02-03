export type ImpactType = "added" | "removed" | "modified";

export interface ImpactItem {
  type: ImpactType;
  file: string;
  testName: string;
}

export type FileChangeStatus = "A" | "M" | "D";

export interface ChangedFile {
  path: string;
  status: FileChangeStatus;
}
