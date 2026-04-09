export type A2UIComponent = Record<string, unknown> & { id: string };

export interface DataState {
  name: string;
  data: Record<string, unknown>;
}


export interface Widget {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  root: string;
  components: A2UIComponent[];
  dataStates: DataState[];
}
