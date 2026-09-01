export interface Framework {
  name: string;
  icon: string;
}

export interface Card {
  id: number;
  key: string;
  name: string;
  icon: string;
  revealed: boolean;
  matched: boolean;
}
