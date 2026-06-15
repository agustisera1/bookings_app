export type ServiceResponse<T = unknown> = {
  status: number;
  data: T | null;
  error: string | null;
};
